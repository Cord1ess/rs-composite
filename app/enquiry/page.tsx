import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/sections/PageHeader'
import { Section, cardBase } from '@/components/sections/Section'
import { Reveal } from '@/components/ui/Reveal'
import { Icon } from '@/components/icons/Icon'
import { site } from '@/content/site'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Enquiry',
  description: 'Send RS Composite a tech pack, a quantity and a date.',
}

const asks = [
  { label: 'Tech pack', body: 'The garment, measurements and materials.' },
  { label: 'Quantity', body: 'Pieces per style and colourway.' },
  { label: 'Date', body: 'When it needs to leave the factory.' },
]

export default function EnquiryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Enquiry"
        title="Three things"
        accent="start every programme"
        lead="Send them to the address below. We will come back with the rest."
      />

      <Section>
        <div className="grid gap-3 sm:grid-cols-3">
          {asks.map((ask, i) => (
            <Reveal key={ask.label} delay={i * 60} className="h-full">
              <div className={cn(cardBase, 'h-full p-6')}>
                <p className="text-2xl font-medium tracking-[-0.04em] text-accent">{ask.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{ask.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={160}>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href={`mailto:${site.email}?subject=Enquiry`}
              className="group inline-flex items-center gap-3 rounded-full bg-accent py-2 pl-7 pr-2 text-sm font-medium text-[#04150c] transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
            >
              {site.email}
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#04150c]/15">
                <Icon name="mail" size={16} />
              </span>
            </a>
            <Link
              href="/contact"
              className="glass-surface inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-white/80 transition-transform duration-200 ease-out hover:scale-105 hover:text-white"
            >
              All contact details
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
