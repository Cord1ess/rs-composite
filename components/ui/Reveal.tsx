'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { observeOnce } from '@/lib/observe'

export function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return observeOnce(el, () => setShown(true))
  }, [])

  return (
    <div
      ref={ref}
      data-reveal={shown ? 'shown' : ''}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
      className={cn(className)}
    >
      {children}
    </div>
  )
}
