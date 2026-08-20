'use client'

import { useEffect } from 'react'
import { pageRevealed } from '@/lib/hero-loader'

/*
  Section based scrolling for the home page: scrub, then settle.

  The visitor's wheel, swipe or paging keys own the position directly — a
  scrub loop follows the input with light smoothing, so travel can stop
  anywhere, halfway through anything. The moment the input goes quiet the
  page settles into a stop with one eased tween. No gesture is ever locked
  out or swallowed: new input always cancels a settle and resumes the scrub.

  The stops:

    0                 the hero at rest (headline pose)
    runway end        the globe pulled back (hp = 1, the showcase pose)
    [data-snap]       each marked section, top aligned; data-snap="center"
                      centres a short band instead
    max scroll        the very end, so the footer is reachable

  Between two stops further apart than a viewport, evenly spaced intermediate
  pages are inserted so a tall section can be read screen by screen.

  The hero runway is special twice over: scrubbing inside it is geared down
  so the earth's pull back plays at half rate under the same gesture, and a
  settle that travels through it stretches its tween, so the globe never
  whips. See HERO_GEAR and settleDuration.

  Rules the implementation lives by:

  - Gestures only. Programmatic scrolling (anchor jumps, the verify
    harness's scrollTo, browser find in page) is never touched. The
    scrollbar stays a free scroll escape: the moment the position moves
    without us, the conductor lets go.
  - Stateless. Stops are measured at settle time from the live DOM, so
    resize, font swaps and content-visibility never leave a stale cache.
  - Nested scrollables win. A wheel or swipe over anything that scrolls
    itself (tune panel, a menu sheet) is left alone.
  - Every write uses behavior 'instant': the html rule scroll-behavior
    smooth would otherwise turn each frame's write into its own competing
    animation.
  - Runs regardless of prefers-reduced-motion, deliberately: the owner's
    machine reports reduce through Windows performance mode, and the scrub
    maps to the visitor's own gesture. See the same rule on the globe.
*/

/** Scrub gearing inside the hero runway: the tour plays this fraction of
    the gesture's travel, so the earth pulls back unhurried. */
const HERO_GEAR = 0.5
/** Input this quiet means the gesture (and its inertia tail) is over. */
const SETTLE_AFTER_MS = 150
/** Travel past a stop that commits to the next one; anything shorter eases
    back. Absolute, so one wheel notch advances a section but the geared
    hero asks for a slightly more deliberate scroll. */
const ADVANCE_PX = 100
/** Smoothing time constant for the scrub loop, milliseconds. */
const SCRUB_TAU = 90
/** A stop must be at least this far away for a paging key to aim at it;
    also absorbs the small offset native anchor jumps add for the header. */
const STOP_EPSILON = 90

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** Settle duration from distance, stretched by however much of the path
    lies inside the hero runway, where the globe is being scrubbed. */
function settleDuration(from: number, to: number, runwayEnd: number): number {
  const dist = Math.abs(to - from)
  let d = Math.min(1300, Math.max(500, 380 + dist * 0.35))
  const overlap = Math.max(0, Math.min(Math.max(from, to), runwayEnd) - Math.min(from, to))
  if (dist > 0 && overlap > 0) d *= 1 + 1.3 * (overlap / dist)
  return d
}

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
function measure(): { stops: number[]; runwayEnd: number; max: number } {
  const vh = window.innerHeight
  const max = Math.max(0, document.documentElement.scrollHeight - vh)
  const raw = [0, max]

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
    /* The runway is one scrub, never paged. */
    if (sorted[i + 1] <= runwayEnd + 1) continue
    const leftover = sorted[i + 1] - sorted[i] - vh
    if (leftover > vh * 0.2) {
      const pages = Math.ceil(leftover / (vh * 0.85))
      for (let k = 1; k <= pages; k++) stops.push(sorted[i] + (leftover * k) / pages)
    }
  }
  return { stops, runwayEnd, max }
}

export function SectionSnap() {
  useEffect(() => {
    let ready = false
    let disposed = false
    void pageRevealed.then(() => {
      if (!disposed) ready = true
    })

    /* One rAF at a time, either the scrub loop or a settle tween. */
    let raf = 0
    let mode: 'idle' | 'scrub' | 'settle' = 'idle'
    let lastWritten = -1
    /* The position the scrub is heading for; input moves it, the loop
       chases it. `pos` is our own float position: scrollY quantises to
       whole pixels, so converging against its readback stalls forever a
       few pixels short. */
    let virtual = 0
    let pos = 0
    let lastInputAt = 0
    let lastDir = 0
    let lastTick = 0

    const stopAnim = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      mode = 'idle'
    }

    /* The visitor moved the page without us (scrollbar, find in page):
       let go entirely. */
    const hijacked = () => Math.abs(window.scrollY - lastWritten) > 150

    /* A callable target is re-evaluated every frame: the End key aims at
       the document's true end, which grows mid flight as content-visibility
       sections render in. */
    const settleTween = (target: number | (() => number), runwayEnd: number) => {
      stopAnim()
      const from = window.scrollY
      const goalNow = typeof target === 'function' ? target() : target
      if (Math.abs(goalNow - from) < 1) return
      mode = 'settle'
      const start = performance.now()
      const duration = settleDuration(from, goalNow, runwayEnd)
      lastWritten = from
      const frame = (now: number) => {
        if (hijacked()) {
          stopAnim()
          return
        }
        const goal = typeof target === 'function' ? target() : target
        const t = Math.min(1, (now - start) / duration)
        window.scrollTo({
          top: from + (goal - from) * easeInOutCubic(t),
          behavior: 'instant',
        })
        lastWritten = window.scrollY
        if (t < 1) raf = requestAnimationFrame(frame)
        else stopAnim()
      }
      raf = requestAnimationFrame(frame)
    }

    /* Pick the stop the current position should come to rest at: carried
       forward past ADVANCE_PX of travel into a gap, eased back otherwise. */
    const settle = () => {
      const { stops, runwayEnd } = measure()
      const y = window.scrollY
      let below = -Infinity
      let above = Infinity
      for (const s of stops) {
        if (s <= y && s > below) below = s
        if (s > y && s < above) above = s
      }
      let target: number
      if (below === -Infinity) target = above
      else if (above === Infinity) target = below
      else if (lastDir > 0) target = y - below >= ADVANCE_PX ? above : below
      else if (lastDir < 0) target = above - y >= ADVANCE_PX ? below : above
      else target = y - below <= above - y ? below : above
      settleTween(target, runwayEnd)
    }

    const frame = (now: number) => {
      if (hijacked()) {
        stopAnim()
        return
      }
      const dt = Math.min(64, now - lastTick)
      lastTick = now
      const gap = virtual - pos
      pos = Math.abs(gap) < 0.5 ? virtual : pos + gap * (1 - Math.exp(-dt / SCRUB_TAU))
      window.scrollTo({ top: pos, behavior: 'instant' })
      lastWritten = window.scrollY
      if (pos === virtual && now - lastInputAt > SETTLE_AFTER_MS) {
        stopAnim()
        settle()
        return
      }
      raf = requestAnimationFrame(frame)
    }

    /* Feed one input delta into the scrub. */
    const scrubBy = (delta: number) => {
      const now = performance.now()
      lastInputAt = now
      if (Math.abs(delta) > 0.5) lastDir = Math.sign(delta)
      if (mode !== 'scrub') {
        stopAnim()
        virtual = window.scrollY
        pos = window.scrollY
        lastWritten = window.scrollY
        lastTick = now
        mode = 'scrub'
        raf = requestAnimationFrame(frame)
      }
      /* Gear down inside the runway so the globe's pull back stays calm.
         Strictly inside: standing exactly on the showcase stop, a downward
         tick is leaving the runway and moves at full rate. */
      const { runwayEnd, max } = measureRunway()
      const geared = virtual < runwayEnd ? delta * HERO_GEAR : delta
      virtual = Math.min(max, Math.max(0, virtual + geared))
    }

    /* The cheap subset of measure() the per-event path needs. */
    const measureRunway = () => {
      const vh = window.innerHeight
      const max = Math.max(0, document.documentElement.scrollHeight - vh)
      const runway = document.querySelector('.hero-runway')
      if (!runway) return { runwayEnd: -1, max }
      const rect = runway.getBoundingClientRect()
      return { runwayEnd: Math.round(rect.top + window.scrollY + rect.height - vh), max }
    }

    const onWheel = (e: WheelEvent) => {
      if (!ready) return
      if (e.ctrlKey) return /* trackpad pinch zoom */
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (insideScrollable(e.target)) return
      e.preventDefault()
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1
      scrubBy(e.deltaY * scale)
    }

    let touchY = 0
    let touchStartY = 0
    let touchStartX = 0

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      touchY = e.touches[0].clientY
      touchStartY = touchY
      touchStartX = e.touches[0].clientX
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!ready) return
      if (e.touches.length !== 1) return
      if (insideScrollable(e.target)) return
      const cur = e.touches[0]
      /* Horizontal drags belong to the globe. */
      if (Math.abs(cur.clientX - touchStartX) > Math.abs(cur.clientY - touchStartY)) return
      e.preventDefault()
      scrubBy(touchY - cur.clientY)
      touchY = cur.clientY
    }

    /* Paging keys step whole stops, tweened like a settle. */
    const go = (dir: number) => {
      const { stops, runwayEnd } = measure()
      const cur = window.scrollY
      const target =
        dir > 0
          ? stops.find((s) => s > cur + STOP_EPSILON)
          : [...stops].reverse().find((s) => s < cur - STOP_EPSILON)
      if (target === undefined) return
      lastDir = dir
      settleTween(target, runwayEnd)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!ready || e.defaultPrevented) return
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const el = e.target instanceof Element ? e.target : null
      if (el?.closest('input, textarea, select, button, a, [contenteditable], [role="slider"]'))
        return

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        settleTween(0, measureRunway().runwayEnd)
      } else if (e.key === 'End') {
        e.preventDefault()
        settleTween(
          () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
          measureRunway().runwayEnd,
        )
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      disposed = true
      stopAnim()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return null
}
