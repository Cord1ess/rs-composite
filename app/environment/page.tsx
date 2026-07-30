import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { Section, cardBase } from '@/components/sections/Section'
import { Reveal } from '@/components/ui/Reveal'
import { Photo } from '@/components/ui/Photo'
import { Icon } from '@/components/icons/Icon'
import { IconCircle } from '@/components/glass/Glass'
import { environment } from '@/content/environment'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Environment',
  description:
    'USGBC LEED Gold certified: rainwater harvesting, effluent treatment, a waste fired boiler and daylight doing the work of lighting.',
}

export default function EnvironmentPage() {
  return (
    <>
      <PageHeader
        eyebrow="Environment"
        title="Most factories add it later."
        accent="This one was built around it"
        lead="USGBC LEED Gold certified. Rainwater is harvested, effluent is treated before it returns to nature and the boiler burns the factory's own garment waste."
      />

      <Section>
        <div className="grid items-stretch gap-3 lg:grid-cols-2 lg:gap-6">
          <Reveal>
            <Photo
              src="/photos/exterior-dusk.webp"
              alt="The factory building at dusk, its garden lit in green"
              className="h-full min-h-[420px]"
            />
          </Reveal>
          <Reveal delay={60}>
            <Photo
              src="/photos/garden-break.webp"
              alt="Workers resting in the factory garden beside the water channel"
              className="h-full min-h-[420px]"
            />
          </Reveal>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {environment.map((item, i) => (
            <Reveal key={item.title} delay={(i % 4) * 50} className="h-full">
              <div className={cn(cardBase, 'group h-full')}>
                <IconCircle>
                  <Icon name={item.icon} size={18} className="text-accent" />
                </IconCircle>
                <p className="mt-5 text-base font-medium tracking-[-0.02em] text-white">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  )
}
