import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { Section, cardBase } from '@/components/sections/Section'
import { Reveal } from '@/components/ui/Reveal'
import { Icon } from '@/components/icons/Icon'
import { IconCircle } from '@/components/glass/Glass'
import { certifications } from '@/content/company'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Certifications',
  description:
    'LEED Gold, amfori BSCI Category A, Sedex 4 Pillar, ISO 9001, OEKO-TEX, GOTS and more, audited by third parties.',
}

export default function CertificationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Certifications"
        title="Ten standards,"
        accent="audited by third parties"
        lead="Renewed on schedule. Certificate numbers and validity dates appear on each entry once supplied."
      />

      <Section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {certifications.map((cert, i) => (
            <Reveal key={cert.name} delay={(i % 3) * 50} className="h-full">
              <div className={cn(cardBase, 'group flex h-full items-start gap-4')}>
                <IconCircle>
                  <Icon name="certificate" size={18} className="text-accent" />
                </IconCircle>
                <div className="min-w-0">
                  <p className="text-base font-medium tracking-[-0.02em] text-white">{cert.name}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60">{cert.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  )
}
