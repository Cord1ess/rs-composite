/**
 * Hero scroll progress, 0 at the top of the runway, 1 when it releases.
 *
 * A plain mutable object rather than React state or context. The render loop
 * reads it every frame, and routing that through React would mean a reconcile
 * at 60fps for a single float. One component writes it, the scene reads it.
 *
 * set() also notifies subscribers. That exists for exactly one consumer: when
 * the globe renders in a worker, the worker cannot read this module's memory,
 * so the value is pushed to it as a message on change instead.
 */
type Listener = (value: number) => void

const listeners = new Set<Listener>()

export const heroProgress = {
  value: 0,
  set(value: number) {
    if (value === this.value) return
    this.value = value
    for (const fn of listeners) fn(value)
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

/** Smoothstep. Used for every ramp in the sequence so nothing starts or stops
    abruptly. */
export function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/** Maps a raw progress value onto a sub range, clamped, then eases it. */
export function stage(progress: number, from: number, to: number): number {
  return ease((progress - from) / (to - from))
}
