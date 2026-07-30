import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { Section, cardBase } from '@/components/sections/Section'
import { Reveal } from '@/components/ui/Reveal'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Icon } from '@/components/icons/Icon'
import { IconCircle } from '@/components/glass/Glass'
import { site } from '@/content/site'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'RS Composite, Holding No. 890, Shasongaon, Fatullah, Narayanganj-1420, Bangladesh.',
}

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Narayanganj,"
        accent="Bangladesh"
        lead="Send a tech pack, a quantity and a date. We will come back with the rest."
      />

      <Section>
        <div className="grid items-stretch gap-3 lg:grid-cols-2 lg:gap-6">
          <div className="flex flex-col gap-3">
            <Reveal className="flex-1">
              <div className={cn(cardBase, 'flex h-full flex-col justify-center p-8')}>
                <p className="text-xs uppercase tracking-widest text-white/50">Email</p>
                <a
                  href={`mailto:${site.email}`}
                  className="mt-3 text-xl font-medium tracking-[-0.02em] text-white transition-colors hover:text-accent sm:text-2xl"
                >
                  {site.email}
                </a>
                <p className="mt-6 text-xs uppercase tracking-widest text-white/50">Phone</p>
                <ul className="mt-3 space-y-1.5">
                  {site.phones.map((phone) => (
                    <li key={phone}>
                      <a
                        href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                        className="text-base text-white/80 transition-colors hover:text-white"
                      >
                        {phone}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs uppercase tracking-widest text-white/50">Careers</p>
                <a
                  href={`mailto:${site.careersEmail}`}
                  className="mt-3 text-base text-white/80 transition-colors hover:text-white"
                >
                  {site.careersEmail}
                </a>
              </div>
            </Reveal>
            <Reveal delay={60}>
              <div className={cn(cardBase, 'flex items-start gap-4 p-6')}>
                <IconCircle>
                  <Icon name="pin" size={18} className="text-accent" />
                </IconCircle>
                <address className="text-sm not-italic leading-relaxed text-white/70">
                  {site.address.line1}
                  <br />
                  {site.address.line2}
                  <br />
                  {site.address.country}
                </address>
              </div>
            </Reveal>
          </div>
          <Reveal delay={80}>
            <PhotoPlaceholder label="Location" className="h-full min-h-[380px]" />
          </Reveal>
        </div>
      </Section>
    </>
  )
}
