/**
 * The contract between the hero globe and the global loading screen.
 *
 * The globe reports its loading progress here and waits at the gate before it
 * plays its entrance. A loading screen holds the gate while it is on screen
 * and releases it as it dismisses, so the planet's rise always happens in
 * front of the visitor, never behind a loader. Nothing here imports React or
 * three.js: it is a meeting point, both sides stay decoupled.
 *
 * Order of events:
 *
 *   1. The loading screen mounts and calls holdHeroEntrance().
 *   2. The globe streams in, calling reportHeroLoad(0..1) as textures arrive.
 *      The loading screen listens with onHeroLoad to drive its bar.
 *   3. The scene finishes (textures decoded, shaders compiled, first frame
 *      rendered) and resolves heroReady.
 *   4. The loading screen awaits heroReady, then calls release in the same
 *      breath as starting its exit animation, so the loader's slide and the
 *      globe's rise play together. There is no pause between them.
 *
 * If no loading screen exists, no hold is ever taken and the gate is just
 * heroReady, which is today's behaviour.
 *
 * A page without the globe never resolves heroReady, so the hero announces
 * itself: the loading screen only waits for heroReady when announceHero has
 * been called by then. The capability gate announces and then immediately
 * marks ready when it declines, since there is nothing to wait for.
 */

type ProgressListener = (progress: number) => void

const progressListeners = new Set<ProgressListener>()
let loadProgress = 0

let resolveReady: () => void
/** Resolves when the globe has fully loaded, compiled and drawn its first
    frame. A loading screen should not begin its exit before this. */
export const heroReady = new Promise<void>((resolve) => {
  resolveReady = resolve
})

const holds = new Set<symbol>()
const holdWaiters: (() => void)[] = []
let announced = false

let resolveRevealed: () => void
/** Resolves the moment the loading screen begins its exit sweep, on every
    route. Anything that wants to enter with the page (the header, section
    reveals) waits on this rather than on the globe. */
export const pageRevealed = new Promise<void>((resolve) => {
  resolveRevealed = resolve
})

/** Called by the loading screen as its exit starts. */
export function markPageRevealed() {
  resolveRevealed()
}

/** Called by the hero as soon as it mounts, before any loading begins, so the
    loading screen knows a globe is coming on this page. */
export function announceHero() {
  announced = true
}

export function heroAnnounced(): boolean {
  return announced
}

/** Current load progress, 0 to 1. For a loading screen that mounts late. */
export function heroLoadProgress(): number {
  return loadProgress
}

/** Called by the globe as its assets arrive. Monotonic, clamped. */
export function reportHeroLoad(progress: number) {
  const next = Math.min(1, Math.max(loadProgress, progress))
  if (next === loadProgress) return
  loadProgress = next
  for (const fn of progressListeners) fn(next)
}

/** Loading screen side: subscribe to load progress. Returns unsubscribe. */
export function onHeroLoad(fn: ProgressListener): () => void {
  progressListeners.add(fn)
  fn(loadProgress)
  return () => progressListeners.delete(fn)
}

/** Called by the globe once it could draw a complete first frame. */
export function markHeroReady() {
  reportHeroLoad(1)
  resolveReady()
}

/** Loading screen side: take a hold on the globe's entrance. Returns the
    release. Safe to call more than once; every hold must be released. */
export function holdHeroEntrance(): () => void {
  const token = Symbol('hero-hold')
  holds.add(token)
  return () => {
    if (!holds.delete(token)) return
    if (holds.size === 0) {
      for (const wake of holdWaiters.splice(0)) wake()
    }
  }
}

/** Globe side: resolves when the scene is ready AND every hold is released.
    The entrance animation waits on this. */
export async function heroEntranceGate(): Promise<void> {
  await heroReady
  while (holds.size > 0) {
    await new Promise<void>((resolve) => holdWaiters.push(resolve))
  }
}
