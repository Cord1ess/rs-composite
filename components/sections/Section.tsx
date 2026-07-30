import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Reveal } from '@/components/ui/Reveal'

export function Section({
  id,
  title,
  lead,
  children,
  className,
}: {
  id?: string
  title?: string
  lead?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      className={cn('defer-paint px-6 py-20 sm:px-8 lg:px-12 lg:py-28', className)}
    >
      <div className="mx-auto max-w-[1400px]">
        {title ? (
          <Reveal className="max-w-3xl">
            <h2 className="text-3xl font-medium tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              {title}
            </h2>
            {lead ? (
              <div className="mt-5 text-base leading-relaxed text-white/60">{lead}</div>
            ) : null}
          </Reveal>
        ) : null}
        {children}
      </div>
    </section>
  )
}

/** Shared card chrome. Translate on hover, never scale, so the mask is not
    re-rastered. card-glow adds the cursor following border light. */
export const cardBase =
  'glass-surface card-glow rounded-3xl p-6 transition-[transform,background-color] duration-200 ease-out'
export const cardHover = 'hover:-translate-y-0.5 hover:bg-white/[0.06]'
