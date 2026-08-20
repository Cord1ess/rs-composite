'use client'

import { useEffect, useRef, useState } from 'react'
import { facts } from '@/content/facts'
import { observeOnce } from '@/lib/observe'

function useCountUp(target: number | undefined, active: boolean) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active || target === undefined) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    const duration = 900
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, active])

  return value
}

function Figure({ fact, active }: { fact: (typeof facts)[number]; active: boolean }) {
  const counted = useCountUp(fact.count, active)
  const display =
    fact.count === undefined ? fact.value : active ? counted.toLocaleString('en-US') : '0'

  return (
    <div className="glass-surface card-glow rounded-2xl px-5 py-6">
      <p className="text-2xl font-medium tracking-[-0.04em] text-accent">
        {display}
        {fact.suffix ? <span className="text-white/40">{fact.suffix}</span> : null}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-white/55">{fact.label}</p>
    </div>
  )
}

export function Facts() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return observeOnce(el, () => setActive(true))
  }, [])

  return (
    /* One snap stop with the Introduction beneath it: the stats band and the
       claim share a screen in the section scrolling. */
    <div data-snap className="px-6 pt-20 sm:px-8 lg:px-12 lg:pt-24">
      <div ref={ref} className="mx-auto grid max-w-[1400px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {facts.map((fact) => (
          <Figure key={fact.label} fact={fact} active={active} />
        ))}
      </div>
    </div>
  )
}
