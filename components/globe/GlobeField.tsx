'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { announceHero, markHeroReady } from '@/lib/hero-loader'

/*
  The hero backdrop. Full bleed: the star field fills the whole section and the
  planet is cropped by the bottom of the viewport.

  The flat SVG globe that used to sit underneath is gone entirely, along with
  its hotspot layer and the file it was generated into. What is left is one
  canvas.

  That removes the safety net, so the gate below is narrower than it was. It no
  longer excludes phones, because there is nothing else for them to fall back
  to. What still fails is data saver, a slow connection, two cores or no WebGL,
  and those see the plain dark hero.
*/

const Earth3D = dynamic(() => import('./Earth3D'), { ssr: false })

type Connection = { saveData?: boolean; effectiveType?: string }

function probe() {
  const conn = (navigator as Navigator & { connection?: Connection }).connection
  if (conn?.saveData) return null
  if (conn?.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)) return null
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return null

  try {
    const canvas = document.createElement('canvas')
    if (!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))) return null
  } catch {
    return null
  }

  /*
    The globe animates unconditionally, an owner decision (2026-08-19), and a
    considered one: this flag used to follow prefers-reduced-motion, and on
    Windows the "performance mode" power setting turns system animation
    effects off, which browsers report as reduce. That froze the planet, the
    tour and the clouds for a large slice of ordinary laptops, including the
    owner's, and a dead centrepiece is not a reduced experience of this site,
    it is a broken one. Small UI animation (counters, icons) still honours
    the flag.
  */
  return { motion: true }
}

export function GlobeField() {
  const [config, setConfig] = useState<{ motion: boolean } | null>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    announceHero()
    const result = probe()
    if (!result) {
      /* No globe on this device. The baked entry frame stands in, so the
         first impression is the same composition, just still. Tell the
         loading screen there is nothing to wait for. */
      setFallback(true)
      markHeroReady()
      return
    }

    const schedule =
      window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 250))
    const id = schedule(() => setConfig(result))

    return () => {
      if (window.cancelIdleCallback && typeof id === 'number') window.cancelIdleCallback(id)
    }
  }, [])

  if (fallback) {
    return (
      <div
        aria-hidden
        className="absolute inset-0 z-[1] bg-cover bg-center"
        style={{ backgroundImage: "url('/textures/hero-fallback.webp')" }}
      />
    )
  }

  if (!config) return null

  return (
    <div className="absolute inset-0 z-[1]">
      {/* onFail: a terminal scene error (assets, shaders, worker) swaps the
          canvas for the same static fallback the capability gate uses. */}
      <Earth3D motion={config.motion} onFail={() => setFallback(true)} />
    </div>
  )
}
