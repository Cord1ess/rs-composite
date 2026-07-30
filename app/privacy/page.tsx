import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { Section, cardBase } from '@/components/sections/Section'
import { Reveal } from '@/components/ui/Reveal'
import { site } from '@/content/site'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What this site collects and what it does not.',
}

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy"
        title="What this site collects"
        lead="Short, because there is little to say."
      />

      <Section>
        <Reveal>
          <div className={cn(cardBase, 'max-w-3xl p-8 sm:p-10')}>
            <div className="space-y-5 text-sm leading-relaxed text-white/70 sm:text-base">
              <p>
                This site sets no advertising trackers and runs no third party analytics. It
                serves pages and assets from its own host.
              </p>
              <p>
                If you email {site.email} or {site.careersEmail}, we receive what you send and use
                it to reply. CVs are read for hiring and kept no longer than that requires.
              </p>
              <p>
                Questions about either can go to the same addresses.
              </p>
            </div>
            <p className="mt-8 text-xs text-white/40">
              This page states current practice and is not a substitute for legal review.
            </p>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
