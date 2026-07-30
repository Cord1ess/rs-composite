import { cn } from '@/lib/cn'

/**
 * PLACEHOLDER MARK.
 * Stands in until the client supplies a monochrome logo. Drawn as interlocking
 * knit loops so it reads as knitwear rather than as a generic monogram, on the
 * same 24px grid and 1.5 stroke as the icon set.
 * Tracked as a blocker in docs/11-open-questions.md.
 */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1.6" y="1.6" width="20.8" height="20.8" rx="6.4" opacity="0.45" />
      <path d="M7.4 17.2V9.6c0-2 1.1-3.2 2.6-3.2s2.6 1.2 2.6 3.2-1.1 3.2-2.6 3.2" />
      <path d="M16.6 6.8c-1.7-0.6-3.1 0.1-3.1 1.7 0 2.4 3.4 2 3.4 4.6 0 1.7-1.5 2.5-3.3 1.9" />
      <path d="M10 12.8l2.7 4.4" />
    </svg>
  )
}
