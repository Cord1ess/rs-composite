# RSComposite Website Planning

Status: planning only. No code until greenlight.
Last updated: 2026-07-28

## The goal

Captivate the visitor, keep them on the page and make them explore. RSComposite
is a USGBC LEED Gold certified knitwear facility in Narayanganj, Bangladesh. The
site turns anonymous global sourcing traffic into remembered brand and qualified
enquiry.

## Locked decisions

| Decision | Choice |
|---|---|
| Hero copy | Adapted to RSComposite. Layout and glass system stay identical to the supplied spec. |
| Framework | Next.js (App Router) with Tailwind CSS |
| Scope | Full site planned, hero built first |
| Icons | Custom animated SVG set, literal not metaphorical. See 08. |

## House rules for all copy and design

These apply to every document here and to every string that ships.

1. No em dashes or en dashes as punctuation. Use a full stop, a colon, a
   semicolon or brackets.
2. No comma before "and" in a list. Write "knit, dyed and finished".
3. No emoji anywhere. Not in the UI, not in these documents.
4. No decorative numbering. Process stages are named, never labelled 01, 02, 03.
5. Name things what they are. "Certifications" not "Compliance Archive".
   "About" not "Our Journey". "Dyeing and Finishing" not "Processing".
6. No filler design elements. If a line, dot, bracket or accent shape carries no
   information, it does not ship.
7. Every icon is literal and animated. A sewing icon looks like sewing.

## Documents

| # | Document | Covers |
|---|---|---|
| 01 | [Brief and Strategy](01-brief-and-strategy.md) | Audience, positioning, how we keep people on the page |
| 02 | [Information Architecture](02-information-architecture.md) | Sitemap, page purpose, content inventory |
| 03 | [Design System](03-design-system.md) | Tokens, type, the two glass tiers, motion, legibility |
| 04 | [Hero Specification](04-hero-spec.md) | The landing screen, slot by slot |
| 05 | [Technical Architecture](05-technical-architecture.md) | Stack, structure, video handling, performance, SEO |
| 06 | [Copy Deck](06-copy-deck.md) | Every user facing string, traced to source |
| 07 | [Engagement and Motion](07-engagement-and-motion.md) | What makes people stay and scroll |
| 08 | [Icon System](08-icon-system.md) | The animated icon set, drawing rules, motion rules |
| 09 | [Asset Manifest](09-asset-manifest.md) | Every image, video, logo and document with status |
| 10 | [Build Roadmap](10-build-roadmap.md) | Milestones, sequencing, definition of done |
| 11 | [Open Questions](11-open-questions.md) | Blockers and contradictions in the source material |

The numbers in the filenames are for reading order only. They never appear in
the interface.

## Source material

Two client documents at the repo root are the only source for facts:

- `RSComposite Info.md`
- `RSComposite More Info.md`

No number, certificate or claim goes on the site unless it traces to one of
those two files or to a client answer recorded in
[11-open-questions.md](11-open-questions.md).
