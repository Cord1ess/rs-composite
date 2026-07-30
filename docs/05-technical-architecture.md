# 05. Technical Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15, App Router | Static generation, metadata API, route handlers for the enquiry form, image optimisation |
| Language | TypeScript, strict | |
| Styling | Tailwind CSS with `@layer components` for glass | The specification is written in Tailwind idiom |
| Icons | Custom animated SVG components | See [08-icon-system.md](08-icon-system.md) |
| Fonts | `next/font/google`, Poppins and Source Serif 4 | Self hosted at build, no layout shift, no external request |
| Animation | Framer Motion for section reveals, CSS for everything else | Loaded only on pages that need it, never in the hero |
| Forms | React Hook Form with Zod | One schema shared by client and server |
| Hosting | Vercel | Edge CDN, static regeneration, image optimisation, preview deploys |
| Analytics | Plausible or Vercel Analytics | Cookieless, so no consent banner covering the hero |

No CMS at launch. The content is stable factory data and the two source
documents are the reference. Content lives in typed TypeScript files under
`content/`. If the client later needs to edit copy without a developer, Sanity
drops onto the same shape.

## Structure

```
rscomposite/
  app/
    layout.tsx                fonts, metadata, JSON-LD
    globals.css               tokens and @layer components
    page.tsx                  home
    about/page.tsx
    facility/page.tsx
    environment/page.tsx
    process/page.tsx
    process/[stage]/page.tsx  generateStaticParams from content/process
    products/page.tsx
    certifications/page.tsx
    people/page.tsx
    sister-concerns/page.tsx
    enquiry/page.tsx
    careers/page.tsx
    contact/page.tsx
    api/enquiry/route.ts
    sitemap.ts
    robots.ts
    opengraph-image.tsx

  components/
    hero/
      Hero.tsx                headline, actions, pills, quick link bar
    globe/
      GlobeField.tsx          client. capability gate, full bleed wrapper.
      Earth3D.tsx             client. canvas plus the hotspot cards.
      earth-scene.ts          framework free three.js scene
    glass/
      Glass.tsx               tier surface, light or strong, plus IconCircle
    icons/                    see 08-icon-system.md
    nav/
      SiteHeader.tsx          client. scroll state and the menu overlay
      nav-items.ts
    sections/
      Section.tsx             section shell, shared card chrome
      home.tsx                the home page sections
      Facts.tsx               client. count up
      Certifications.tsx      client. expanding tiles
    ui/Reveal.tsx             client. shared reveal

  content/
    site.ts                   name, contacts, socials, addresses
    globe.ts                  GENERATED. marker coordinates only.
    process.ts                the eight stages
    facts.ts
    environment.ts
    company.ts                certifications, markets, sister concerns, products

  lib/
    cn.ts
    observe.ts                one IntersectionObserver for the page

  scripts/
    fetch-textures.mjs        one time. writes public/textures/*.webp

  public/
    logo.svg
    textures/                 earth-day, earth-night, clouds, stars

  docs/
```

`@/*` maps to the project root.

## Server and client boundary

Server Components by default. Only these carry `'use client'`:

- `SiteHeader`, for scroll state, the menu, focus trap and keyboard handling
- `GlobeHotspots`, for hover and tap state
- `Facts`, for the count up
- `Certifications`, for the expanding tiles
- `Reveal`, the shared scroll reveal wrapper

`Globe` is deliberately a Server Component. Keeping it there is what stops the
projected path data reaching a JavaScript chunk.

The hero's headline, quote, pills and cards render on the server. That is what
makes the largest contentful paint happen before any JavaScript runs.

## Glass component contract

One component owns the two tiers so they cannot drift.

```tsx
type GlassProps = {
  tier?: 'light' | 'strong'
  as?: React.ElementType
  className?: string
  children: React.ReactNode
}
```

An ESLint rule blocks Tailwind border utilities inside `components/`. The
`::before` ring is the border and a stray `border` class double strokes.

A second rule blocks emoji in JSX text and in content files.

## Styling

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base       { :root { /* grayscale tokens, --radius: 1rem */ } }
@layer components { .liquid-glass { } .liquid-glass-strong { } .hero-scrim { } }
```

Full declarations in [03-design-system.md](03-design-system.md).

Tailwind's `colors` is never extended with anything chromatic. The theme is
grayscale by construction, so an accidental colour becomes a visible mistake at
build time.

## The globe

The hero background is a generated globe, not video. Video was removed from the
site entirely. Full reasoning in [04-hero-spec.md](04-hero-spec.md).

### Build step

```
npm run globe              scripts/generate-globe.mjs
                           also runs automatically on prebuild

  world-atlas countries-110m.json
    -> topojson-client   merge land, cut Bangladesh out of it
    -> d3-geo            geoOrthographic, rotate [-55, -25], scale 392
    -> round to integers at an 800px viewBox

  writes public/globe.svg    29 kB raw, 11.9 kB gzipped
  writes content/globe.ts    1.1 kB, five marker coordinates only
```

`d3-geo`, `topojson-client` and `world-atlas` are devDependencies. None of them
are in the browser bundle. The script throws if any marker falls behind the limb
of the globe, so a bad rotation fails the build rather than silently losing a
market.

### Why it is an asset and not inline markup

Inlined, the 27 kB of path data went into the HTML and again into the RSC
payload. Home page HTML was 47.4 kB gzipped. Served as a file it is fetched
once, cached by the CDN and the browser. It is reused by any page. Home page HTML
is now 22 kB gzipped.

### Runtime cost of the flat tier

No canvas, no WebGL, no animation frame loop, no reprojection, no resize
listener. The arcs draw once and stop. The origin marker pulses. Both animations
are declared in a `<style>` block inside the SVG file, which still runs when the
file is loaded through `<img>` and still honours `prefers-reduced-motion`.

The interactive hotspot layer is a small client component that receives only the
five coordinates, which is what keeps the path data out of the JavaScript
bundle. It positions in percentages of the same viewBox, so the layers stay
locked together at any size.

### The 3D tier

```
components/globe/GlobeField.tsx   client. capability gate, tier handover.
  |
  +-- flat: <img src="/globe.svg"> + GlobeHotspots     always, immediately
  |
  +-- gate: reduced-motion? saveData? 2g/3g?
  |         cores <= 2? width < 640? no WebGL?
  |         any yes -> stop here, nothing else loads
  |
  +-- requestIdleCallback
        -> dynamic import Earth3D          ssr: false
             -> dynamic import earth-scene  three.js, 81.1 kB gzipped
             -> /textures/earth.webp        114 kB
             -> /textures/clouds.webp       18.5 kB
             -> onReady: flat tier fades out, Earth rises in
```

`earth-scene.ts` is deliberately framework free. It is a plain class with
`start`, `stop`, `setSize` and `dispose`. It reports projected marker
positions through a callback. Keeping three.js out of React means no
reconciliation in the render loop and no r3f in the bundle.

Marker positions are written directly to `style.transform` on five DOM nodes
inside the frame callback. They never touch React state. Only which marker is
active is state.

The renderer caps device pixel ratio at 1.5 and stops its animation loop through
an IntersectionObserver when the hero scrolls away.

Effect on the initial bundle: first load JS went from 112 kB to 113 kB.
Everything else is deferred and gated.

### Textures

`node scripts/fetch-textures.mjs` downloads NASA Visible Earth imagery, which is
public domain, resizes it and writes WebP. The cloud source has no alpha
channel, so the script rebuilds it as white pixels with alpha taken from
luminance. Outputs are committed. It is not part of `build`, because a homepage
should never depend on a third party host at deploy time.

### Largest contentful paint

The headline is the LCP element, which is what we want. The globe is a
`fetchPriority="high"` image with explicit width and height, so it introduces no
layout shift while it loads.

## Performance budget

| Metric | Budget |
|---|---|
| JavaScript on home, first load, gzipped | 120 KB |
| CSS | 25 KB |
| Largest contentful paint on 4G mobile | Under 2.5 seconds |
| Cumulative layout shift | Under 0.05 |
| Interaction to next paint | Under 200ms |
| Video, deferred | 2.5 MB desktop, 1.2 MB mobile |

Guardrails: `next/image` everywhere with explicit dimensions, icons as
individual components, Framer Motion dynamically imported and never present in
the hero bundle.

## SEO

- `generateMetadata` per route from `lib/metadata.ts`
- `app/opengraph-image.tsx` generates a grayscale card with the wordmark and
  headline
- JSON-LD in the root layout: `Organization` with name, logo, url, sameAs,
  contactPoint and `foundingDate` 1998, plus `LocalBusiness` with the full
  Narayanganj address. `BreadcrumbList` on inner pages.
- `sitemap.ts` and `robots.ts` generated at build
- One `h1` per page, real `nav`, `main` and `footer`, descriptive link text
- Human readable `alt` on every content image, which is also how the factory
  photography becomes findable in image search

## Enquiry pipeline

```
EnquiryForm, client, React Hook Form and Zod
  POST /api/enquiry
    validate with the same Zod schema
    honeypot, IP rate limit, Cloudflare Turnstile
    send through Resend to rs@rscomposite.com
    confirmation email to the enquirer
    persist to Vercel KV or Postgres so nothing is lost if mail fails
  success state without navigation
```

Attachments upload through a presigned URL. 10 MB cap. Allow list of pdf, png,
jpg, ai and xlsx.

## Environments

| Environment | Branch | URL |
|---|---|---|
| Production | `main` | `www.rscomposite.com` |
| Staging | `develop` | Vercel preview subdomain |
| Preview | any pull request | automatic |

Migration from the existing site needs a URL inventory and a 301 map. Logged in
[11-open-questions.md](11-open-questions.md).

## CI gates

- `tsc --noEmit`
- ESLint with `jsx-a11y`, the no border rule and the no emoji rule
- Prettier
- Lighthouse CI on home, failing the build below the budgets above
- `axe-core` scan on every route
