'use client'

import { useEffect } from 'react'

/*
  The one listener behind every card's border glow. The reactbits original is
  a component wrapping each card with its own pointermove handler; on a site
  where nearly everything is a card, that is dozens of listeners and a client
  boundary around server markup. This is the delegated version: a single
  passive, rAF guarded pointermove on the document finds the hovered
  .card-glow, computes the cursor position and the edge proximity and writes
  three CSS variables. The CSS does everything else.

  Installed only on fine pointer devices: on touch there is no hover to
  follow, so phones pay nothing.
*/

/** Below this proximity to the centre the glow stays dark, like the
    original's edgeSensitivity of 30. */
const SENSITIVITY = 0.3

export function GlowDriver() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    let raf = 0
    let last: PointerEvent | null = null
    let lit: HTMLElement | null = null

    const apply = () => {
      raf = 0
      const event = last
      if (!event) return
      const target = event.target as Element | null
      const card = (target?.closest?.('.card-glow') ?? null) as HTMLElement | null

      if (lit && lit !== card) lit.style.setProperty('--edge', '0')
      lit = card
      if (!card) return

      const rect = card.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const cx = rect.width / 2
      const cy = rect.height / 2
      /* Chebyshev distance from the centre, 0 at centre, 1 on the border,
         which is exactly the original's kx and ky construction. */
      const edge = Math.min(1, Math.max(Math.abs(x - cx) / cx, Math.abs(y - cy) / cy))
      const proximity = Math.max(0, (edge - SENSITIVITY) / (1 - SENSITIVITY))

      card.style.setProperty('--gx', `${x.toFixed(1)}px`)
      card.style.setProperty('--gy', `${y.toFixed(1)}px`)
      card.style.setProperty('--edge', proximity.toFixed(3))
    }

    const onMove = (event: PointerEvent) => {
      last = event
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const onLeave = () => {
      if (lit) lit.style.setProperty('--edge', '0')
      lit = null
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return null
}
