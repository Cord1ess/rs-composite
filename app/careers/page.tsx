import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { Section, cardBase } from '@/components/sections/Section'
import { Reveal } from '@/components/ui/Reveal'
import { Icon } from '@/components/icons/Icon'
import { site } from '@/content/site'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Working at RS Composite in Narayanganj. Send your CV to cv@rscomposite.com.',
}

export default function CareersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title="Driven, skilled,"
        accent="comfortable with how the 21st century works"
        lead="Then we would like to meet you."
      />

      <Section>
        <Reveal>
          <div className={cn(cardBase, 'p-8 sm:p-12')}>
            <p className="max-w-xl text-xl font-medium leading-[1.35] tracking-[-0.03em] text-white sm:text-2xl">
              Send your CV to{' '}
              <em className="font-serif italic text-accent">{site.careersEmail}</em>
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60">
              2,250 people work here, half of them women, most within walking distance. Free
              healthcare, on site childcare and a Workers&rsquo; Participation Committee.
            </p>
            <a
              href={`mailto:${site.careersEmail}`}
              className="group mt-8 inline-flex items-center gap-3 rounded-full bg-accent py-2 pl-7 pr-2 text-sm font-medium text-[#04150c] transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
            >
              Send your CV
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#04150c]/15">
                <Icon name="mail" size={16} />
              </span>
            </a>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
