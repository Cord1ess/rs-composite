'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { places } from '@/content/globe'
import { heroProgress } from '@/lib/scroll-progress'
import { heroEntranceGate, markHeroReady, reportHeroLoad } from '@/lib/hero-loader'
import { registerTuner, type TuneValues } from '@/lib/tune-bus'
import type { MarkerFrame } from './earth-scene'
import type { FromWorker, ToWorker } from './protocol'

/*
  Only reached through a dynamic import behind the capability gate, so three.js
  and the textures are absent from the initial bundle.

  Marker positions, their leader lines and their labels are written straight to
  the DOM inside the render loop. None of it passes through React state, which
  would mean a reconcile every frame. Only which marker is active is state, and
  that changes on hover.
*/

const originFacts = [
  ['Operation area', '197,263 sq ft'],
  ['People', '2,250, half of them women'],
  ['Sewing lines', '25'],
  ['Output', '1.2 million pieces a month'],
]

/*
  How far each label sits off its marker.

  The four export markets are within a few pixels of each other on the globe,
  so a single fixed offset stacks all four labels in the same place. Each one
  gets its own rung on a ladder instead, and the leader line does the work of
  saying which marker it belongs to.
*/
const LEAD = { x: 54, y: 26 }
const RUNG = 46

export default function Earth3D({ motion, onFail }: { motion: boolean; onFail?: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dots = useRef(new Map<string, HTMLDivElement>())
  const labels = useRef(new Map<string, HTMLDivElement>())
  const lines = useRef(new Map<string, SVGPolylineElement>())
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    let cancelled = false

    /* One control surface over both render paths: the worker, or the scene
       directly where OffscreenCanvas does not exist. */
    type Handle = {
      setSize(width: number, height: number): void
      run(running: boolean): void
      pointer(phase: 'down' | 'move' | 'up', x: number): void
      tune(values: TuneValues): void
      dispose(): void
    }
    let handle: Handle | null = null

    /*
      Cached, and only ever written from the ResizeObserver. Reading
      clientWidth in the frame callback forced a synchronous layout every
      frame, because the previous frame's SVG attribute writes had already
      dirtied layout by the time the read arrived. Classic thrash, one line.
    */
    let wrapWidth = wrap.clientWidth
    /* Last written value per element, so identical frames cost zero style
       invalidations. Keyed by the same ids as the element maps. */
    const written = new Map<string, string>()

    const applyMarkers = (frames: MarkerFrame[]) => {
      /*
        The leader lines and labels are invisible until the globe has pulled
        back (their opacity rides --hp), so until just before they fade in
        there is no reason to write their geometry at all. The dots stay live:
        they are visible from the first frame.
      */
      const leadersOn = heroProgress.value > 0.7

      /* Rungs are handed out by screen height among the markers that are
         actually on screen, so the ladder never leaves gaps. */
      const rung = new Map<string, number>()
      if (leadersOn) {
        frames
          .filter((f) => f.id !== 'origin' && f.visible)
          .sort((a, b) => a.y - b.y)
          .forEach((f, i) => rung.set(f.id, i))
      }

      for (const frame of frames) {
        const dot = dots.current.get(frame.id)
        if (dot) {
          const fade = frame.fade.toFixed(2)
          const t = `translate3d(${frame.x.toFixed(1)}px, ${frame.y.toFixed(1)}px, 0)|${fade}`
          if (written.get(frame.id) !== t) {
            written.set(frame.id, t)
            dot.style.transform = `translate3d(${frame.x.toFixed(1)}px, ${frame.y.toFixed(1)}px, 0)`
            /* The scene supplies a limb fade, so markers dissolve at the edge
               of the disc instead of popping at a threshold. */
            dot.style.opacity = fade
            dot.style.pointerEvents = frame.fade > 0.4 ? 'auto' : 'none'
          }
        }
        if (frame.id === 'origin' || !leadersOn) continue

        /* Labels lean away from the middle so they never cross the globe. */
        const side = frame.x > wrapWidth * 0.55 ? 1 : -1
        const index = rung.get(frame.id) ?? 0
        const lx = frame.x + LEAD.x * side
        const ly = frame.y - LEAD.y - index * RUNG

        const key = `${frame.id}:lead`
        const state = `${lx.toFixed(1)},${ly.toFixed(1)},${side},${frame.fade.toFixed(2)}`
        if (written.get(key) === state) continue
        written.set(key, state)

        const label = labels.current.get(frame.id)
        if (label) {
          label.style.transform = `translate3d(${lx}px, ${ly}px, 0) translateX(${
            side > 0 ? '0' : '-100%'
          })`
          label.style.opacity = frame.fade.toFixed(2)
        }

        const line = lines.current.get(frame.id)
        if (line) {
          /* Marker, up to the rung, then a flat run into the label. */
          line.setAttribute(
            'points',
            `${frame.x},${frame.y} ${frame.x + 20 * side},${ly} ${lx - 6 * side},${ly}`,
          )
          line.style.opacity = frame.fade.toFixed(2)
        }
      }
    }

    /*
      The loader contract. markHeroReady resolves the global heroReady promise
      the moment a complete first frame exists; the entrance animation then
      waits at the gate, which a loading screen holds while it is on screen.
      With no loading screen mounted the gate is just the ready promise.
    */
    /*
      The render loop stays parked until the loading screen reveals the canvas.
      The scene produces its one ready frame without it, and starting at the
      reveal means the GPU is silent while the page hydrates and the arc draw
      in plays where the visitor can see it.
    */
    let revealed = false
    const onSceneReady = () => {
      markHeroReady()
      void heroEntranceGate().then(() => {
        if (cancelled) return
        revealed = true
        handle?.run(true)
        setReady(true)
      })
    }

    /*
      Terminal failure from either render path: release the loader so the
      page reveals on time, then hand the hero to the owner's static
      fallback. Everything here tears down through the normal unmount.
    */
    const onSceneError = (reason: string) => {
      if (cancelled) return
      console.error(`[Earth3D] globe failed (${reason}); switching to the static fallback.`)
      markHeroReady()
      onFail?.()
    }

    const rect = wrap.getBoundingClientRect()

    /*
      Worker construction can throw in environments the feature test cannot
      see: a worker-src CSP, an embedder that stubs Worker, an extension in
      the way. Any throw falls through to the main-thread path, which needs
      nothing but the canvas; the fallthrough flag exists because the catch
      cannot reach the else branch of the feature test.
    */
    let mainThread = !('transferControlToOffscreen' in canvas)
    if (!mainThread) {
      /*
        Worker path. All WebGL work leaves the main thread, so scrolling can
        never contend with rendering.

        The worker and the transferred canvas are stored on the canvas element
        itself, because transferControlToOffscreen is once per element and
        React strict mode replays this effect on the same DOM node. On replay
        the pending teardown is cancelled and the live worker is rewired
        instead of rebuilt.
      */
      const holder = canvas as HTMLCanvasElement & {
        __earthWorker?: { worker: Worker; timer: number | null }
      }
      if (holder.__earthWorker?.timer) {
        window.clearTimeout(holder.__earthWorker.timer)
        holder.__earthWorker.timer = null
      }
      if (!holder.__earthWorker) {
        let spawned: Worker | null = null
        let transferred = false
        try {
          spawned = new Worker(new URL('./earth-worker', import.meta.url))
          const offscreen = canvas.transferControlToOffscreen()
          transferred = true
          spawned.postMessage(
            {
              type: 'init',
              canvas: offscreen,
              places,
              originId: 'origin',
              motion,
              dpr: window.devicePixelRatio,
              width: rect.width,
              height: rect.height,
              progress: heroProgress.value,
            },
            [offscreen],
          )
          holder.__earthWorker = { worker: spawned, timer: null }
        } catch (err) {
          console.error('[Earth3D] worker path failed, using the main thread.', err)
          spawned?.terminate()
          if (transferred) {
            /* The canvas is already neutered; nothing can render into it. */
            onSceneError('worker-init')
            return
          }
          mainThread = true
        }
      }
      const box = mainThread ? null : holder.__earthWorker
      if (box) {
      const worker = box.worker
      worker.onmessage = (event: MessageEvent) => {
        const msg = event.data as FromWorker
        if (msg.type === 'markers') applyMarkers(msg.frames)
        else if (msg.type === 'load') reportHeroLoad(msg.value)
        else if (msg.type === 'error') onSceneError(msg.reason)
        else onSceneReady()
      }
      const unsubscribe = heroProgress.subscribe((value) =>
        worker.postMessage({ type: 'progress', value }),
      )
      handle = {
        setSize: (width, height) => worker.postMessage({ type: 'size', width, height }),
        run: (running) => worker.postMessage({ type: 'run', running }),
        pointer: (phase, x) => worker.postMessage({ type: 'pointer', phase, x }),
        tune: (values) => worker.postMessage({ type: 'tune', values }),
        dispose: () => {
          unsubscribe()
          /* Delayed so a strict mode replay can cancel it and reuse the
             worker. In production this simply runs a second after unmount. */
          box.timer = window.setTimeout(() => {
            worker.postMessage({ type: 'dispose' })
            window.setTimeout(() => worker.terminate(), 250)
            delete holder.__earthWorker
          }, 1000)
        },
      }
      /* The dev tuning panel reaches the scene through the bus; any values
         it sent before this point replay now. */
      registerTuner(handle.tune)
      }
    }
    if (mainThread) {
      import('./earth-scene').then(({ EarthScene: Ctor }) => {
        if (cancelled) return
        const scene = new Ctor({
          canvas,
          places,
          originId: 'origin',
          motion,
          dpr: window.devicePixelRatio,
          getProgress: () => heroProgress.value,
          onMarkers: applyMarkers,
          onReady: onSceneReady,
          onLoad: reportHeroLoad,
          onError: onSceneError,
        })
        scene.setSize(wrap.clientWidth, wrap.clientHeight)
        if (revealed) scene.start()
        handle = {
          setSize: (width, height) => scene.setSize(width, height),
          run: (running) => (running ? scene.start() : scene.stop()),
          pointer: (phase, x) => {
            if (phase === 'down') scene.pointerDown(x)
            else if (phase === 'move') scene.pointerMove(x)
            else scene.pointerUp()
          },
          tune: (values) => scene.setTune(values),
          dispose: () => scene.dispose(),
        }
        registerTuner(handle.tune)
      })
    }

    /*
      Pointer input lives here now, on the real DOM canvas, and is forwarded
      to whichever side owns the scene. Capture stays on the element.
    */
    let down = false
    const onDown = (event: PointerEvent) => {
      down = true
      canvas.setPointerCapture(event.pointerId)
      handle?.pointer('down', event.clientX)
    }
    const onMove = (event: PointerEvent) => {
      if (down) handle?.pointer('move', event.clientX)
    }
    const onUp = (event: PointerEvent) => {
      if (!down) return
      down = false
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      handle?.pointer('up', event.clientX)
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      wrapWidth = width
      handle?.setSize(width, height)
    })
    ro.observe(wrap)

    /* A render loop behind ten screens of content is wasted battery. Inert
       until the reveal so it cannot start the loop behind the curtain. */
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!motion || !revealed) return
        handle?.run(entry.isIntersecting)
      },
      { threshold: 0.01 },
    )
    io.observe(wrap)

    /*
      Reduced motion has no continuous loop: the scene renders, settles and
      stops itself. The scroll scrub still has to reach the screen, so every
      progress change pokes the loop awake; it draws the frame for the new
      position and stops again on its own.
    */
    const unsubScrub = motion
      ? null
      : heroProgress.subscribe(() => {
          if (revealed) handle?.run(true)
        })

    return () => {
      cancelled = true
      registerTuner(null)
      unsubScrub?.()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      ro.disconnect()
      io.disconnect()
      handle?.dispose()
      handle = null
    }
  }, [motion])

  const destinations = places.filter((p) => p.id !== 'origin')

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative h-full w-full',
        motion && 'transition-[opacity,transform] duration-[1100ms] ease-out',
        ready || !motion ? 'translate-y-0 opacity-100' : 'translate-y-[6%] opacity-0',
      )}
    >
      {/*
        touch-pan-y, not touch-none. With touch-none a phone visitor whose
        thumb landed on the globe, which is most of the hero, could not scroll
        the page at all. Vertical swipes now scroll, horizontal drags rotate.
      */}
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab touch-pan-y active:cursor-grabbing"
      />

      {/* Leader lines. Only visible once the globe has settled, and only where
          the labels they lead to exist at all. */}
      <svg className="globe-leaders pointer-events-none absolute inset-0 hidden h-full w-full lg:block">
        {destinations.map((place) => (
          <polyline
            key={place.id}
            ref={(el) => {
              if (el) lines.current.set(place.id, el)
              else lines.current.delete(place.id)
            }}
            fill="none"
            stroke="rgba(255,235,200,0.45)"
            strokeWidth={1}
            className="transition-opacity duration-300"
          />
        ))}
      </svg>

      {/* Market labels, on the lines. */}
      <div className="globe-leaders pointer-events-none absolute inset-0 hidden lg:block">
        {destinations.map((place) => (
          <div
            key={place.id}
            ref={(el) => {
              if (el) labels.current.set(place.id, el)
              else labels.current.delete(place.id)
            }}
            className="absolute left-0 top-0 w-max -translate-y-1/2 opacity-0 transition-opacity duration-300"
          >
            <p className="whitespace-nowrap text-[0.7rem] uppercase tracking-[0.18em] text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
              {place.label}
            </p>
            <p className="mt-0.5 max-w-[13rem] whitespace-normal text-[0.7rem] leading-snug text-white/60">
              {place.note}
            </p>
          </div>
        ))}
      </div>

      {/* Markers and their hover cards. */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        {places.map((place) => {
          const isOrigin = place.id === 'origin'
          const isActive = active === place.id
          return (
            <div
              key={place.id}
              ref={(el) => {
                if (el) dots.current.set(place.id, el)
                else dots.current.delete(place.id)
              }}
              className="absolute left-0 top-0 opacity-0 transition-opacity duration-300"
            >
              <div className="-translate-x-1/2 -translate-y-1/2">
                <button
                  type="button"
                  aria-label={
                    isOrigin
                      ? 'Narayanganj, Bangladesh. Facility details.'
                      : `${place.label}. ${place.note ?? ''}`
                  }
                  onMouseEnter={() => setActive(place.id)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(place.id)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(isActive ? null : place.id)}
                  className={cn(
                    'pointer-events-auto block rounded-full transition-colors',
                    isOrigin ? 'h-9 w-9' : 'h-7 w-7',
                    isActive ? 'bg-white/20' : 'bg-transparent',
                  )}
                />
                {isOrigin ? (
                  <span className="pointer-events-none absolute left-7 top-1 whitespace-nowrap text-[0.65rem] uppercase tracking-[0.18em] text-white/85 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
                    Bangladesh
                  </span>
                ) : null}
              </div>

              {isActive ? (
                <div
                  className={cn(
                    'glass-surface pointer-events-none absolute z-10 rounded-2xl p-4',
                    isOrigin ? 'right-4 top-4 w-64 p-5' : 'left-4 top-4 w-52',
                  )}
                >
                  <p className="text-sm font-medium tracking-[-0.02em] text-white">
                    {isOrigin ? 'Narayanganj, Bangladesh' : place.label}
                  </p>
                  {isOrigin ? (
                    <dl className="mt-3 space-y-1.5 text-xs text-white/60">
                      {originFacts.map(([term, value]) => (
                        <div key={term} className="flex justify-between gap-3">
                          <dt className="text-white/40">{term}</dt>
                          <dd className="text-right text-white/75">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-1.5 text-xs leading-relaxed text-white/60">{place.note}</p>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
