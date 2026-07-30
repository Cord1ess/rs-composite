# 11. Open Questions

Two kinds of item. Conflicts between the source documents, which must be
resolved or the site publishes a contradiction. Questions that need a client
answer.

Only items marked **Blocker** stop the build starting.

## Conflicts in the source documents

### Monthly capacity. 1.2 million against 1.5 million. Blocker.

`RSComposite More Info.md` says "Per Month = 12,00000 Pcs (Approx)", which reads
as 1,200,000. `RSComposite Info.md` says "Currently RS produces about 1.5
million pieces of apparel of unequaled quality per month; and is increasing its
production capacity."

This number appears in the home facts row, on the Sewing page and almost
certainly in a buyer's spreadsheet. Needed: the confirmed current figure, and
whether it is capacity or actual output.

### Management names, titles and spellings. Blocker.

| In `Info.md` | Title there | In `More Info.md` | Title there |
|---|---|---|---|
| absent | | Al-Haj Md. Rashed Sarwar | Chairman |
| Md. Morshed **Sarawar** | Managing Director | Md. Morshed **Sarwar** Sohel | Managing Partner |
| Ajoad Morshed Farian | Director | Ajoad Morshed Farian | Partner |
| Md. Mahide Masud | Director | absent | |
| Md. Muzibur **Rahaman** | CEO | Md. Muzibur **Rahman** | CEO |

Three problems at once. A spelling variance on two names. A title variance
between Director and Partner. One person appearing in only one document.

This matters more than it looks, because the hero quote is attributed to MD.
MORSHED SARWAR. Misspelling the Managing Director on the home page is not a
recoverable first impression.

Needed: the correct legal spelling and current title of every named person, and
whether the Chairman should appear on the site.

### Sister concerns. Four with detail against six by name.

`Info.md` lists four with addresses, areas and capacities: R.S. Knit Wears, R4
Fashion Wear, Al-Amin Export and Zarjis Composite. `More Info.md` lists six by
name, adding RS Tex Tech and Holm N' Holt.

Needed: confirmation that all six are current, plus address, area, capacity and
specialisation for the two extra companies.

### Al-Amin Export descriptor

`Info.md` describes Al-Amin Export as "A house of quality Seawater". Almost
certainly a typo for Sweater. Needed: confirmation.

### Certificate lists do not match

| `Info.md` | `More Info.md` |
|---|---|
| USGBC | LEED |
| amfori BSCI | BSCI, Category A |
| GOTS | GOTS |
| ISO | ISO 9001:2015 |
| OEKO-TEX | Oeko-Tex |
| Organic-100 | Organic Content Standard |
| SMETA | Sedex 4 pillar audit |
| Global Recycled Standard | absent |
| absent | Better Cotton Initiative |
| absent | ICS |
| absent | "Environmental Certificate", unspecified |

Mostly the same certifications under different names, but Global Recycled
Standard, Better Cotton Initiative and ICS each appear in only one document, and
"Environmental Certificate" is too vague to publish.

Needed: the definitive current list. For each one: certificate number, issuing
body, scope and expiry date. Publishing those is a real differentiator,
since most competitor sites show logos only.

### Land area arithmetic

`More Info.md` gives total land around 60,000 sq ft, building around 30,000 sq
ft, free space and roads and parking around 5,000 sq ft. It then gives a total
operation area of 197,263 sq ft. That leaves 25,000 sq ft of land unaccounted
for. The 197,263 figure is presumably cumulative floor area across the eight
storey main building, the four storey utility building and the three sheds
rather than land.

Needed: confirmation of the labelling, since 197,263 sq ft appears in the hero.

Separately, the lakh style grouping "1,97,263" should be normalised to "197,263"
for an international audience.

### "The greenest factory in the world"

`More Info.md` states that RSComposite "is the greenest factory in the world".

Recommendation: do not publish it. It is unverifiable. To the exact audience we
want, sustainability and CSR officers, an unsupportable superlative discredits
the strong verifiable claims sitting next to it: LEED Gold, the
effluent plant, the waste fired boiler and rainwater reuse. In some
jurisdictions it also carries greenwashing exposure.

Needed: sign off on removing it.

## Brand and identity

### Wordmark. One word or two. Blocker.

The brief and the hero specification say RSComposite. Both source documents
consistently write RS Composite. The email domain is rscomposite.com.

The wordmark is the first text a visitor reads. Recommendation: RSComposite as
the logotype and RS Composite in body copy and legal contexts. That split is
common and defensible, but it should be a decision rather than an accident.

### Logo file. Blocker.

Needed: `/logo.svg`, white or monochrome on transparent. A colour logo cannot be
used, because it would be the only chromatic element on the site. It renders at
both 32px and 80px, so it has to hold up small.

### Social accounts

The hero specifies Twitter, LinkedIn and Instagram. Which of these actually
exist? For a business to business knitwear manufacturer, LinkedIn is the only
one that reliably matters. Facebook is far more common than Twitter in this
market.

Recommendation: show only real accounts. Linking to a dead or empty profile is
worse than omitting it.

### Founding year

`Info.md` says "Since their inception in 1998". `More Info.md` gives business
registration number 202 but no year. Needed: confirmation that 1998 is the
public year, since it goes into structured data as `foundingDate`.

### LEED Gold year

Not stated anywhere. Needed: the year of award and the certificate ID. It
strengthens the claim and buyers ask.

## Content and permissions

### Customer names and revenue percentages. Blocker.

`More Info.md` lists eight customers with revenue shares. Two separate problems.

Revenue percentages are commercially sensitive. They tell competitors exactly
where to attack and tell each buyer their own share. Strong recommendation:
never publish them.

Brand names require written permission. Most European retail groups
contractually forbid supplier use of their marks.

Needed: confirmation on whether any customer may be named. Copy that needs no
permission is already drafted in [06-copy-deck.md](06-copy-deck.md).

### Certificate mark usage rights

GOTS, OEKO-TEX, Better Cotton Initiative, Global Recycled Standard and LEED each
have trademark usage guidelines. Several require a licence number displayed
alongside the mark. Some restrict recolouring, which our grayscale filter would
technically constitute.

Needed: a legal check before publishing any certification logo. If a mark cannot
be used, stating the certification in text is adequate.

### Worker photography consent

The People section is the emotional core of the site and depends on real
portraits. Bangladeshi practice, plus BSCI and Sedex audit expectations, require
informed consent for commercial use. Needed: a signed consent process before any
shoot.

### "Khantex Server Room"

`Info.md` carries the caption "Khantex Server Room". Khantex appears nowhere else
in either document and is not in the sister concern list. Needed: is this a
related entity, a vendor or a leftover caption from another document? Do not
publish until clarified.

### Which entity does the site represent

The domain is rscomposite.com and the hero is RSComposite, but the group has six
companies and the green factory story belongs to the RS Composite facility
specifically. Current plan assumes this is the facility's site with a sister
concerns page. Needed: confirmation. It affects the Sister Concerns page framing
only.

## Technical

### Hero video. Resolved. Removed.

The supplied clip had visible jump cuts, which read as stock footage. It also sat
under a third party bucket we do not control. It was replaced by a generated
globe. No video is used anywhere on the site now. Neither of the two questions
that used to sit here applies.

### The globe. One thing to confirm.

The globe names four export markets: Poland, France, the United Kingdom and the
Netherlands. These are countries rather than brands, taken from the customer
list in `More Info.md`, so no permission should be needed. Confirm that naming
the countries is acceptable.

Also confirm the one line description shown for each on hover, since these were
inferred from the customer mix rather than supplied:

| Market | Line currently shown |
|---|---|
| Poland | Long term retail programmes |
| France | Childrenswear and basics |
| United Kingdom | Casual and outdoor |
| Netherlands | Retail and promotional |

### Existing site migration

`www.rscomposite.com` exists and the source document says it is updated
regularly. Needed: access for a URL inventory so a 301 map preserves whatever
search equity exists, plus current hosting, registrar and DNS control.

### Enquiry destination

Enquiries currently go to `rs@rscomposite.com`. Needed: confirmation of the
destination, ideally a shared inbox rather than an individual. Also whether a
CRM should receive them, plus expected volume for rate limit tuning.

### Analytics and cookie consent

Recommendation: Plausible or Vercel Analytics, both cookieless, so no consent
banner is required. A banner would cover the hero on arrival, which the
engagement rules forbid. If Google Analytics is required instead, a consent
banner becomes legally necessary for EU visitors. The customer mix is almost
entirely EU. Needed: a decision.

### Factory Profile PDF

A download action is planned, using a download icon on a control that actually
downloads something. Needed: does a current PDF profile exist, or should one be
produced?

## Decision log

| Item | Answer | Date |
|---|---|---|
| Hero copy, template or adapted | Adapted to RSComposite | 2026-07-28 |
| Framework | Next.js with Tailwind | 2026-07-28 |
| Scope | Full site, hero first | 2026-07-28 |
| Em dashes and serial commas | Banned in all copy | 2026-07-28 |
| Emoji | Banned everywhere | 2026-07-28 |
| Icons | Custom animated set, literal, unified | 2026-07-28 |
| Decorative numbering | Removed from all sections and stages | 2026-07-28 |
| Page and section naming | Plain nouns only | 2026-07-28 |
| Hero video colour | Plays in colour. No CSS filter. Interface stays grayscale. | 2026-07-28 |
| Hero layout | Two panel split dropped. Site header plus conventional hero with a quick link bar. | 2026-07-28 |
| Blur budget | Two backdrop-filter surfaces on the page, both in the hero | 2026-07-28 |
| Card hover | Translate, never scale | 2026-07-28 |
| Hero video | Removed. Jump cuts read as stock footage. | 2026-07-28 |
| Hero background | Generated orthographic globe, Bangladesh highlighted, arcs to the four export markets | 2026-07-28 |
| Globe technique | Build time SVG served as a cached asset. No WebGL, no runtime projection. | 2026-07-28 |
| cobe and MapLibre | Rejected. cobe cannot compose with the information layer. MapLibre needs a tile provider account and reads as a map application. | 2026-07-29 |
| 3D Earth | Added. three.js, NASA textures, drifting clouds, auto spin plus drag, entrance animation. | 2026-07-29 |
| 3D delivery | Two tiers. Flat SVG for everyone, 3D loaded on idle behind a capability gate. First load JS grew 1 kB. | 2026-07-29 |
| Colour in the interface | Still banned, with one exception: real world imagery. The Earth is photographic NASA colour, graded green. | 2026-07-29 |
| Flat SVG globe | Deleted entirely, with its generator, its hotspot layer and three devDependencies. | 2026-07-29 |
| WebGL fallback | None. Devices that fail the gate see the plain dark hero with no globe. | 2026-07-29 |
| Globe framing | Cropped. Scaled up and pushed down so the limb arcs across the frame and the planet runs off the bottom. | 2026-07-29 |
| Background | NASA all sky survey as the scene background. Deep space fills the whole hero. | 2026-07-29 |
| Hero shape | A scroll sequence, not a screen. 260vh runway, pinned stage, one progress value drives crop, rotation, copy and labels. | 2026-07-29 |
| Cloud motion | None. The shell is parented to the surface group. | 2026-07-29 |
| Baked cloud texture | Rejected on measurement. Costs at least 1 MB more than separate at a quality it cannot match. | 2026-07-29 |
| Earth rendering | Lights first. No albedo map, no cloud map. Colour is generated in the shader; the only surface data is city lights and a land silhouette. | 2026-07-29 |
| Texture budget | 486 kB desktop, down from 2639. | 2026-07-29 |
| Planet palette | Brand green. The blue reference was used for its lighting and composition only. | 2026-07-29 |
| Shader safety | `renderer.debug.onShaderError` wired up. A silent compile failure once read as an art direction problem for a whole cycle. | 2026-07-29 |
| Clouds | Dropped. The reference has none. One shell to restore if wanted. | 2026-07-29 |
| AVIF | Measured and rejected. 707 kB against WebP's 705 on the day map. | 2026-07-29 |
| KTX2 Basis | Rejected for now. Wins on VRAM, loses on download, and download is the constraint. | 2026-07-29 |
| Green grade | Baked into the textures at build time. Changing it means regenerating them. | 2026-07-29 |
| Monthly capacity | | |
| Management names and titles | | |
| Sister concerns, six | | |
| Al-Amin descriptor | | |
| Definitive certificate list | | |
| Land against floor area | | |
| Drop the greenest factory claim | | |
| Wordmark, one word or two | | |
| Monochrome logo file | | |
| Which social accounts exist | | |
| Founding year 1998 | | |
| LEED Gold year | | |
| Customer names permitted | | |
| Certificate mark usage rights | | |
| Facility site or group site | | |
| Hero video source file | | |
| Analytics choice | | |
