import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { Section, cardBase } from '@/components/sections/Section'
import { Reveal } from '@/components/ui/Reveal'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Photo } from '@/components/ui/Photo'
import { Icon, type IconName } from '@/components/icons/Icon'
import { IconCircle } from '@/components/glass/Glass'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'People',
  description:
    '2,250 people, half of them women. Free healthcare, on site childcare and fire safety that is trained for rather than assumed.',
}

const welfare: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'healthcare',
    title: 'Healthcare',
    body: 'Free healthcare and medicines for every worker.',
  },
  {
    icon: 'childcare',
    title: 'Childcare',
    body: 'On site, so parents can work without dividing their attention.',
  },
  {
    icon: 'temperature',
    title: 'Comfort',
    body: 'Drinking water, industrial ventilation and a whole floor for lunch and tea.',
  },
  {
    icon: 'audit',
    title: 'Representation',
    body: "A Workers' Participation Committee, local labour law and ILO standards.",
  },
]

const safety = [
  'Water hoses and auto water pumps',
  'Emergency lamps and a public address system',
  'Alarm sirens',
  'Dedicated fire exits and staircases',
  'Regular training for occupational hazards',
]

export default function PeoplePage() {
  return (
    <>
      <PageHeader
        eyebrow="People"
        title="2,250 people,"
        accent="half of them women"
        lead="Most of the workforce walks to work. What the factory provides in return is below, in plain terms."
      />

      <Section>
        <div className="grid items-stretch gap-3 lg:grid-cols-2 lg:gap-6">
          <Reveal>
            <Photo
              src="/photos/workers.webp"
              alt="Two workers taking a photo together in the factory garden"
              className="h-full"
            />
          </Reveal>
          <div className="flex flex-col gap-3">
            <Reveal className="flex-1">
              <div className={cn(cardBase, 'flex h-full flex-col justify-center p-8 lg:p-10')}>
                <p className="text-5xl font-medium tracking-[-0.05em] text-accent sm:text-6xl">
                  50/50
                </p>
                <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60 sm:text-base">
                  1,125 women and 1,125 men. A fact about the factory, not a target.
                </p>
              </div>
            </Reveal>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {welfare.map((item, i) => (
                <Reveal key={item.title} delay={(i % 2) * 50} className="h-full">
                  <div className={cn(cardBase, 'group h-full p-5')}>
                    <IconCircle>
                      <Icon name={item.icon} size={18} className="text-accent" />
                    </IconCircle>
                    <p className="mt-4 text-sm font-medium tracking-[-0.02em] text-white">
                      {item.title}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/60">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Fire safety" lead="Trained for rather than assumed.">
        <div className="mt-12 grid items-stretch gap-3 lg:grid-cols-2 lg:gap-6">
          <div className="flex flex-col gap-3">
            {safety.map((item, i) => (
              <Reveal key={item} delay={i * 40} className="flex-1">
                <div className={cn(cardBase, 'flex h-full items-center gap-4 p-5')}>
                  <IconCircle>
                    <Icon name="fire-safety" size={18} className="text-accent" />
                  </IconCircle>
                  <p className="text-sm leading-relaxed text-white/80">{item}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="lg:order-first" delay={60}>
            <PhotoPlaceholder label="Safety" className="h-full" />
          </Reveal>
        </div>
      </Section>
    </>
  )
}
