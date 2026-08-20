'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { places } from '@/content/globe'
import { heroProgress } from '@/lib/scroll-progress'
import { heroEntranceGate, markHeroReady, reportHeroLoad } from '@/lib/hero-loader'
import { registerTuner, type TuneValues } from '@/lib/tune-bus'
import { CLOUDS } from './config'
import { fetchEarthBitmaps } from './scene/assets'
import type { MarkerFrame } from './earth-scene'
import type { FromWorker } from './protocol'

/*
  Only reached through a dynamic import behind the capability gate, so three.js
  and the textures are absent from the initial bundle.

  What lives where. The markers THEMSELVES are geometry in the scene now —
  decals lying on the sphere — because anything projected across a message
  channel lands a frame behind the picture and visibly detaches from the
  planet during a drag. What stays in the DOM is what the DOM is good at: the
  hit target, the country name and the detail card. Those are written straight
  to the elements from an animation frame, never through React state, so
  tracking the globe costs no reconciles. Only which place is active is state,
  and that changes on hover.
*/

const originFacts = [
  ['Operation area', '197,263 sq ft'],
  ['People', '2,250, half of them women'],
  ['Sewing lines', '25'],
  ['Output', '1.2 million pieces a month'],
]

/** How far below the marker its name sits, and the least vertical room two
    names may share before the lower one is pushed further down. */
const NAME_DROP = 19
const NAME_GAP = 17

/*
  Position smoothing.

  The scene renders on its own cadence and posts marker positions when they
  move; the DOM applies them whenever the message lands. Written straight
  through, that irregular arrival reads as jitter — the name stepping along
  beside a dot that glides. The names are therefore eased toward the reported
  position instead of snapped to it: 45 ms of smoothing removes the stepping
  while staying close enough that a name never trails its marker.

  Anything further than a marker could plausibly travel in a frame is a jump,
  not a move — a pose change, or a marker reappearing around the limb — and is
  taken instantly, because easing a teleport draws a line across the screen.
*/
const SMOOTH_MS = 45
const JUMP_PX = 90

/** How long an emptied hover waits before the card closes. Long enough to
    cross the gap between a marker and its name without a flicker. */
const CLOSE_DELAY = 140

/*
  The capture seed.

  Deliberately not the tuning panel's own key. The panel is a lazily
  compiled chunk, so anything it replays lands after the loop is already
  turning, and the golden harness — which works by freezing the tour and
  comparing pixels — was freezing at a different angle on every run,
  depending on how long the dev server took to compile that chunk. Read
  here instead, the values reach the scene's constructor and nothing ever
  moves unfrozen. Nothing writes this key but the capture scripts.
*/
function captureSeed(): Record<string, number | [number, number, number]> | undefined {
  try {
    const raw = localStorage.getItem('earth-tune-seed')
    return raw ? (JSON.parse(raw) as Record<string, number | [number, number, number]>) : undefined
  } catch {
    return undefined
  }
}

type Track = {
  x: number
  y: number
  fade: number
  tx: number
  ty: number
  tfade: number
}

type Handle = {
  setSize(width: number, height: number): void
  run(running: boolean): void
  pointer(phase: 'down' | 'move' | 'up', x: number): void
  hover(x: number, y: number): void
  hoverEnd(): void
  active(id: string | null): void
  tune(values: TuneValues): void
  dispose(): void
}

export default function Earth3D({ motion, onFail }: { motion: boolean; onFail?: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dots = useRef(new Map<string, HTMLDivElement>())
  const names = useRef(new Map<string, HTMLDivElement>())
  const handleRef = useRef<Handle | null>(null)
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  /*
    Three sources decide what is active, in this order: a pinned marker (a
    click, which is the only way a touch visitor can open a card), a hovered
    or focused marker in the DOM, and the route line the scene reports under
    the pointer. They are refs rather than state because two of them are
    written from event handlers and messages that must not each cost a
    render; the merge below is the only thing that ever calls setActive.
  */
  const pinned = useRef<string | null>(null)
  const dotHover = useRef<string | null>(null)
  const routeHover = useRef<string | null>(null)
  const shown = useRef<string | null>(null)
  const closeTimer = useRef(0)

  const resolveActive = useCallback(() => {
    const next = pinned.current ?? dotHover.current ?? routeHover.current
    window.clearTimeout(closeTimer.current)
    if (next === shown.current) return
    const commit = () => {
      shown.current = next
      setActive(next)
      handleRef.current?.active(next)
    }
    /* Opening is immediate; closing waits, so moving between a marker and
       its name cannot flicker the card. */
    if (next === null) closeTimer.current = window.setTimeout(commit, CLOSE_DELAY)
    else commit()
  }, [])

  const enter = useCallback(
    (id: string) => {
      dotHover.current = id
      resolveActive()
    },
    [resolveActive],
  )

  const leave = useCallback(
    (id: string) => {
      if (dotHover.current === id) dotHover.current = null
      resolveActive()
    },
    [resolveActive],
  )

  const toggle = useCallback(
    (id: string) => {
      pinned.current = pinned.current === id ? null : id
      resolveActive()
    },
    [resolveActive],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    let cancelled = false
    let handle: Handle | null = null

    /*
      Cached, and only ever written from the ResizeObserver. Reading
      clientWidth in the frame callback forced a synchronous layout every
      frame, because the previous frame's attribute writes had already
      dirtied layout by the time the read arrived. Classic thrash, one line.
    */
    let wrapWidth = wrap.clientWidth

    /* ------------------------------------------------ marker tracking */

    const tracks = new Map<string, Track>()
    /* Last written value per element, so a parked globe costs zero style
       invalidations. Only the rarely-changing writes need it: the position
       is written from a loop that stops when it converges. */
    const written = new Map<string, string>()
    let smoothRaf = 0
    let lastFrameAt = 0

    const paint = () => {
      /*
        Names sit under their markers, and the four European markets sit
        within a few dozen pixels of each other, so the names are laid out
        top to bottom and any that would collide is pushed below the one
        above it. The result stays anchored to the right marker while
        staying readable, which the old ladder off to one side did not: it
        overlapped its own rungs.
      */
      const order = [...tracks.entries()]
        .filter(([, t]) => t.tfade > 0.02)
        .sort((a, b) => a[1].y - b[1].y)
      let prevBottom = -Infinity

      for (const [id, t] of tracks) {
        const wrapEl = dots.current.get(id)
        if (!wrapEl) continue
        wrapEl.style.transform = `translate3d(${t.x.toFixed(1)}px, ${t.y.toFixed(1)}px, 0)`

        /* Cards flip to the free side of the globe rather than off screen. */
        const side = t.x > wrapWidth * 0.62 ? 'left' : 'right'
        if (written.get(`${id}:side`) !== side) {
          written.set(`${id}:side`, side)
          wrapEl.dataset.side = side
        }

        const hittable = t.fade > 0.35 ? 'auto' : 'none'
        if (written.get(`${id}:hit`) !== hittable) {
          written.set(`${id}:hit`, hittable)
          wrapEl.style.pointerEvents = hittable
        }
      }

      for (const [id, t] of order) {
        const name = names.current.get(id)
        if (!name) continue
        let drop = NAME_DROP
        if (t.y + drop < prevBottom + NAME_GAP) drop = prevBottom + NAME_GAP - t.y
        prevBottom = t.y + drop
        name.style.transform = `translate3d(-50%, ${drop.toFixed(1)}px, 0)`
        name.style.opacity = t.fade.toFixed(2)
      }

      /* Markers behind the planet keep no name at all. */
      for (const [id, t] of tracks) {
        if (t.tfade > 0.02) continue
        const name = names.current.get(id)
        if (name && name.style.opacity !== '0') name.style.opacity = '0'
      }
    }

    const step = (now: number) => {
      smoothRaf = 0
      const dt = lastFrameAt ? Math.min(64, now - lastFrameAt) : 16
      lastFrameAt = now
      const k = 1 - Math.exp(-dt / SMOOTH_MS)

      let moving = false
      for (const track of tracks.values()) {
        const dx = track.tx - track.x
        const dy = track.ty - track.y
        const df = track.tfade - track.fade
        if (Math.abs(dx) > JUMP_PX || Math.abs(dy) > JUMP_PX) {
          track.x = track.tx
          track.y = track.ty
        } else {
          track.x += dx * k
          track.y += dy * k
        }
        track.fade += df * k
        if (
          Math.abs(track.tx - track.x) > 0.05 ||
          Math.abs(track.ty - track.y) > 0.05 ||
          Math.abs(track.tfade - track.fade) > 0.004
        ) {
          moving = true
        } else {
          /* Land exactly, or a converging tail writes sub-pixel noise for
             ever and the loop never parks. */
          track.x = track.tx
          track.y = track.ty
          track.fade = track.tfade
        }
      }

      paint()
      if (moving) smoothRaf = window.requestAnimationFrame(step)
      else lastFrameAt = 0
    }

    const applyMarkers = (frames: MarkerFrame[]) => {
      for (const frame of frames) {
        const track = tracks.get(frame.id)
        if (!track) {
          /* First sight: start where the scene says, never glide in from
             the corner. */
          tracks.set(frame.id, {
            x: frame.x,
            y: frame.y,
            fade: frame.fade,
            tx: frame.x,
            ty: frame.y,
            tfade: frame.fade,
          })
          continue
        }
        track.tx = frame.x
        track.ty = frame.y
        track.tfade = frame.fade
      }
      if (!smoothRaf) smoothRaf = window.requestAnimationFrame(step)
    }

    /* ---------------------------------------------------- scene setup */

    /*
      The loader contract. markHeroReady resolves the global heroReady promise
      the moment a complete first frame exists; the entrance animation then
      waits at the gate, which a loading screen holds while it is on screen.
      With no loading screen mounted the gate is just the ready promise.

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

    const onRouteHover = (id: string | null) => {
      if (cancelled) return
      routeHover.current = id
      resolveActive()
    }

    const rect = wrap.getBoundingClientRect()

    /*
      The textures start downloading NOW, on the main thread, before either
      render path exists. This is where the <link preload> cache lives, so
      these fetches consume the preloads instead of duplicating them (audit
      III, A1: the worker's own fetches re-downloaded every preloaded map).
      Loading progress feeds the loader directly; the decoded bitmaps hand
      over to whichever path wins — transferred zero-copy to the worker, or
      awaited in place on the main thread.
    */
    const aborter = new AbortController()
    const bitmaps = fetchEarthBitmaps(CLOUDS, reportHeroLoad, aborter.signal)
    const seed = captureSeed()

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
              tune: seed,
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
          else if (msg.type === 'route') onRouteHover(msg.id)
          else if (msg.type === 'error') onSceneError(msg.reason)
          else onSceneReady()
        }
        /* A worker that dies mid-session (script error, OOM kill) would
           otherwise freeze the globe silently: worker exceptions surface on
           this event, nowhere else. */
        worker.onerror = (event) => {
          onSceneError(`worker: ${event.message || 'crashed'}`)
        }
        /* The bitmaps travel, they are not copied: ImageBitmap transfer is
           a pointer handover. A fetch failure lands on the fallback. */
        bitmaps
          .then((b) => {
            worker.postMessage(
              { type: 'assets', ...b },
              b.clouds ? [b.lights, b.land, b.borders, b.clouds] : [b.lights, b.land, b.borders],
            )
          })
          .catch((err) => {
            /* A deliberate abort (unmount, StrictMode replay) is not a
               failure; the replayed mount fetches its own set. Only real
               errors reach the fallback. */
            if (aborter.signal.aborted) return
            console.error('[Earth3D] texture load failed.', err)
            onSceneError('assets')
          })
        const unsubscribe = heroProgress.subscribe((value) =>
          worker.postMessage({ type: 'progress', value }),
        )
        handle = {
          setSize: (width, height) => worker.postMessage({ type: 'size', width, height }),
          run: (running) => worker.postMessage({ type: 'run', running }),
          pointer: (phase, x) => worker.postMessage({ type: 'pointer', phase, x }),
          hover: (x, y) => worker.postMessage({ type: 'hover', x, y }),
          hoverEnd: () => worker.postMessage({ type: 'hoverEnd' }),
          active: (id) => worker.postMessage({ type: 'active', id }),
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
        handleRef.current = handle
        /* The dev tuning panel reaches the scene through the bus; any values
           it sent before this point replay now. */
        registerTuner(handle.tune)
      }
    }
    if (mainThread) {
      import('./earth-scene').then(({ EarthScene: Ctor }) => {
        if (cancelled) return
        /* A wedged GPU process throws out of renderer construction even
           when the capability probe passed moments earlier; that must land
           on the fallback, not as an unhandled rejection. */
        let scene: InstanceType<typeof Ctor>
        try {
          scene = new Ctor({
            canvas,
            places,
            originId: 'origin',
            motion,
            dpr: window.devicePixelRatio,
            getProgress: () => heroProgress.value,
            getAssets: () => bitmaps,
            onMarkers: applyMarkers,
            onRouteHover,
            onReady: onSceneReady,
            onError: onSceneError,
            tune: seed,
          })
        } catch (err) {
          console.error('[Earth3D] renderer construction failed.', err)
          onSceneError('webgl-context')
          return
        }
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
          hover: (x, y) => scene.pointerHover(x, y),
          hoverEnd: () => scene.pointerHoverEnd(),
          active: (id) => scene.setActive(id),
          tune: (values) => scene.setTune(values),
          dispose: () => scene.dispose(),
        }
        handleRef.current = handle
        registerTuner(handle.tune)
      })
    }

    /* -------------------------------------------------------- pointer */

    /*
      Pointer input lives here now, on the real DOM canvas, and is forwarded
      to whichever side owns the scene. Capture stays on the element.
    */
    let down = false
    /*
      Move events are coalesced to one message per animation frame. High
      rate pointers report at 120-240 Hz and the scene only ever integrates
      the latest position, so everything beyond one message a frame was
      clone and wake-up cost for nothing.
    */
    let pendingMoveX: number | null = null
    let pendingHover: { x: number; y: number } | null = null
    let moveRaf = 0
    const flushMove = () => {
      moveRaf = 0
      if (pendingMoveX !== null && down) handle?.pointer('move', pendingMoveX)
      pendingMoveX = null
      if (pendingHover && !down) handle?.hover(pendingHover.x, pendingHover.y)
      pendingHover = null
    }
    const onDown = (event: PointerEvent) => {
      down = true
      /* A press on open water dismisses a pinned card. */
      if (pinned.current !== null) {
        pinned.current = null
        resolveActive()
      }
      canvas.setPointerCapture(event.pointerId)
      handle?.pointer('down', event.clientX)
    }
    const onMove = (event: PointerEvent) => {
      if (down) {
        pendingMoveX = event.clientX
      } else {
        /* offsetX/Y are canvas-relative already, which the scene's hit test
           wants, and reading them costs no layout — unlike a bounding rect
           on a canvas that moves with every scroll. */
        pendingHover = { x: event.offsetX, y: event.offsetY }
      }
      if (!moveRaf) moveRaf = window.requestAnimationFrame(flushMove)
    }
    const onUp = (event: PointerEvent) => {
      if (!down) return
      /* The tail of the drag matters for release velocity: flush it. */
      if (pendingMoveX !== null) {
        handle?.pointer('move', pendingMoveX)
        pendingMoveX = null
      }
      down = false
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      handle?.pointer('up', event.clientX)
    }
    /*
      Leaving the whole field, not just the canvas: a pointer that crosses
      from a marker's own hit area straight out to the page never gives the
      canvas a leave event, and the last picked route would stay lit.
    */
    const onFieldLeave = () => {
      pendingHover = null
      handle?.hoverEnd()
      routeHover.current = null
      resolveActive()
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    wrap.addEventListener('pointerleave', onFieldLeave)

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
      aborter.abort(new DOMException('globe unmounted', 'AbortError'))
      if (moveRaf) window.cancelAnimationFrame(moveRaf)
      if (smoothRaf) window.cancelAnimationFrame(smoothRaf)
      window.clearTimeout(closeTimer.current)
      unsubScrub?.()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      wrap.removeEventListener('pointerleave', onFieldLeave)
      ro.disconnect()
      io.disconnect()
      handle?.dispose()
      handle = null
      handleRef.current = null
    }
  }, [motion, resolveActive])

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
        role="img"
        aria-label="Interactive globe showing RS Composite in Narayanganj, Bangladesh, with routes to its export markets in Poland, France, the United Kingdom, the Netherlands and the United States"
        className="h-full w-full cursor-grab touch-pan-y active:cursor-grabbing"
      />

      {/*
        The marker layer. The dots themselves are in the scene; these are the
        hit areas, the names and the cards, positioned from the render loop.
      */}
      <div className="pointer-events-none absolute inset-0">
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
              data-side="right"
              className="globe-marker absolute left-0 top-0"
            >
              <button
                type="button"
                aria-label={
                  isOrigin
                    ? 'Narayanganj, Bangladesh. Facility details.'
                    : `${place.label}. ${place.note ?? ''}`
                }
                onMouseEnter={() => enter(place.id)}
                onMouseLeave={() => leave(place.id)}
                onFocus={() => enter(place.id)}
                onBlur={() => leave(place.id)}
                onClick={() => toggle(place.id)}
                className={cn('globe-marker-hit', isOrigin && 'globe-marker-hit-lg')}
              />

              {/* The country name, under its marker. */}
              <div
                ref={(el) => {
                  if (el) names.current.set(place.id, el)
                  else names.current.delete(place.id)
                }}
                className="globe-marker-name"
              >
                <span
                  onMouseEnter={() => enter(place.id)}
                  onMouseLeave={() => leave(place.id)}
                  className="pointer-events-auto px-2 py-1"
                >
                  {place.label}
                </span>
              </div>

              {/*
                The card. Always mounted and toggled by class: mounting it on
                hover made it flash in and out as React tore the subtree down
                and rebuilt it, which is what read as a glitch.
              */}
              <div
                className={cn('globe-card', isOrigin && 'globe-card-lg', isActive && 'is-open')}
                aria-hidden={!isActive}
              >
                <p className="text-[0.8rem] font-medium tracking-[-0.01em] text-white">
                  {isOrigin ? 'Narayanganj, Bangladesh' : place.label}
                </p>
                {isOrigin ? (
                  <dl className="mt-3 space-y-1.5 text-[0.7rem]">
                    {originFacts.map(([term, value]) => (
                      <div key={term} className="flex justify-between gap-3">
                        <dt className="text-white/45">{term}</dt>
                        <dd className="text-right text-white/80">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-1.5 text-[0.7rem] leading-relaxed text-white/65">{place.note}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
