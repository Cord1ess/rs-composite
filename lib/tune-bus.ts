/**
 * The bridge between the dev tuning panel and whichever side owns the earth
 * scene. The panel mounts before the globe finishes loading (and survives it
 * remounting), so values sent early accumulate and are replayed the moment a
 * tuner registers. Module-level on purpose: both ends live on the main
 * thread and there is at most one globe.
 */

export type TuneValues = Record<string, number | [number, number, number]>

type Tuner = (values: TuneValues) => void

let tuner: Tuner | null = null
let pending: TuneValues | null = null

export function registerTuner(fn: Tuner | null) {
  tuner = fn
  if (fn && pending) fn(pending)
}

export function sendTune(values: TuneValues) {
  pending = { ...(pending ?? {}), ...values }
  tuner?.(values)
}
