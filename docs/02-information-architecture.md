# 02. Information Architecture

Every page is named for what it contains. Nothing is more than two clicks from
the hero.

## Sitemap

```
/                       Home
/about                  Who RSComposite is, founded 1998
/facility               Buildings, area, location, utilities, IT
/environment            LEED Gold, ETP, boiler, rainwater, daylight, waste
/process                The full line
  /process/knitting
  /process/dyeing-and-finishing
  /process/cutting
  /process/printing
  /process/embroidery
  /process/sewing
  /process/finishing
  /process/packing
/products               What they make and export
/certifications         Every certificate with number and validity
/people                 Workers, welfare, safety, management
/sister-concerns        The other five group companies
/enquiry                Order enquiry form
/careers                Recruitment
/contact                Address, phones, emails, map
/privacy
```

Rejected names and why:

| Rejected | Used instead |
|---|---|
| Our Journey | About |
| Green Campus | Environment |
| Compliance Archive | Certifications |
| Our Ecosystem | Sister Concerns |
| Capabilities | Process |
| Advanced Fabric Engineering | Knitting |
| Processing | Dyeing and Finishing |

## Navigation

Primary navigation sits behind the hero's Menu button as a full screen glass
overlay. The home page carries no header bar, so nothing competes with the hero.

Menu contents:

```
About            Process                    Company
Facility           Knitting                   Sister Concerns
Environment        Dyeing and Finishing       Careers
Products           Cutting                    Contact
Certifications     Printing
People             Embroidery
                   Sewing
                   Finishing
                   Packing
```

Enquiry sits in the menu footer alongside `rs@rscomposite.com` and
`+88-01711-563148`.

Inner pages get a slim glass header. Logo left, page name centre, Menu and
Enquiry right.

## Home page sections

One scroll, in this order. Feeling, then proof, then capability, then scale,
then trust, then action.

| Section | Purpose | Content |
|---|---|---|
| Hero | Stop them | See [04-hero-spec.md](04-hero-spec.md) |
| Introduction | Orient in one sentence | Location, size, certification |
| Facts | Scale, instantly | 1998, 197,263 sq ft, 2,250 people, 25 sewing lines, 1.2M pieces a month |
| Environment | The differentiator | Rainwater, ETP, waste fired boiler, floors under 30°C, daylight, gardens, walk to work |
| Process | Capability as a sequence | Knitting, Dyeing and Finishing, Cutting, Printing, Embroidery, Sewing, Finishing, Packing |
| Quality | Proof of rigour | 4 Point checking, calibrated lab, QC from knitting to packing, buyer video review |
| People | The emotional core | 2,250 workers, half women, healthcare, childcare, lunch floor, gardens, WPC, ILO |
| Certifications | Remove buyer risk | LEED, amfori BSCI A, Sedex 4 Pillar, ISO 9001:2015, OEKO-TEX, GOTS, OCS, GRS, BCI, ICS |
| Markets | Social proof | Countries served. Brand names only with permission. |
| Sister Concerns | Depth of capacity | Five more companies, combined capacity |
| Enquiry | Convert | Glass panel, one strong action |
| Footer | Utility | Contact, addresses, emails, sitemap |

Section headings are plain nouns. No clever antithesis, no questions, no
numbering.

## Content inventory

Everything in the two source documents has a destination. Nothing is orphaned.

| Source content | Destination |
|---|---|
| Founded 1998, Narayanganj | About, Home introduction |
| Land 60,000 sf, building 30,000 sf, operation area 197,263 sf | Facility |
| 8 storey RCC main, 4 storey utility, 3 sheds | Facility |
| USGBC LEED Gold | Home, Environment, Certifications |
| Greenery and fountains | Environment |
| Rainwater and surface water recycling | Environment |
| Floors under 30°C | Environment, People |
| Daylight use | Environment |
| Solid waste and wastewater management | Environment |
| Energy efficient, noise free machines | Environment |
| Effluent treatment plant | Environment |
| Boiler burning own garment waste | Environment |
| Workers walk to work, local livelihood | Environment, People |
| Fire safety equipment and training | People |
| Free healthcare and medicines, childcare | People |
| Drinking water, ventilation, lunch floor, hand wash station, garden | People |
| ILO and local labour law, Workers' Participation Committee | People |
| Generators | Facility |
| Auto water pump, hose, CC cameras, BBT wiring, sprinklers | Facility |
| LAN and WAN, server room, fibre and wireless, MIS | Facility |
| Knitting machines and fabric types | Process, Knitting |
| Dyeing, finishing, 4 Point system, calibrated lab | Process, Dyeing and Finishing |
| Sample development, CAD room, R&D design | Process, Cutting |
| Computerised cutting lines | Process, Cutting |
| Embroidery machines | Process, Embroidery |
| Printing methods | Process, Printing |
| 25 sewing lines, 1.2M pieces a month | Process, Sewing |
| Finishing and final QC | Process, Finishing |
| Packing and CT-PAT | Process, Packing |
| Buyer video conferencing | Home Quality, Finishing |
| Product range | Products |
| Certificate lists from both documents | Certifications |
| Customer mix and percentages | Markets. Percentages are confidential. See [11-open-questions.md](11-open-questions.md). |
| Careers and cv@rscomposite.com | Careers |
| Enquiry form fields | Enquiry |
| Management team | People, Contact |
| Sister concerns with areas and capacities | Sister Concerns |
| Phones, emails, address | Contact, footer |

## Enquiry form

From the source document, cleaned and made useful to a buyer.

| Field | Type | Required | Note |
|---|---|---|---|
| Name | text | yes | |
| Company | text | yes | Added. The most useful qualifying field and the source form omits it. |
| Email | email | yes | |
| Country | select | yes | |
| Product for | select | yes | Men, Ladies, Kids, Unisex |
| Product type | select | yes | Added. T-shirt, polo, sweatshirt, tank top, boxer shorts, jogging suit, pajama set, brief, cardigan, trouser, other. |
| Colour | select | no | |
| Size | multi select | no | |
| Quantity in pieces | number | yes | |
| Delivery date | date | yes | One date picker. The source form uses three separate day, month and year selects. |
| Message | textarea | no | |
| Attachment | file | no | Added. Tech packs are how the conversation actually starts. |

Posts to a Next.js route handler. Emails `rs@rscomposite.com` and stores a copy.
Honeypot, rate limit and Turnstile for spam.

## URL and SEO notes

- Lowercase, hyphenated, no trailing slash.
- Unique title, description, canonical, Open Graph and Twitter card per page.
- `Organization` and `LocalBusiness` JSON-LD on home. `BreadcrumbList` on inner
  pages.
- `sitemap.xml` and `robots.txt` generated at build.
- The existing `www.rscomposite.com` needs a URL inventory and a 301 map. See
  [11-open-questions.md](11-open-questions.md).
