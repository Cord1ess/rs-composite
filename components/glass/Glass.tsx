import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * surface  flat translucent, no blur. Default. Use everywhere below the hero.
 * light    backdrop blur 6px.  Hero only.
 * strong   backdrop blur 28px. Primary action and the menu overlay only.
 *
 * The blur tiers are rationed. See the performance contract in globals.css.
 */
export type Tier = 'surface' | 'light' | 'strong'

export function glass(tier: Tier = 'surface') {
  if (tier === 'strong') return 'liquid-glass-strong'
  if (tier === 'light') return 'liquid-glass'
  return 'glass-surface'
}

export function Card({
  tier = 'surface',
  className,
  children,
}: {
  tier?: Tier
  className?: string
  children?: ReactNode
}) {
  return <div className={cn(glass(tier), className)}>{children}</div>
}

/** The circular container the icon set sits inside. */
export function IconCircle({
  size = 'md',
  className,
  children,
}: {
  size?: 'md' | 'sm'
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full transition-colors duration-200',
        size === 'sm' ? 'h-7 w-7 bg-white/15' : 'h-8 w-8 bg-white/10',
        'group-hover:bg-white/20',
        className,
      )}
    >
      {children}
    </span>
  )
}
