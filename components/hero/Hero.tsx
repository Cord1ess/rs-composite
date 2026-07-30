import type { CSSProperties } from 'react'
import Link from 'next/link'
import { HeroStage } from './HeroStage'
import { GlobeField } from '@/components/globe/GlobeField'
import { Icon } from '@/components/icons/Icon'
import { IconCircle } from '@/components/glass/Glass'

const enter = (ms: number) => ({ '--enter-delay': `${ms}ms` }) as CSSProperties

/*
  Deliberately sparse. The hero is the planet, one claim and two actions; the
  quick link dock and the process pills that used to sit here are gone, since
  everything they linked to lives in the header's submenus. Their capability
  copy belongs to the sections that show it.
*/

const customerStats = [
  { value: '5', label: 'export markets' },
  { value: '1.2M', label: 'pieces a month' },
  { value: '10', label: 'garment types' },
]

const customerCountries = ['Poland', 'France', 'United Kingdom', 'Netherlands', 'United States']

export function Hero() {
  return (
    <HeroStage>
      <div className="hero-base absolute inset-0 z-0" />
      <GlobeField />
      <div className="hero-scrim pointer-events-none absolute inset-0 z-[2]" />

      <div className="pointer-events-none relative z-10 mx-auto flex h-full w-full max-w-[1400px] flex-col px-6 pb-8 pt-[var(--header-h)] sm:px-8 lg:px-12">
        <div className="hero-copy flex flex-1 flex-col justify-start py-6 sm:justify-center sm:py-14 lg:max-w-xl lg:py-20 xl:max-w-2xl">
          <p
            className="text-xs uppercase tracking-widest text-white/60"
            data-enter
            style={enter(0)}
          >
            Narayanganj, Bangladesh
          </p>

          <h1
            className="mt-4 text-[2.35rem] font-medium leading-[1.05] tracking-[-0.05em] text-white sm:mt-6 sm:text-6xl lg:text-[4rem] xl:text-[4.5rem]"
            data-enter
            style={enter(60)}
          >
            RS Composite
            <br />
            <em className="font-serif italic text-accent">
              a USGBC LEED Gold certified factory
            </em>
          </h1>

          <p
            className="mt-5 max-w-md text-sm leading-relaxed text-white/70 sm:mt-8 sm:text-base"
            data-enter
            style={enter(120)}
          >
            Knitwear made from yarn to carton, under one roof, for retailers on two continents.
          </p>

          <div
            className="pointer-events-auto mt-7 flex flex-wrap items-center gap-3 sm:mt-10"
            data-enter
            style={enter(180)}
          >
            <Link
              href="/facility"
              className="liquid-glass-strong group inline-flex items-center gap-3 rounded-full py-2 pl-7 pr-2 text-sm text-white transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
            >
              See the Facility
              <IconCircle size="sm">
                <Icon name="arrow-right" size={16} />
              </IconCircle>
            </Link>
            <Link
              href="/contact"
              className="glass-surface group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm text-white/85 transition-transform duration-200 ease-out hover:scale-105 hover:text-white"
            >
              <Icon name="mail" size={18} />
              Contact us
            </Link>
          </div>
        </div>

        {/*
          The customers, replacing the old caption once the globe has pulled
          back. Numbers and countries, almost no prose: the globe alongside is
          already telling the story with its markers and arcs.
        */}
        <div className="hero-network pointer-events-none absolute inset-x-6 top-[16%] sm:inset-x-8 lg:inset-x-12 lg:top-1/2 lg:max-w-md lg:-translate-y-1/2">
          <p className="text-xs uppercase tracking-widest text-white/60">Customers</p>

          <dl className="mt-6 flex gap-10">
            {customerStats.map((stat) => (
              <div key={stat.label}>
                <dd className="text-3xl font-medium tracking-[-0.04em] text-accent lg:text-4xl">
                  {stat.value}
                </dd>
                <dt className="mt-1 text-xs text-white/60">{stat.label}</dt>
              </div>
            ))}
          </dl>

          <ul className="mt-7 flex max-w-sm flex-wrap gap-x-5 gap-y-2">
            {customerCountries.map((country) => (
              <li key={country} className="flex items-center gap-2 text-sm text-white/80">
                <span className="h-1 w-1 rounded-full bg-accent" aria-hidden />
                {country}
              </li>
            ))}
          </ul>

          <Link
            href="/contact"
            className="glass-surface group pointer-events-auto mt-8 inline-flex items-center gap-3 rounded-full py-2 pl-6 pr-2 text-sm text-white transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
          >
            Contact us
            <IconCircle size="sm">
              <Icon name="arrow-right" size={16} />
            </IconCircle>
          </Link>
        </div>
      </div>
    </HeroStage>
  )
}
