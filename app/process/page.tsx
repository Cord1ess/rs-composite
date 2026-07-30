import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/sections/PageHeader'
import { Section, cardBase, cardHover } from '@/components/sections/Section'
import { Reveal } from '@/components/ui/Reveal'
import { Icon } from '@/components/icons/Icon'
import { IconCircle } from '@/components/glass/Glass'
import { process } from '@/content/process'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Process',
  description:
    'Eight stages on one site in Narayanganj: knitting, dyeing, cutting, printing, embroidery, sewing, finishing and packing.',
}

export default function ProcessPage() {
  return (
    <>
      <PageHeader
        eyebrow="Process"
        title="Eight stages,"
        accent="one site"
        lead="Nothing leaves for a subcontractor and comes back. Open a stage for what happens in it."
      />

      <Section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {process.map((stage, i) => (
            <Reveal key={stage.slug} delay={(i % 4) * 50} className="h-full">
              <Link
                href={`/process/${stage.slug}`}
                className={cn(cardBase, cardHover, 'group flex h-full flex-col')}
              >
                <IconCircle>
                  <Icon name={stage.icon} size={18} className="text-accent" />
                </IconCircle>
                <span className="mt-5 block text-base font-medium tracking-[-0.02em] text-white">
                  {stage.name}
                </span>
                <span className="mt-2 block flex-1 text-sm leading-relaxed text-white/60">
                  {stage.line}
                </span>
                <span className="mt-5 flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 transition-colors group-hover:text-accent">
                  Open
                  <Icon name="arrow-right" size={14} />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  )
}
