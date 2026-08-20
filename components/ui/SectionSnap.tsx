'use client'

import { useEffect } from 'react'
import { pageRevealed } from '@/lib/hero-loader'

/*
  Section based scrolling for the home page.

  Free scroll is replaced by a conductor: every wheel flick, vertical swipe or
  paging key moves the page to the next stop with one eased tween. The stops:

    0                 the hero at rest (headline pose)
    runway end        the globe pulled back (hp = 1, the showcase pose)
    [data-snap]       each marked section, top aligned; data-snap="center"
                      centres a short band instead
    max scroll        the very end, so the footer is reachable

  Between two stops further apart than a viewport, evenly spaced intermediate
  pages are inserted, so a tall section is read screen by screen instead of
  being flung past. The last page inside a section aligns its bottom edge
  with the viewport's, then the next gesture moves on.

  Rules the implementation lives by:

  - Gestures only. Programmatic scrolling (anchor jumps, the verify harness's
    scrollTo, browser find in page) is never touched, and there is no settle
    watcher that could fight it. The scrollbar stays a free scroll escape.
  - Stateless. Stops are measured at gesture time from the live DOM, so
    resize, font swaps and content-visibility never leave a stale cache.
  - Nested scrollables win. A wheel or swipe over anything that scrolls
    itself (tune panel, a menu sheet) is left alone until it is the page's
    turn.
  - The tween writes with behavior 'instant': the html rule
    scroll-behavior smooth would otherwise turn every frame's write into its
    own competing animation.
  - Runs regardless of prefers-reduced-motion, deliberately: the owner's
    machine reports reduce through Windows performance mode, and the scrub
    maps to the visitor's own gesture. See the same rule on the globe.
*/

/** Wheel travel that counts as a deliberate flick (one mouse notch is 100). */
const WHEEL_TRIGGER = 50
/** A wheel event this long after the previous one is a new gesture, not the
    inertia tail of the old one. Unlocks after a transition. */
const WHEEL_QUIET_MS = 170
/** Accumulated wheel travel resets after this much silence. */
const WHEEL_RESET_MS = 250
/** Vertical swipe distance that turns the page. */
const TOUCH_TRIGGER = 60
/** A stop must be at least this far away to be the next one; also absorbs
    the small offset native anchor jumps add for the header. */
const STOP_EPSILON = 90
/** Tween duration from distance: base + slope, clamped. The hero runway
    (about 1.6 viewports) lands near a second, cinematic but not slow. */
const tweenDuration = (dist: number) => Math.min(1300, Math.max(550, 400 + dist * 0.38))

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** True if something between the event target and the body scrolls itself. */
function insideScrollable(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null
  for (let depth = 0; el && el !== document.body && depth < 12; depth++) {
    if (el.scrollHeight > el.clientHeight + 1) {
      const overflow = getComputedStyle(el).overflowY
      if (overflow === 'auto' || overflow === 'scroll') return true
    }
    el = el.parentElement
  }
  return false
}

/** The stop list, measured fresh from the live DOM. Sorted, deduped, with
    intermediate pages inserted wherever a hop would skip content. */
function measureStops(): number[] {
  const vh = window.innerHeight
  const max = Math.max(0, document.documentElement.scrollHeight - vh)
  const raw = [0, max]

  /* The runway's end is the globe's showcase pose, and the whole runway is
     one scrub, not content: no intermediate pages inside it, one flick plays
     the entire pull back. */
  let runwayEnd = -1
  const runway = document.querySelector('.hero-runway')
  if (runway) {
    const rect = runway.getBoundingClientRect()
    runwayEnd = Math.round(rect.top + window.scrollY + rect.height - vh)
    raw.push(runwayEnd)
  }

  for (const el of document.querySelectorAll<HTMLElement>('[data-snap]')) {
    const rect = el.getBoundingClientRect()
    const top = rect.top + window.scrollY
    raw.push(
      el.dataset.snap === 'center' && rect.height < vh
        ? top - (vh - rect.height) / 2
        : top,
    )
  }

  const sorted = raw
    .map((y) => Math.min(max, Math.max(0, Math.round(y))))
    .sort((a, b) => a - b)
    .filter((y, i, arr) => i === 0 || y - arr[i - 1] > 60)

  const stops: number[] = []
  for (let i = 0; i < sorted.length; i++) {
    stops.push(sorted[i])
    if (i === sorted.length - 1) break
    if (sorted[i + 1] <= runwayEnd + 1) continue
    /* Content taller than the viewport between this stop and the next gets
       paged evenly; the final page puts the next stop exactly one viewport
       away, which bottom aligns the section being read. */
    const leftover = sorted[i + 1] - sorted[i] - vh
    if (leftover > vh * 0.2) {
      const pages = Math.ceil(leftover / (vh * 0.85))
      for (let k = 1; k <= pages; k++) stops.push(sorted[i] + (leftover * k) / pages)
    }
  }
  return stops
}

export function SectionSnap() {
  useEffect(() => {
    let ready = false
    let disposed = false
    void pageRevealed.then(() => {
      if (!disposed) ready = true
    })

    let raf = 0
    let animating = false
    let travelDir = 0
    let animStart = 0
    let lastWritten = -1
    let locked = false
    let lastWheelAt = -Infinity
    let wheelAccum = 0

    const cancelTween = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      animating = false
      travelDir = 0
    }

    /* A callable target is re-evaluated every frame: the End key aims at
       the document's true end, which grows mid flight as content-visibility
       sections render in. */
    const tweenTo = (target: number | (() => number)) => {
      cancelTween()
      const from = window.scrollY
      const goalNow = typeof target === 'function' ? target() : target
      if (Math.abs(goalNow - from) < 1) return
      animating = true
      travelDir = Math.sign(goalNow - from)
      animStart = performance.now()
      lastWritten = from
      const duration = tweenDuration(Math.abs(goalNow - from))
      const frame = (now: number) => {
        /* A scrollbar drag mid tween moves the page out from under us;
           yield instead of fighting the visitor for the thumb. The margin
           is generous because deferred sections rendering in can nudge the
           position a little on their own. */
        if (Math.abs(window.scrollY - lastWritten) > 150) {
          cancelTween()
          return
        }
        const goal = typeof target === 'function' ? target() : target
        const t = Math.min(1, (now - animStart) / duration)
        const y = from + (goal - from) * easeInOutCubic(t)
        window.scrollTo({ top: y, behavior: 'instant' })
        lastWritten = window.scrollY
        if (t < 1) raf = requestAnimationFrame(frame)
        else cancelTween()
      }
      raf = requestAnimationFrame(frame)
    }

    /* One step. Direction +1 or -1, from the live position. */
    const go = (dir: number) => {
      const stops = measureStops()
      const cur = window.scrollY
      const target =
        dir > 0
          ? stops.find((y) => y > cur + STOP_EPSILON)
          : [...stops].reverse().find((y) => y < cur - STOP_EPSILON)
      if (target === undefined) return
      locked = true
      tweenTo(target)
    }

    /* A gesture against the current travel turns the tween around. */
    const maybeReverse = (dir: number) => {
      if (dir !== -travelDir) return
      if (performance.now() - animStart < 100) return
      go(dir)
    }

    const onWheel = (e: WheelEvent) => {
      if (!ready) return
      if (e.ctrlKey) return /* trackpad pinch zoom */
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (insideScrollable(e.target)) return
      e.preventDefault()

      const now = performance.now()
      const gap = now - lastWheelAt
      lastWheelAt = now
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1
      const delta = e.deltaY * scale
      const dir = Math.sign(delta)

      if (animating) {
        maybeReverse(dir)
        return
      }
      if (locked) {
        /* Still swallowing the inertia tail of the last gesture. */
        if (gap <= WHEEL_QUIET_MS) return
        locked = false
        wheelAccum = 0
      }
      if (gap > WHEEL_RESET_MS) wheelAccum = 0
      wheelAccum += delta
      if (Math.abs(wheelAccum) >= WHEEL_TRIGGER) {
        wheelAccum = 0
        go(dir)
      }
    }

    let touchStartY = 0
    let touchStartX = 0
    let touchConsumed = false

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      touchStartY = e.touches[0].clientY
      touchStartX = e.touches[0].clientX
      touchConsumed = false
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!ready) return
      if (e.touches.length !== 1) return
      if (insideScrollable(e.target)) return
      const dy = touchStartY - e.touches[0].clientY
      const dx = touchStartX - e.touches[0].clientX
      /* Horizontal drags belong to the globe. */
      if (Math.abs(dx) > Math.abs(dy)) return
      e.preventDefault()
      if (touchConsumed) return
      if (animating) {
        if (Math.abs(dy) > TOUCH_TRIGGER) {
          touchConsumed = true
          maybeReverse(Math.sign(dy))
        }
        return
      }
      if (Math.abs(dy) > TOUCH_TRIGGER) {
        touchConsumed = true
        go(Math.sign(dy))
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!ready || e.defaultPrevented) return
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const el = e.target instanceof Element ? e.target : null
      if (el?.closest('input, textarea, select, button, a, [contenteditable], [role="slider"]'))
        return

      let dir = 0
      let target: number | undefined
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) dir = 1
      else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) dir = -1
      else if (e.key === 'Home') target = 0
      else if (e.key === 'End') target = -1
      else return

      e.preventDefault()
      if (target !== undefined) {
        locked = true
        if (target < 0)
          tweenTo(() =>
            Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
          )
        else tweenTo(target)
      } else if (animating) {
        maybeReverse(dir)
      } else {
        go(dir)
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      disposed = true
      cancelTween()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return null
}
