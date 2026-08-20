# 09. Asset Manifest

Status values: **Have**, **Needs work**, **Missing**, **Placeholder OK** for
milestone one only, **Blocker**.

## Hero background

Current as of audit IV (2026-08-19). `npm run textures` regenerates all of
these; sources cache in `.texture-cache/`, gitignored. Art-direction switches
(`BMNG_MONTH`, `CLOUD_SOURCE`, `STARFIELD`) sit at the top of
`scripts/fetch-textures.mjs`.

| Asset | Source | Notes |
|---|---|---|
| `public/textures/lights.webp` | NASA Black Marble 2016 (13500px) | 5120×2560. Ice/snow glow suppressed at bake using the day map. |
| `public/textures/land.webp` | Blue Marble BMNG Sept 2004 + GEBCO 08 bathymetry + NE 10m land mask | 5120×2560. One channel: depth below 0.5, land brightness above. |
| `public/textures/borders.webp` | Natural Earth 10m (coastline, boundary lines, countries) | 4096×2048 RG distance field, lossless. |
| `public/textures/clouds.webp` | NASA MODIS composite max-blended with Natural Earth III storm clouds (Tom Patterson) | 3072×1536, fBm detail enhancement at bake. |
| `public/textures/galaxy.webp/.avif` | ESO/S. Brunier Milky Way panorama | 2048×1152, graded blue. **CC BY 4.0 — see below.** |
| `public/textures/hero-fallback.webp` | baked from the live globe (`npm run fallback`) | static stand-in for gated and failed visitors |

**Attribution requirement.** Everything above is public domain EXCEPT the
galaxy backdrop: ESO material is CC BY 4.0 and requires a visible credit.
Add a line such as "Milky Way imagery: ESO/S. Brunier (CC BY 4.0)" to the
site's credits/privacy page before launch. If that is unwanted, flip
`STARFIELD` back to `'plate'` and rebake.

Source URLs, for the record:

```
day      eoimages.gsfc.nasa.gov/images/imagerecords/73000/73801/
           world.topo.bathy.200409.3x21600x10800.jpg    21600x10800
night    eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/
           BlackMarble_2016_3km.jpg                     13500x6750
bathy    eoimages.gsfc.nasa.gov/images/imagerecords/73000/73963/
           gebco_08_rev_bath_21600x10800.png            21600x10800
elev     eoimages.gsfc.nasa.gov/images/imagerecords/73000/73934/
           gebco_08_rev_elev_21600x10800.png            21600x10800
clouds   shadedrelief.com/natural3/ne3_data/8192/clouds/
           storm_clouds_8k.jpg                           8192x4096
stars    cdn.eso.org/images/large/eso0932a.jpg           6000x3000
vectors  raw.githubusercontent.com/nvkelso/natural-earth-vector/
           master/geojson/ne_10m_*.geojson
```

## Video

**The hero video was removed.** The supplied clip had visible jump cuts, which
read as stock footage. It was also hosted under a third party bucket we do not
control. No video is used anywhere on the site at present.

Footage is still wanted for the Process section later.

| Asset | Status | Notes |
|---|---|---|
| Process footage, eight clips | Missing | Knitting, dyeing, cutting, printing, embroidery, sewing, finishing, packing. Silent loops of 5 to 8 seconds. |
| Environment footage | Missing | Gardens, fountains, effluent plant, rainwater system, daylit floors |

Whatever is shot must be real RSComposite footage. Recognisably generic stock
gets spotted by a sourcing manager and costs more credibility than the aesthetic
buys. Any clip that ships needs the audio track stripped, a VP9 sibling, a
poster frame and hosting on the project CDN.

## Brand

| Asset | Path | Status | Notes |
|---|---|---|---|
| Logo, primary | `/logo.svg` | Blocker | Rendered at 32 by 32 and 80 by 80 in the hero. Must be white or monochrome on transparent. A colour logo breaks the grayscale system. SVG strongly preferred. |
| Logo, dark variant | | Placeholder OK | For light surfaces such as email and PDF |
| Favicon set | | Missing | |
| Open Graph image | generated | Placeholder OK | Built rather than sourced |

Open question: does a monochrome lockup exist? Is the wordmark "RSComposite" or
"RS Composite"? The source documents use both.

## Icons

Custom animated set, roughly forty icons. See
[08-icon-system.md](08-icon-system.md).

| Group | Count | Status |
|---|---|---|
| Process | 11 | Missing, drawn in house |
| Environment | 9 | Missing, drawn in house |
| Compliance and facility | 9 | Missing, drawn in house |
| Interface | 21 | Missing, drawn in house |
| Social brand marks | 5 | Missing, official glyph outlines |

Drawing the set is a milestone in its own right. See
[10-build-roadmap.md](10-build-roadmap.md).

## Photography

All missing. Listed in the order they matter.

| Asset | Notes |
|---|---|
| Facility exterior with greenery | The single most valuable photo on the site |
| Sewing floor, wide | Scale in one frame |
| Worker portraits, 10 to 15 | The People section depends entirely on these. Signed consent required. |
| `@/assets/hero-fabric.png` | Macro of knit fabric, 96 by 64 thumbnail in the hero |
| Knitting floor | |
| Dyeing and finishing lines | |
| Laboratory | |
| CAD room | Named in the source material |
| Cutting lines | |
| Printing | |
| Embroidery | |
| Finishing and quality control | |
| Packing and cartons | |
| Effluent treatment plant | |
| Boiler | |
| Rainwater harvesting system | |
| Generators | |
| Server room | |
| Childcare facility | |
| Lunch floor | |
| Gardens and walking paths | |
| Management portraits | |

Direction: shoot in colour and convert in post rather than shooting monochrome,
so the raws stay usable. High contrast with deep blacks. No flat HDR. Wide shots
for scale, tight shots for craft. Faces looking at their work rather than at the
camera.

If a professional shoot is not budgeted, this is where the money should go. The
design system is only as credible as the footage inside the glass.

Licensed textile manufacturing stock, grayscale filtered, is acceptable for
milestone one only. Every stock image gets logged here so none survives to
production by accident.

## Certificate marks

Needed as monochrome vector: LEED, amfori BSCI, Sedex, ISO 9001:2015, OEKO-TEX,
GOTS, Organic Content Standard, Global Recycled Standard, Better Cotton
Initiative and ICS. All missing.

Each certification body has trademark usage rules. Several of them, including
GOTS, OEKO-TEX, BCI and GRS, restrict how their marks appear and require a
licence number displayed alongside. Recolouring to grayscale may itself breach
some of those guidelines. Legal check needed before any mark is published. If a
mark cannot be used, stating the certification in text is fine.

## Customer marks

ETOS, CDRL, Orchestra, Sergent Major, Weird Fish, Siplec, Suncity and Chesin.

Blocked. Displaying a customer's mark requires their written permission and most
European retail groups forbid supplier use. Assume no until proven otherwise.
Copy that needs no permission is already drafted in
[06-copy-deck.md](06-copy-deck.md).

## Documents

| Asset | Status | Notes |
|---|---|---|
| Factory Profile PDF | Missing | High value download for a sourcing manager |
| Certificate scans | Missing | Buyers ask. Publishing them is a strong signal. |
| Compliance summary | Placeholder OK | Assembled from the source documents |

## Fonts and licensing

| Asset | Status |
|---|---|
| Poppins, weights 300 to 600 | Have. Google Fonts, self hosted through `next/font`. |
| Source Serif 4, italic | Have. Google Fonts, self hosted through `next/font`. |

Both carry the SIL Open Font License. No issue.

## Acquisition order

If only some of this can be produced, produce in this order.

1. Monochrome logo as SVG. Nothing renders correctly without it.
2. Facility exterior with greenery.
3. Sewing floor, wide.
4. The icon set.
5. Worker portraits.
6. Process footage, eight clips.
7. Certificate marks with numbers and dates.
8. Factory Profile PDF.

The hero no longer blocks on any of these. It ships as it is.
