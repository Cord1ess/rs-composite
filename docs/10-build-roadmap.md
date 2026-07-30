# 10. Build Roadmap

Nothing starts without a greenlight.

## Foundation

A running Next.js app with the design system installed and proven.

- Next.js 15 App Router, TypeScript strict, Tailwind
- Poppins and Source Serif 4 through `next/font`
- `globals.css` with the grayscale tokens
- `@layer components` with both glass tiers and the scrim
- `GlassPanel`, `GlassPill`, `GlassButton` and `IconCircle`
- ESLint with `jsx-a11y`, the no border rule and the no emoji rule
- Vercel project, preview deploys, CI gates

Done when a bare page renders both glass tiers over video with the `::before`
ring correct in Chrome and in Safari. The `mask-composite` prefix is the thing
that breaks.

## Icon set

Runs alongside Foundation, because the hero cannot be finished without it.

- Draw the interface group first. The hero needs `menu`, `arrow-right`, `mail`
  and `chevron-down`.
- Then the four icons the hero cards use: `garden`, `dyeing`, `certificate` and
  the social marks.
- The remaining process, environment and compliance icons follow during Inner
  Pages.
- `Icon` wrapper, registry, reduced motion context, animation data attributes.

Done when every hero icon renders correctly at 16, 24 and 48px on the dark
scrim, animates on the right trigger and renders static under reduced motion.

## Hero

The first real deliverable. Built exactly to
[04-hero-spec.md](04-hero-spec.md).

- Video layer, scrim, z-index stack
- Left panel: navigation, logo lockup, headline, primary action, three pills,
  quote block
- Right panel: social pill, Enquiry button, Environment card, feature section
- Entrance stagger and scroll cue
- Responsive at three breakpoints
- Reduced motion, connection aware video, off screen pause
- Contrast verified against twelve sampled video frames

Done when every item in the hero definition of done is ticked.
Blocked by the monochrome logo, the hero poster and the interface icons.

## Home narrative

All home sections from [02-information-architecture.md](02-information-architecture.md)
using the reveal grammar in
[07-engagement-and-motion.md](07-engagement-and-motion.md).

The Process section ships as the plain vertical stack first. The pinned
horizontal version comes later. This ordering means the page is complete and
correct before it is impressive. It can also ship if the pin proves too costly.

Done when the whole home page reads end to end with real copy, placeholder
imagery logged and Lighthouse at 85 or better on mobile.

## Inner pages and navigation

- `MenuOverlay` with focus trap, Escape and route change close
- `SiteHeader` for inner pages
- About, Facility, Environment
- Process plus its eight stage pages through `generateStaticParams`
- Products, Certifications, People, Sister Concerns, Careers, Contact
- `content/*.ts` populated from the source documents
- The remaining process, environment and compliance icons

Done when every content item in the inventory has a home and nothing is
orphaned.

## Enquiry

- `EnquiryForm` with React Hook Form and Zod
- `/api/enquiry` route handler, Resend delivery, persisted copy
- Honeypot, rate limit and Turnstile
- Attachment upload, presigned, 10 MB, allow list
- Confirmation email to the enquirer
- The persistent glass enquiry bar
- Analytics events

Done when a test enquiry with an attachment arrives at `rs@rscomposite.com` and
is recoverable from storage if mail fails.

## The pinned Process section

Eight stages pinned and moving horizontally, with a name based progress rail,
looping stage icons and real footage. Ships only if it holds 60fps on a mid tier
Android. Otherwise the vertical version stands.

Blocked by the eight process clips.

## Launch

- `generateMetadata` on every route, Open Graph image generation
- JSON-LD for `Organization`, `LocalBusiness` and `BreadcrumbList`
- `sitemap.ts` and `robots.ts`
- Video re-encoded, re-hosted and given a mobile variant
- Every placeholder asset replaced. Zero Placeholder OK entries remaining.
- Lighthouse CI green against the performance budget
- `axe-core` clean on every route
- Chrome, Safari, Firefox, Edge, iOS Safari and Android Chrome checked
- 301 map from the existing `www.rscomposite.com`
- Domain cutover

## After launch

Listed so the architecture does not block them.

- French localisation, since French retail is roughly 40% of the customer mix
- Sanity CMS over the existing `content/` shape
- Certificate detail pages with numbers and validity dates
- A sustainability page with real consumption data
- Case studies
- A buyer portal for order status, which would be the first thing needing auth

## Sequencing

The hero ships first because it is the highest risk and the highest value
screen. If glass over video does not hold up in real browsers at real contrast,
everything downstream changes. Finding that out at the start costs days. Finding
it out near the end costs the project.

The pinned Process section ships last because it is the only element the site
can succeed without.

```
monochrome logo   ─┐
hero poster        ├──> Hero ──> Home ──> Inner pages ──> Launch
interface icons   ─┘             │
                                 └──> Enquiry
process footage ──────────────────────> Pinned Process, optional
```

The three inputs on the left are the only true blockers. Everything else
proceeds with logged placeholders.
