'use client'

import { useEffect, useState } from 'react'
import {
  heroAnnounced,
  heroLoadProgress,
  heroReady,
  holdHeroEntrance,
  markPageRevealed,
  onHeroLoad,
} from '@/lib/hero-loader'

/*
  The global loading screen. Covers every route from the first paint, streams
  the globe's real download progress and leaves by sliding up.

  The exit and the globe's entrance are simultaneous by construction: the hold
  on the hero entrance is released in the same call that starts the slide, so
  the planet begins rising behind the curtain as the curtain lifts. Nothing
  waits for anything else once everything has loaded.

  What "everything has loaded" means here: the document load event, the fonts,
  and, when a globe announced itself on this page, the globe's first fully
  rendered frame. A failsafe cap means a broken asset can delay the site by a
  few seconds at worst, never trap it.
*/

/** The loader never shows for less than this, so a cached visit gets a clean
    sweep instead of a flash. */
const MIN_SHOWN = 800
/** Failsafe: never hold the page hostage if an asset dies. */
const MAX_WAIT = 8000
/*
  How long after the slide starts the hero entrance is released.

  Both animations used to start in the same tick, and the planet was most of
  the way up before the curtain's edge had even reached its part of the
  screen, so the rise went unseen. The curtain takes about 470 ms to clear the
  planet's limb; releasing at 350 means the rise is barely a tenth in when its
  region comes into view, so the visitor watches nearly all of it.
*/
const RELEASE_DELAY = 350

export function LoadingScreen() {
  const [progress, setProgress] = useState(heroLoadProgress)
  const [phase, setPhase] = useState<'loading' | 'exit' | 'done'>('loading')

  useEffect(() => {
    const release = holdHeroEntrance()
    const unsubscribe = onHeroLoad(setProgress)
    let cancelled = false

    /* The layout script has already switched scroll restoration to manual;
       make the position match the promise the curtain makes. Restoration goes
       back to the browser once the loader is gone. */
    window.scrollTo(0, 0)

    const started = performance.now()
    const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

    const run = async () => {
      await new Promise<void>((resolve) => {
        if (document.readyState === 'complete') resolve()
        else window.addEventListener('load', () => resolve(), { once: true })
      })
      await document.fonts.ready.catch(() => undefined)
      /* One beat for hydration, so a globe page has announced itself. */
      await wait(80)
      if (heroAnnounced()) {
        await Promise.race([heroReady, wait(MAX_WAIT)])
      }
      const elapsed = performance.now() - started
      if (elapsed < MIN_SHOWN) await wait(MIN_SHOWN - elapsed)
    }

    let releaseTimer = 0
    void run().then(() => {
      if (cancelled) return
      /* The slide starts now; the planet is released a beat later so its rise
         happens where the visitor can see it. See RELEASE_DELAY. */
      setPhase('exit')
      markPageRevealed()
      releaseTimer = window.setTimeout(release, RELEASE_DELAY)
    })

    return () => {
      cancelled = true
      unsubscribe()
      window.clearTimeout(releaseTimer)
      release()
    }
  }, [])

  /* The page under the loader must not scroll while it is covered, or the
     hero sequence would already be mid-flight when revealed. */
  useEffect(() => {
    if (phase !== 'loading') return
    const html = document.documentElement
    const previous = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = previous
    }
  }, [phase])

  /* Reduced motion gets no transition, so transitionend never fires; the
     timer settles it either way. */
  useEffect(() => {
    if (phase !== 'exit') return
    const timer = window.setTimeout(() => setPhase('done'), 1000)
    return () => window.clearTimeout(timer)
  }, [phase])

  /* The loader is gone; scrolling belongs to the browser again. */
  useEffect(() => {
    if (phase !== 'done') return
    try {
      history.scrollRestoration = 'auto'
    } catch {
      /* Nothing to hand back on browsers without the API. */
    }
  }, [phase])

  if (phase === 'done') return null

  const percent = Math.round(progress * 100)

  return (
    /*
      The curtain is the 100svh body plus a feathered arc hanging below it,
      off screen while covering. On exit the whole assembly travels 125% of
      its height, so what sweeps past the visitor is never a hard rectangle
      edge: it is the arc, bulging at the centre, dissolving over its last
      stretch. The corners recede first, the middle trails, and the soft
      gradient means there is no line at any moment of the sweep.
    */
    <div
      aria-hidden={phase === 'exit'}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget) setPhase('done')
      }}
      className={`site-loader fixed inset-x-0 top-0 z-[100] flex h-[100svh] flex-col items-center justify-center bg-[#050807] transition-transform duration-[850ms] ease-[cubic-bezier(0.65,0,0.35,1)] will-change-transform motion-reduce:transition-none ${
        phase === 'exit' ? '-translate-y-[140%]' : 'translate-y-0'
      }`}
    >
      {/* Without JavaScript nothing can ever dismiss this, so it never shows. */}
      <noscript>
        <style>{'.site-loader{display:none}'}</style>
      </noscript>

      {/*
        The trailing edge: a deep elliptical bulge in the curtain's own colour.
        Mostly solid so the round silhouette actually reads, with a tight
        feather over the last stretch so the edge stays soft. The corners
        recede first, the centre trails.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-full h-[32svh] w-full"
        style={{
          background:
            'radial-gradient(105% 100% at 50% 0%, #050807 72%, rgba(5, 8, 7, 0.85) 82%, rgba(5, 8, 7, 0) 96%)',
        }}
      />

      <p className="text-lg font-medium tracking-[-0.03em] text-white">
        RSComposite
        <span className="mt-1 block text-center text-[0.6rem] uppercase tracking-[0.3em] text-white/40">
          Narayanganj, Bangladesh
        </span>
      </p>

      {/* scaleX, not width: a width transition relayouts on every frame of the
          bar's movement, and this screen exists at the busiest moment the main
          thread will ever see. A transform never leaves the compositor. */}
      <div className="mt-10 h-px w-44 overflow-hidden bg-white/10">
        <div
          className="h-full w-full origin-left bg-accent transition-transform duration-300 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <p className="mt-3 text-[0.65rem] tabular-nums tracking-[0.2em] text-white/40">{percent}</p>
    </div>
  )
}
