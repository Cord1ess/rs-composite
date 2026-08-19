'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/icons/Icon'
import { tourSpots } from '@/content/tour'
import type { SpotFrame, TourScene } from './tour-scene'

/*
  The big window. The scene arrives through a dynamic import only once the
  section is within 600px of the viewport, so the homepage pays nothing for it
  until the visitor is nearly there. Hotspot positions are written straight to
  the DOM from the render loop, and the loop itself only draws frames when the
  view is actually moving, so an untouched panorama costs nothing.
*/

export function TourViewer() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dots = useRef(new Map<string, HTMLDivElement>())
  const sceneRef = useRef<TourScene | null>(null)
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [dragged, setDragged] = useState(false)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    let cancelled = false
    let started = false

    const applyFrames = (frames: SpotFrame[]) => {
      for (const frame of frames) {
        const dot = dots.current.get(frame.id)
        if (!dot) continue
        dot.style.transform = `translate3d(${frame.x.toFixed(1)}px, ${frame.y.toFixed(1)}px, 0)`
        dot.style.opacity = frame.visible ? '1' : '0'
        dot.style.pointerEvents = frame.visible ? 'auto' : 'none'
      }
    }

    const init = () => {
      if (started) return
      started = true
      void import('./tour-scene').then(({ TourScene: Ctor }) => {
        if (cancelled) return
        const scene = new Ctor({
          canvas,
          spots: tourSpots,
          /* Unconditional, the same owner decision as the globe (see
             GlobeField's probe): Windows performance mode reports
             prefers-reduced-motion and froze the auto look-around for a
             large slice of ordinary laptops. A showcase that sits still
             reads as broken, not reduced. */
          motion: true,
          /*
            A real hall, standing in for ours: Poly Haven's machine_shop_01,
            CC0, no attribution required. When the facility shoot happens,
            replace the file and re-aim the spots in content/tour.ts. Removing
            src entirely falls back to the drawn placeholder.
          */
          src: '/textures/tour.webp',
          onFrames: applyFrames,
          onReady: () => {
            if (!cancelled) setReady(true)
          },
        })
        sceneRef.current = scene
        scene.setSize(wrap.clientWidth, wrap.clientHeight)
        scene.start()
      })
    }

    /* Wake the section just before it scrolls into reach, then run the loop
       only while it is actually on screen. */
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          init()
          near.disconnect()
        }
      },
      { rootMargin: '600px' },
    )
    near.observe(wrap)

    const visible = new IntersectionObserver(
      ([entry]) => {
        if (!sceneRef.current) return
        if (entry.isIntersecting) sceneRef.current.start()
        else sceneRef.current.stop()
      },
      { threshold: 0.05 },
    )
    visible.observe(wrap)

    const ro = new ResizeObserver(([entry]) => {
      sceneRef.current?.setSize(entry.contentRect.width, entry.contentRect.height)
    })
    ro.observe(wrap)

    return () => {
      cancelled = true
      near.disconnect()
      visible.disconnect()
      ro.disconnect()
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [])

  /* Escape closes the open popup. */
  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  /* An open popup holds the auto look-around still. */
  useEffect(() => {
    sceneRef.current?.setPaused(active !== null)
  }, [active])

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    sceneRef.current?.pointerDown(event.clientX, event.clientY)
    setActive(null)
    if (!dragged) setDragged(true)
  }
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    sceneRef.current?.pointerMove(event.clientX, event.clientY)
  }
  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    sceneRef.current?.pointerUp()
  }

  return (
    <div
      ref={wrapRef}
      className="ring-glass relative h-[60vh] min-h-[420px] max-h-[720px] overflow-hidden rounded-[2rem] bg-[#080c0a]"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          'h-full w-full cursor-grab touch-pan-y transition-opacity duration-700 active:cursor-grabbing',
          ready ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Hotspots. Positioned by the render loop, never by React. */}
      <div className="pointer-events-none absolute inset-0">
        {tourSpots.map((spot) => {
          const isActive = active === spot.id
          return (
            <div
              key={spot.id}
              ref={(el) => {
                if (el) dots.current.set(spot.id, el)
                else dots.current.delete(spot.id)
              }}
              className="absolute left-0 top-0 opacity-0 transition-opacity duration-300"
            >
              <div className="-translate-x-1/2 -translate-y-1/2">
                <button
                  type="button"
                  aria-expanded={isActive}
                  aria-label={`${spot.label}. ${spot.note}`}
                  onClick={() => setActive(isActive ? null : spot.id)}
                  className="tour-dot pointer-events-auto relative block h-9 w-9 rounded-full"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-200',
                      isActive ? 'bg-white' : 'bg-accent',
                    )}
                  />
                  <span
                    aria-hidden
                    className="tour-dot-ring absolute inset-0 rounded-full border border-accent/50"
                  />
                </button>
              </div>

              <div
                inert={!isActive}
                className={cn(
                  'glass-surface absolute left-4 top-4 w-56 origin-top-left rounded-2xl p-4',
                  'transition-[transform,opacity] duration-200 ease-out',
                  isActive
                    ? 'scale-100 opacity-100'
                    : 'pointer-events-none -translate-y-1 scale-95 opacity-0',
                )}
              >
                <p className="text-sm font-medium tracking-[-0.02em] text-white">{spot.label}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/60">{spot.note}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Honest and quiet: this is a stand-in hall, not our floor yet. */}
      <p className="pointer-events-none absolute right-5 top-4 text-[0.6rem] uppercase tracking-[0.2em] text-white/35">
        Demo panorama
      </p>

      {/* The drag hint retires itself after the first drag. */}
      <p
        className={cn(
          'pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-4 py-2 text-xs text-white/70',
          'transition-opacity duration-500',
          ready && !dragged ? 'opacity-100' : 'opacity-0',
        )}
      >
        Drag to look around
      </p>
    </div>
  )
}
