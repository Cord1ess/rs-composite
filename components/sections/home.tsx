import Link from 'next/link'
import { Section, cardBase, cardHover } from './Section'
import { Reveal } from '@/components/ui/Reveal'
import { Icon, type IconName } from '@/components/icons/Icon'
import { IconCircle } from '@/components/glass/Glass'
import { Logo } from '@/components/brand/Logo'
import { cn } from '@/lib/cn'
import { site } from '@/content/site'
import { process } from '@/content/process'
import { environment } from '@/content/environment'
import { sisterConcerns, certifications } from '@/content/company'
import { navGroups } from '@/components/nav/nav-items'
import { TourViewer } from '@/components/tour/TourViewer'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Photo } from '@/components/ui/Photo'

/*
  The image sections share one layout: photo on one side, content on the
  other, sides alternating down the page. The photo column is a placeholder
  until the factory shoot arrives; the content columns are designed to its
  height so the swap is a file drop, not a redesign.
*/
const mediaGrid = 'mt-12 grid items-stretch gap-3 lg:grid-cols-2 lg:gap-6'

/*
  The homepage body, matched to the hero: one claim per section, numbers and
  emphasis in the accent green, prose cut to a sentence. Anything that was a
  paragraph of capability copy either became data or moved to the page that
  demonstrates it.
*/

/* -------------------------------------------------------- introduction */

export function Introduction() {
  return (
    <Section id="introduction" className="pt-20 lg:pt-28">
      <Reveal>
        <p className="max-w-4xl text-2xl font-medium leading-[1.3] tracking-[-0.035em] text-white sm:text-3xl lg:text-4xl">
          Built to the US Green Building Council&rsquo;s{' '}
          <em className="font-serif italic text-accent">Gold standard</em>, in the middle of
          Bangladesh&rsquo;s knitwear hub.
        </p>
      </Reveal>
      <Reveal delay={80}>
        <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/60">
          One site since 1998. Knitting, dyeing, finishing and garmenting under one roof, so a
          buyer deals with one team from yarn to carton.
        </p>
      </Reveal>
    </Section>
  )
}

/* ---------------------------------------------------------- environment */

export function EnvironmentSection() {
  return (
    <Section
      id="environment"
      title="Environment"
      lead="Rainwater is harvested, effluent is treated before it returns to nature and the boiler burns the factory's own garment waste."
    >
      <div className={mediaGrid}>
        <Reveal className="lg:order-2">
          <Photo
            src="/photos/garden-break.webp"
            alt="Workers resting in the factory garden beside the water channel"
            className="h-full"
          />
        </Reveal>
        <div className="flex flex-col gap-3 lg:order-1">
          {environment.map((item, i) => (
            <Reveal key={item.title} delay={i * 50} className="flex-1">
              <div className={cn(cardBase, 'group flex h-full items-start gap-4 p-5')}>
                <IconCircle>
                  <Icon name={item.icon} size={18} className="text-accent" />
                </IconCircle>
                <div>
                  <p className="text-base font-medium tracking-[-0.02em] text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/60">{item.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* -------------------------------------------------------------- process */

export function ProcessSection() {
  return (
    <Section
      id="process"
      title="Process"
      lead="Eight stages, one site. Nothing leaves for a subcontractor and comes back."
    >
      <div className={mediaGrid}>
        <Reveal>
          <Photo
            src="/photos/knitting.webp"
            alt="Circular knitting machines with yarn creels on the knitting floor"
            className="h-full"
          />
        </Reveal>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {process.map((stage, i) => (
            <Reveal key={stage.slug} delay={(i % 2) * 50} className="h-full">
              <Link
                href={`/process/${stage.slug}`}
                className={cn(cardBase, cardHover, 'group flex h-full items-center gap-3 p-4')}
              >
                <IconCircle>
                  <Icon name={stage.icon} size={18} className="text-accent" />
                </IconCircle>
                <span className="text-sm font-medium tracking-[-0.02em] text-white">
                  {stage.name}
                </span>
                <Icon
                  name="arrow-right"
                  size={14}
                  className="ml-auto text-white/30 transition-colors group-hover:text-accent"
                />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ----------------------------------------------------------------- tour */

export function TourFacility() {
  return (
    <Section
      id="tour"
      title="Tour the facility"
      lead="Look around the floor. The markers show what happens where."
    >
      <Reveal delay={60}>
        <div className="mt-10">
          <TourViewer />
        </div>
      </Reveal>
    </Section>
  )
}

/* -------------------------------------------------------------- quality */

export function Quality() {
  return (
    <Section id="quality" title="Quality">
      <div className={mediaGrid}>
        <Reveal className="lg:order-2">
          <Photo
            src="/photos/sewing.webp"
            alt="Sewing lines running at full length with in line quality checks"
            className="h-full"
          />
        </Reveal>
        <div className="flex flex-col gap-3 lg:order-1">
          <Reveal className="flex-1">
            <div className={cn(cardBase, 'flex h-full flex-col justify-center p-8 lg:p-10')}>
              <Icon name="audit" size={32} className="text-accent" />
              <p className="mt-7 max-w-xl text-xl font-medium leading-[1.35] tracking-[-0.03em] text-white sm:text-2xl lg:text-3xl">
                Every roll of fabric passes a{' '}
                <em className="font-serif italic text-accent">4 Point inspection</em> before it
                becomes a garment.
              </p>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
                A quality team follows the product from knitting to packing, and buyers review it
                live on the floor over video.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 gap-3">
            <Reveal delay={60}>
              <div className={cn(cardBase, 'p-5')}>
                <p className="text-2xl font-medium tracking-[-0.04em] text-accent sm:text-3xl">
                  4 Point
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  Fabric checking, yard by yard.
                </p>
              </div>
            </Reveal>
            <Reveal delay={110}>
              <div className={cn(cardBase, 'p-5')}>
                <p className="text-2xl font-medium tracking-[-0.04em] text-accent sm:text-3xl">
                  CT-PAT
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  Packing and shipping rules.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* --------------------------------------------------------------- people */

const welfare: { icon: IconName; title: string; body: string }[] = [
  { icon: 'healthcare', title: 'Healthcare', body: 'Free care and medicines for every worker.' },
  { icon: 'childcare', title: 'Childcare', body: 'On site, so parents can work at ease.' },
  { icon: 'fire-safety', title: 'Fire safety', body: 'Alarms, exits, pumps and regular drills.' },
  { icon: 'walk', title: 'Walk to work', body: 'Most of the workforce lives nearby.' },
]

export function People() {
  return (
    <Section id="people" title="People" lead="2,250 people, half of them women.">
      <div className={mediaGrid}>
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
          <div className="grid grid-cols-2 gap-3">
            {welfare.map((item, i) => (
              <Reveal key={item.title} delay={(i % 2) * 60} className="h-full">
                <div className={cn(cardBase, 'group flex h-full items-center gap-3 p-4')}>
                  <IconCircle>
                    <Icon name={item.icon} size={18} className="text-accent" />
                  </IconCircle>
                  <p className="text-sm font-medium tracking-[-0.02em] text-white">{item.title}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ---------------------------------------------------------------- quote */

export function Quote() {
  return (
    <section className="defer-paint px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <figure className="mx-auto max-w-3xl text-center">
            <p className="text-xs uppercase tracking-widest text-white/50">USGBC Gold Certified</p>
            <blockquote className="mt-7 text-3xl font-medium leading-[1.25] tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              From start to finish,{' '}
              <em className="font-serif italic text-accent">quality is uncompromised.</em>
            </blockquote>
            <figcaption className="mt-8 flex items-center justify-center gap-4">
              <span className="h-px w-12 bg-white/20" />
              <span className="text-xs uppercase tracking-widest text-white/50">
                Md. Morshed Sarwar
              </span>
              <span className="h-px w-12 bg-white/20" />
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  )
}

/* -------------------------------------------------------- certifications */

export function CertificationsSection() {
  return (
    <Section
      id="certifications"
      title="Certifications"
      lead="Audited by third parties and renewed on schedule."
    >
      <div className={mediaGrid}>
        <Reveal className="lg:order-2">
          <PhotoPlaceholder label="Certifications" className="h-full" />
        </Reveal>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:order-1">
          {certifications.map((cert, i) => (
            <Reveal key={cert.name} delay={(i % 2) * 40} className="h-full">
              <div className={cn(cardBase, 'group flex h-full items-start gap-3 p-4')}>
                <IconCircle>
                  <Icon name="certificate" size={16} className="text-accent" />
                </IconCircle>
                <div className="min-w-0">
                  <p className="text-sm font-medium tracking-[-0.02em] text-white">{cert.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/55">{cert.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------ sister concerns */

export function SisterConcerns() {
  return (
    <Section
      id="sister-concerns"
      title="Sister Concerns"
      lead="Six companies covering knitting, dyeing, finishing and garmenting across Narayanganj."
    >
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sisterConcerns.map((company, i) => (
          <Reveal key={company.name} delay={(i % 3) * 50} className="h-full">
            <div className={cn(cardBase, 'group h-full')}>
              <IconCircle>
                <Icon name="factory" size={18} className="text-accent" />
              </IconCircle>
              <p className="mt-5 text-base font-medium leading-snug tracking-[-0.02em] text-white">
                {company.name}
              </p>
              <dl className="mt-4 space-y-1.5 text-sm text-white/60">
                {[
                  ['Capacity', company.capacity],
                  ['Location', company.location],
                ].map(([term, value]) => (
                  <div key={term} className="flex justify-between gap-4">
                    <dt className="text-white/40">{term}</dt>
                    <dd className="text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

/* --------------------------------------------------------------- footer */

export function Footer() {
  return (
    <footer className="defer-paint px-4 pb-8 pt-4 sm:px-6 lg:px-10">
      {/*
        One glass panel, the same language as the header pill and the hero
        buttons, closing the page the way the hero opened it. It also carries
        the contact call, so the page ends on the action rather than on
        boilerplate.
      */}
      <div className="ring-glass relative mx-auto max-w-[1400px] overflow-hidden rounded-[2.5rem] bg-white/[0.02] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
        {/* A soft bloom of the atmosphere green, echoing the planet. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
        />

        <div className="relative p-8 sm:p-12 lg:p-16">
          <Reveal>
            <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/60">RS Composite</p>
                <h2 className="mt-4 max-w-xl text-3xl font-medium tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                  Tell us what you need{' '}
                  <em className="font-serif italic text-accent">made</em>
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-white/60">
                  Send a tech pack, a quantity and a date.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/contact"
                  className="group inline-flex items-center gap-3 rounded-full bg-accent py-2 pl-7 pr-2 text-sm font-medium text-[#201503] transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
                >
                  Contact us
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#201503]/15">
                    <Icon name="arrow-right" size={16} />
                  </span>
                </Link>
                <a
                  href={`mailto:${site.email}`}
                  className="text-sm text-white/60 transition-colors hover:text-white"
                >
                  {site.email}
                </a>
              </div>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-10 border-t border-white/10 pt-10 sm:grid-cols-2 lg:grid-cols-4">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="text-xs uppercase tracking-widest text-white/50">{group.label}</p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="group inline-flex items-center gap-2 text-white/60 transition-colors hover:text-white"
                      >
                        <span
                          aria-hidden
                          className="h-1 w-1 rounded-full bg-accent/0 transition-colors duration-150 group-hover:bg-accent"
                        />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <p className="text-xs uppercase tracking-widest text-white/50">Contact</p>
              <address className="mt-4 text-sm not-italic leading-relaxed text-white/60">
                {site.address.line1}
                <br />
                {site.address.line2}
                <br />
                {site.address.country}
              </address>
              <ul className="mt-4 space-y-2 text-sm text-white/60">
                <li>
                  <a href={`mailto:${site.email}`} className="transition-colors hover:text-white">
                    {site.email}
                  </a>
                </li>
                {site.phones.map((phone) => (
                  <li key={phone}>
                    <a
                      href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                      className="transition-colors hover:text-white"
                    >
                      {phone}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-7 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-3">
              <Logo size={20} />
              &copy; 2026 RS Composite. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              {site.socials.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="text-white/60 transition-colors hover:text-accent"
                >
                  <Icon name={social.icon} size={18} />
                </a>
              ))}
              <Link href="/privacy" className="transition-colors hover:text-white">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
