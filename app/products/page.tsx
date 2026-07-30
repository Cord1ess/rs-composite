import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { Section, cardBase } from '@/components/sections/Section'
import { Reveal } from '@/components/ui/Reveal'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { products } from '@/content/company'
import { fabrics } from '@/content/process'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Ten garment types for men, women and children, knitted in twelve fabric constructions.',
}

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Products"
        title="Ten garment types,"
        accent="for men, women and children"
        lead="1.2 million pieces a month across the range below, in any of twelve knit constructions."
      />

      <Section>
        <div className="grid items-stretch gap-3 lg:grid-cols-2 lg:gap-6">
          <Reveal>
            <PhotoPlaceholder label="Products" className="h-full min-h-[380px]" />
          </Reveal>
          <div className="flex flex-col gap-3">
            <Reveal className="flex-1">
              <div className={cn(cardBase, 'flex h-full flex-col justify-center p-6')}>
                <p className="text-xs uppercase tracking-widest text-white/50">Garments</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {products.map((product) => (
                    <li
                      key={product}
                      className="rounded-full bg-white/[0.06] px-4 py-1.5 text-sm text-white/80"
                    >
                      {product}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={60} className="flex-1">
              <div className={cn(cardBase, 'flex h-full flex-col justify-center p-6')}>
                <p className="text-xs uppercase tracking-widest text-white/50">
                  Knit constructions
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {fabrics.map((fabric) => (
                    <li
                      key={fabric}
                      className="rounded-full bg-white/[0.06] px-4 py-1.5 text-xs text-white/70"
                    >
                      {fabric}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>
    </>
  )
}
