import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { Section, cardBase } from '@/components/sections/Section'
import { Reveal } from '@/components/ui/Reveal'
import { Photo } from '@/components/ui/Photo'
import { utilities, buildings } from '@/content/facility'
import { TourViewer } from '@/components/tour/TourViewer'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Facility',
  description:
    'A 197,263 sq ft knit composite facility in Narayanganj: buildings, utilities and the systems behind them.',
}

export default function FacilityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Facility"
        title="197,263 sq ft,"
        accent="built to work around the clock"
        lead="Every process stage on one site, with the power, water and network to keep it running through anything."
      />

      <div className="px-6 pt-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-3 lg:grid-cols-5">
          {buildings.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 50}>
              <div className="glass-surface card-glow rounded-2xl px-5 py-6">
                <p className="text-2xl font-medium tracking-[-0.04em] text-accent">
                  {stat.figure}
                  {stat.suffix ? <span className="text-white/40">{stat.suffix}</span> : null}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-white/55">{stat.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <Section title="Tour the floor" lead="Look around. The markers show what happens where.">
        <Reveal delay={60}>
          <div className="mt-10">
            <TourViewer />
          </div>
        </Reveal>
      </Section>

      <Section title="Utilities" lead="What the building itself provides.">
        <div className="mt-12 grid items-stretch gap-3 lg:grid-cols-2 lg:gap-6">
          <Reveal>
            <Photo
              src="/photos/entrance.webp"
              alt="The factory entrance walkway with planted courtyard"
              className="h-full"
            />
          </Reveal>
          <div className="flex flex-col gap-3">
            {utilities.map((item, i) => (
              <Reveal key={item.title} delay={i * 40} className="flex-1">
                <div className={cn(cardBase, 'flex h-full items-center justify-between gap-6 p-5')}>
                  <p className="shrink-0 text-sm font-medium tracking-[-0.02em] text-white">
                    {item.title}
                  </p>
                  <p className="text-right text-sm leading-relaxed text-white/60">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>
    </>
  )
}
