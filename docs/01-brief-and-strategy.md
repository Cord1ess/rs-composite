# 01. Brief and Strategy

## The problem

Every competitor site looks the same. A stock photo of a sewing floor, a grid of
certificate logos, a table of machine counts and a contact form. Sourcing
managers skim these in eight seconds and remember none of them.

RSComposite has something most competitors do not: USGBC LEED Gold
certification, a genuinely green campus and 50/50 gender parity across 2,250
workers. That is the brand.

## Goal

Brand recognition, global reach and a showcase of capability and quality.

| Goal | How the site does it |
|---|---|
| Be remembered | A hero unlike any other factory site. Video, liquid glass, strict grayscale. |
| Be found | Static generation, structured data, per page metadata, semantic HTML |
| Prove capability | The manufacturing process shown as something you move through, not a spec table |
| Prove integrity | LEED Gold, BSCI A, Sedex 4 Pillar, ISO, GOTS and OEKO-TEX shown with numbers and dates, not just logos |
| Convert | Enquiry one click from every screen |

## Audience

**Sourcing and merchandising managers at European retail brands.** Currently
ETOS and CDRL in Poland, Orchestra, Sergent Major, Siplec and Suncity in France,
Weird Fish in the UK, Chesin in the Netherlands. They care about compliance,
capacity, lead time, price and sustainability credentials they can put in their
own annual report.

**Sustainability and CSR officers.** Increasingly the gatekeeper. LEED Gold, the
effluent treatment plant, the waste fired boiler, rainwater harvesting and
worker welfare are what they screen for. No competitor site serves this audience
well. This is where RSComposite wins.

**Talent.** `cv@rscomposite.com` already exists. The careers page should make
this look like the most modern factory job in Narayanganj.

**Press and local government.** They arrive for the green factory story. Give
them facts they can quote.

## Positioning

RSComposite is a 197,263 sq ft knit composite facility in Narayanganj where LEED
Gold engineering, ILO grade worker welfare and 1.2 million pieces a month are
the same decision rather than competing ones.

## Voice

| We are | We are not |
|---|---|
| Quiet, precise, confident | Loud, salesy, stacking superlatives |
| Cinematic and modern | Corporate stock and dated |
| Evidence led | Claim led |
| Human. 2,250 people. | Faceless industrial |

Rules:

- Short sentences. Concrete nouns. Numbers instead of adjectives.
- Never "world class" without a specific noun attached.
- Never "woven" about a knit product. Buyers notice.
- Sustainability claims stated flatly.
- Sections and pages are named for what they contain.

## Keeping people on the page

Three windows, each with its own job.

**First three seconds. Make them stop.**
Full bleed looping video behind liquid glass in strict grayscale. No cookie
banner, no modal, no preloader, no chat bubble. The visual system does this on
its own.

**Three to thirty seconds. Show there is more.**
The hero's right panel holds real links, not decoration. Dyeing and Finishing,
Certifications and Knitting each visibly lead somewhere. A scroll cue and a
section edge peeking under the fold do the rest. Detail in
[07-engagement-and-motion.md](07-engagement-and-motion.md).

**Thirty seconds to five minutes. Pay it off.**
The manufacturing process presented as a scroll sequence with real footage, and
the environment story told with the numbers a CSR officer will screenshot.

## Success metrics

| Metric | Target |
|---|---|
| Bounce rate on home | Under 40% |
| Median session | Over 90 seconds |
| Scroll past hero | Over 65% |
| Enquiry starts per session | Over 3% |
| Lighthouse performance, mobile | 85 or better |
| Lighthouse SEO and best practices | 95 or better |
| Largest contentful paint | Under 2.5 seconds |

## Not doing

- No e-commerce. No cart, no prices.
- No accounts or login. The template's "Account" button becomes Enquiry.
- No blog at launch.
- English only at launch. French is the strongest later addition given that
  French retail is roughly 40% of the customer mix.

## Risks

| Risk | Mitigation |
|---|---|
| White text over bright video frames fails contrast | Fixed scrim between video and content. See [03-design-system.md](03-design-system.md). |
| Video hero ruins mobile performance | Poster first, connection aware loading, reduced motion respected |
| Only placeholder imagery available | Asset manifest tracks real against placeholder. Nothing placeholder ships. |
| Source documents contradict each other | All conflicts logged in [11-open-questions.md](11-open-questions.md) |
| Grayscale reads as cold | Warmth comes from footage and faces, never from colour |
