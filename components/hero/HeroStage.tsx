'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { heroProgress } from '@/lib/scroll-progress'

/*
  The scroll runway and the pinned stage inside it.

  One passive scroll listener, rAF guarded, writing two things: a number on a
  plain module object for the render loop to read, and a CSS custom property for
  the copy to fade against. Neither goes through React, so scrolling the hero
  causes no reconciles at all.

  The sequence runs under reduced motion too: it is scrubbed by the visitor's
  own scrolling, not autonomous. The scene's self driven movement is disabled
  separately. This used to pin reduced motion visitors at the settled end,
  where the headline is faded out, which erased the hero for them entirely.
*/
export function HeroStage({ children }: { children: ReactNode }) {
  const runwayRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const runway = runwayRef.current
    const stage = stageRef.current
    if (!runway || !stage) return

    let raf = 0
    const measure = () => {
      raf = 0
      const rect = runway.getBoundingClientRect()
      /* Distance scrolled through the runway, over the distance it can travel. */
      const travel = rect.height - window.innerHeight
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0

      heroProgress.set(p)
      stage.style.setProperty('--hp', p.toFixed(4))

      const phase = p < 0.4 ? 'entry' : p < 0.78 ? 'pulling-back' : 'settled'
      if (stage.dataset.phase !== phase) stage.dataset.phase = phase
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={runwayRef} className="hero-runway relative">
      <div
        ref={stageRef}
        data-phase="entry"
        className="sticky top-0 h-[100svh] w-full overflow-hidden"
      >
        {children}
      </div>
    </div>
  )
}
