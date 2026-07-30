import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/sections/PageHeader'
import { Section, cardBase } from '@/components/sections/Section'
import { Facts } from '@/components/sections/Facts'
import { Reveal } from '@/components/ui/Reveal'
import { Photo } from '@/components/ui/Photo'
import { Icon } from '@/components/icons/Icon'
import { IconCircle } from '@/components/glass/Glass'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'About',
  description:
    'RS Composite has made knitwear in Narayanganj since 1998, one team from yarn to carton.',
}

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="One factory,"
        accent="one team since 1998"
        lead="RS Composite is a knit composite: knitting, dyeing, finishing and garmenting on a single site in Narayanganj, so a buyer deals with one team from yarn to carton."
      />

      <Facts />

      <Section>
        <div className="grid items-stretch gap-3 lg:grid-cols-2 lg:gap-6">
          <Reveal>
            <Photo
              src="/photos/exterior-dusk.webp"
              alt="The factory building at dusk, its garden lit in green"
              className="h-full"
            />
          </Reveal>
          <div className="flex flex-col gap-3">
            <Reveal className="flex-1">
              <div className={cn(cardBase, 'flex h-full flex-col justify-center p-8 lg:p-10')}>
                <p className="max-w-xl text-xl font-medium leading-[1.35] tracking-[-0.03em] text-white sm:text-2xl lg:text-3xl">
                  Built to the US Green Building Council&rsquo;s{' '}
                  <em className="font-serif italic text-accent">Gold standard</em>, in the middle
                  of Bangladesh&rsquo;s knitwear hub.
                </p>
                <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
                  The building harvests rainwater, treats its effluent and raises steam from its
                  own garment waste. 2,250 people work here, half of them women.
                </p>
              </div>
            </Reveal>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Reveal delay={60}>
                <Link href="/facility" className={cn(cardBase, 'group flex items-center gap-3 p-5')}>
                  <IconCircle>
                    <Icon name="factory" size={18} className="text-accent" />
                  </IconCircle>
                  <span className="text-sm font-medium text-white">The facility</span>
                  <Icon name="arrow-right" size={14} className="ml-auto text-white/30 transition-colors group-hover:text-accent" />
                </Link>
              </Reveal>
              <Reveal delay={100}>
                <Link href="/sister-concerns" className={cn(cardBase, 'group flex items-center gap-3 p-5')}>
                  <IconCircle>
                    <Icon name="globe" size={18} className="text-accent" />
                  </IconCircle>
                  <span className="text-sm font-medium text-white">Six group companies</span>
                  <Icon name="arrow-right" size={14} className="ml-auto text-white/30 transition-colors group-hover:text-accent" />
                </Link>
              </Reveal>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
