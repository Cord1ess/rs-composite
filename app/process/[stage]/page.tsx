import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/sections/PageHeader'
import { Section, cardBase, cardHover } from '@/components/sections/Section'
import { Reveal } from '@/components/ui/Reveal'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Photo } from '@/components/ui/Photo'
import { Icon } from '@/components/icons/Icon'
import { IconCircle } from '@/components/glass/Glass'
import { process } from '@/content/process'
import { cn } from '@/lib/cn'

export function generateStaticParams() {
  return process.map((stage) => ({ stage: stage.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stage: string }>
}): Promise<Metadata> {
  const { stage: slug } = await params
  const stage = process.find((s) => s.slug === slug)
  if (!stage) return {}
  return { title: stage.name, description: stage.line }
}

export default async function StagePage({ params }: { params: Promise<{ stage: string }> }) {
  const { stage: slug } = await params
  const index = process.findIndex((s) => s.slug === slug)
  if (index === -1) notFound()
  const stage = process[index]
  const next = process[(index + 1) % process.length]

  return (
    <>
      <PageHeader eyebrow={`Process / ${stage.name}`} title={stage.name} lead={stage.line} />

      <Section>
        <div className="grid items-stretch gap-3 lg:grid-cols-2 lg:gap-6">
          <Reveal>
            {stage.photo ? (
              <Photo
                src={stage.photo}
                alt={`The ${stage.name.toLowerCase()} floor`}
                className="h-full min-h-[380px]"
              />
            ) : (
              <PhotoPlaceholder label={stage.name} className="h-full min-h-[380px]" />
            )}
          </Reveal>
          <div className="flex flex-col gap-3">
            {stage.points.map((point, i) => (
              <Reveal key={point} delay={i * 50} className="flex-1">
                <div className={cn(cardBase, 'flex h-full items-center gap-4 p-5')}>
                  <IconCircle>
                    <Icon name={stage.icon} size={18} className="text-accent" />
                  </IconCircle>
                  <p className="text-sm leading-relaxed text-white/80 sm:text-base">{point}</p>
                </div>
              </Reveal>
            ))}

            {stage.range ? (
              <Reveal delay={stage.points.length * 50}>
                <div className={cn(cardBase, 'p-5')}>
                  <p className="text-xs uppercase tracking-widest text-white/50">
                    {stage.slug === 'printing' ? 'Print techniques' : 'Knit constructions'}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {stage.range.map((item) => (
                      <li
                        key={item}
                        className="rounded-full bg-white/[0.06] px-4 py-1.5 text-xs text-white/75"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ) : null}
          </div>
        </div>

        <Reveal delay={120}>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/process"
              className="glass-surface group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-white/80 transition-transform duration-200 ease-out hover:scale-105 hover:text-white"
            >
              All stages
            </Link>
            <Link
              href={`/process/${next.slug}`}
              className={cn(cardBase, cardHover, 'group inline-flex items-center gap-3 rounded-full px-5 py-2.5')}
            >
              <span className="text-xs uppercase tracking-widest text-white/40">Next</span>
              <span className="text-sm font-medium text-white">{next.name}</span>
              <Icon name="arrow-right" size={14} className="text-white/40 transition-colors group-hover:text-accent" />
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
