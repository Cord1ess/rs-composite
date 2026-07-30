import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { Section, cardBase } from '@/components/sections/Section'
import { Reveal } from '@/components/ui/Reveal'
import { Icon } from '@/components/icons/Icon'
import { IconCircle } from '@/components/glass/Glass'
import { sisterConcerns } from '@/content/company'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Sister Concerns',
  description:
    'RS Composite is one of six companies covering knitting, dyeing, finishing and garmenting across Narayanganj.',
}

export default function SisterConcernsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sister Concerns"
        title="Six companies,"
        accent="one group"
        lead="Together they cover knitting, dyeing, finishing and garmenting across Narayanganj."
      />

      <Section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sisterConcerns.map((company, i) => (
            <Reveal key={company.name} delay={(i % 3) * 50} className="h-full">
              <div className={cn(cardBase, 'group h-full')}>
                <IconCircle>
                  <Icon name="factory" size={18} className="text-accent" />
                </IconCircle>
                <p className="mt-5 text-base font-medium leading-snug tracking-[-0.02em] text-white">
                  {company.name}
                </p>
                <dl className="mt-4 space-y-1.5 text-sm text-white/60">
                  {[
                    ['Area', company.area],
                    ['Capacity', company.capacity],
                    ['Location', company.location],
                  ].map(([term, value]) => (
                    <div key={term} className="flex justify-between gap-4">
                      <dt className="shrink-0 text-white/40">{term}</dt>
                      <dd className="text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  )
}
