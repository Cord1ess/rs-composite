import { cn } from '@/lib/cn'
import { registry, type IconName } from './registry'

export type { IconName }

type Props = {
  name: IconName
  size?: 14 | 16 | 18 | 20 | 24 | 28 | 32 | 40 | 48
  /** 'hover' runs the motion on parent hover or focus. 'loop' runs it always. */
  animate?: 'hover' | 'loop' | 'none'
  /** Provide only when the icon carries meaning on its own. */
  title?: string
  className?: string
  strokeWidth?: number
}

export function Icon({
  name,
  size = 24,
  animate = 'hover',
  title,
  className,
  strokeWidth = 1.5,
}: Props) {
  const entry = registry[name]
  const Glyph = entry.glyph

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      className={cn('icon shrink-0', className)}
      data-icon={name}
      data-motion={entry.motion === 'none' ? undefined : entry.motion}
      data-animate={animate}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <Glyph />
    </svg>
  )
}
