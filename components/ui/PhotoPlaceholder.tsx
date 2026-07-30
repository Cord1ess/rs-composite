import { cn } from '@/lib/cn'
import { Icon } from '@/components/icons/Icon'

/*
  Where a factory photo will sit. Deliberately designed rather than empty: a
  faint diagonal weave, a breath of the accent green and a quiet label, so the
  page looks composed before the shoot exists. When the images arrive each of
  these becomes an <Image> with the same radius and the sections around them
  do not move.
*/
export function PhotoPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        'ring-glass relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[2rem] bg-white/[0.02]',
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 14px)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl"
      />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
          <Icon name="factory" size={20} className="text-accent" />
        </span>
        <p className="text-[0.65rem] uppercase tracking-[0.25em] text-white/35">{label} photo</p>
      </div>
    </div>
  )
}
