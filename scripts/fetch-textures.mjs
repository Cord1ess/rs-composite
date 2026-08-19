/**
 * One time asset fetch. Pulls established, published Earth texture sets rather
 * than deriving anything by hand, then downsamples them to what the scene uses.
 *
 * Sources are tried in order and the first that responds wins. Whichever one is
 * used is printed, because the licence differs:
 *
 *   solarsystemscope.com  CC BY 4.0, attribution required
 *   NASA Visible Earth    public domain
 *
 * Writes:
 *   public/textures/earth-day-hi.webp   6144x3072 colour
 *   public/textures/earth-day-lo.webp   4096x2048, for GPUs capped at 4096
 *   public/textures/earth-night.webp    2048x1024 city lights
 *   public/textures/clouds.webp         2560x1280 greyscale coverage for the
 *                                       cloud shell, detail enhanced at bake
 *   public/textures/galaxy.webp/.avif   1376x768 deep space plate, from the
 *                                       supplied Galaxy BG.png in the repo root
 *
 * Clouds are stored as a single greyscale image, not RGBA. The shell is pure
 * white, so only coverage matters, and an alphaMap is roughly a quarter of the
 * bytes of a four channel texture with no blockiness in the alpha.
 *
 *   npm run textures
 *
 * Outputs are committed. This is not part of build, because a homepage should
 * never depend on a third party host being up at deploy time.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { geoEquirectangular, geoPath } from 'd3-geo'
import { feature, mesh } from 'topojson-client'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/textures')
/* The four sources are 70 MB together. Cached so re-encoding at a different
   quality does not mean downloading them again. Gitignored. */
const cacheDir = resolve(root, '.texture-cache')
mkdirSync(outDir, { recursive: true })
mkdirSync(cacheDir, { recursive: true })

/*
  Sized for the worst case, which is the entry frame and only the entry frame.

  The globe is at its most magnified at scroll position zero, then shrinks to a
  full ball as the page scrolls, so peak magnification is brief. 6144 works out
  at 1.07 texels per device pixel there, which is the right side of one. 8192
  measured 1.42 and cost 1670 kB against 966, which is not worth 700 kB for
  headroom nothing ever uses.
*/
const SIZES = {
  /* City lights carry all of the surface detail, so this is the one that
     matters. Black Marble is almost entirely black, so it compresses superbly:
     4096 costs 165 kB. */
  /*
    5120, not 4096 or 6144. Measured, sharpened, at quality 70:
      4096  255 kB    5120  392 kB    6144  545 kB
    Most of the crispness comes from the unsharp pass rather than the pixel
    count, so this takes the resolution step that is worth paying for and stops.
  */
  /* 5120 after the crispness pass, down from 6144 (audit II, O4): the
     unsharp pass carries most of the crispness, and the step saves 6 MB of
     GPU memory and ~80 kB of wire. Golden-diffed on the entry crop, where
     the conurbation cores are at their most magnified, before adoption. */
  lights: [5120, 2560],
  /* 5120 after the crispness pass, up from 3072: coastline and shelf detail
     under the entry crop's magnification. */
  land: [5120, 2560],
  /* Thin lines on black. Needs the resolution to stay crisp, but compresses
     almost to nothing because the rest of the frame is empty. */
  borders: [4096, 2048],
  /* The shell's coverage channel. 2560 plus the fBm detail baked in by
     cloudMask holds up at the entry crop; resolution alone did not. */
  clouds: [2560, 1280],
}

const SETS = {
  day: [
    /* 28 MB, 21600 by 10800. The 5400 version was tried first and is not enough
       resolution once the globe is cropped this hard. */
    ['NASA Visible Earth 21600, public domain', 'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x21600x10800.jpg'],
    ['NASA Visible Earth 5400, public domain', 'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg'],
  ],
  night: [
    ['NASA Black Marble 2016 3km, public domain', 'https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg'],
    ['NASA Black Marble 2016 0.1deg, public domain', 'https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg'],
  ],
  clouds: [
    /* 8192x4096 real cloud composite, 34 MB TIFF. The 2048 version below was
       tried first and looked blocky once wrapped on the sphere. */
    ['NASA Blue Marble clouds 8k, public domain', 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif'],
    ['solarsystemscope, CC BY 4.0', 'https://www.solarsystemscope.com/textures/download/8k_earth_clouds.jpg'],
    ['NASA Blue Marble clouds 2k, public domain', 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg'],
  ],
  tour: [
    /* Demo panorama for the facility tour section: a real machine hall
       standing in for ours until the facility shoot. CC0. */
    ['Poly Haven machine_shop_01, CC0', 'https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/machine_shop_01.jpg'],
  ],
  bath: [
    /*
      A real depth grid, 21600x10800. Blue Marble's own ocean shading is a soft
      gradient and read as a blurry mess once it was actually being used, where
      this has trenches, ridges and shelves with hard structure.

      Verified on download: Mariana Trench 45, abyssal Pacific 109, mid Atlantic
      ridge 129, North Sea shelf 253, land 255. Low is deep.
    */
    ['NASA GEBCO 08 bathymetry, public domain', 'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73963/gebco_08_rev_bath_21600x10800.png'],
  ],
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`
const kb = (n) => `${(n / 1024).toFixed(0)} kB`

async function grab(sources, label) {
  for (const [licence, url] of sources) {
    const cached = resolve(cacheDir, createHash('sha1').update(url).digest('hex'))
    if (existsSync(cached)) {
      const buf = readFileSync(cached)
      const meta = await sharp(buf).metadata()
      console.log(`  ${label}: cached. ${meta.width}x${meta.height}, ${mb(buf.length)}`)
      return { buf, licence, url, meta }
    }
    try {
      process.stdout.write(`  ${label}: ${new URL(url).host} ... `)
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) {
        console.log(`HTTP ${res.status}`)
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      const meta = await sharp(buf).metadata()
      console.log(`ok. ${meta.width}x${meta.height}, ${mb(buf.length)}`)
      writeFileSync(cached, buf)
      return { buf, licence, url, meta }
    } catch (err) {
      console.log(`failed. ${err.message}`)
    }
  }
  throw new Error(`No source reachable for ${label}`)
}

const used = []
let total = 0

async function write(name, buf, size, pipeline) {
  const out = await pipeline(sharp(buf).resize(size[0], size[1], { fit: 'fill' })).toBuffer()
  writeFileSync(resolve(outDir, name), out)
  total += out.length
  const meta = await sharp(out).metadata()
  console.log(`  wrote ${name.padEnd(20)} ${meta.width}x${meta.height}  ${kb(out.length)}`)
}

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v))

/*
  Country outlines, rasterised at build time.

  Drawn as an SVG in equirectangular projection and handed to sharp, which
  rasterises it through librsvg. That avoids pulling a canvas implementation
  into the toolchain for what is a few thousand line segments.

  Coastlines and internal borders are drawn dim, Bangladesh brighter and
  thicker, all into one greyscale channel. The shader reads that value directly
  as an intensity, so the host country stands out without needing a second
  texture or a second lookup.

  d3-geo, topojson-client and world-atlas are devDependencies. None of them
  reach the browser: what ships is the rasterised WebP.
*/
async function borderMask([w, h]) {
  const topo = JSON.parse(
    readFileSync(resolve(root, 'node_modules/world-atlas/countries-50m.json'), 'utf8'),
  )
  /* 50m rather than 110m. At 4096 wide the 110m outlines are visibly faceted. */
  const projection = geoEquirectangular()
    .translate([w / 2, h / 2])
    .scale(w / (2 * Math.PI))
  const path = geoPath(projection)

  const coast = mesh(topo, topo.objects.countries, (a, b) => a === b)
  const inland = mesh(topo, topo.objects.countries, (a, b) => a !== b)
  const bd = feature(topo, topo.objects.countries).features.find(
    (f) => f.properties.name === 'Bangladesh',
  )
  if (!bd) throw new Error('Bangladesh not found in world-atlas countries-50m')

  /*
    Sub-pixel stroke widths, deliberately.

    At 4096 across 360 degrees one pixel is 0.088 degrees, which at the entry
    crop lands at about 2.55 screen pixels. A 1px stroke therefore is not thin,
    and the 2.3px Bangladesh outline was nearly six screen pixels of solid line.

    Fractions below 1 let librsvg antialias instead, which does two useful
    things at once: the line comes out around a screen pixel wide, and it is
    automatically dimmer, because a 0.45px line spread over a whole pixel
    arrives at roughly half the intensity. Peak value in the output is 180
    rather than 255, so the mask is faint before the shader even touches it.

      stroke 0.45 -> 1.15 screen px
      stroke 0.40 -> 1.02 screen px
      stroke 0.85 -> 2.17 screen px   Bangladesh, about double the rest
  */
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
<rect width="${w}" height="${h}" fill="#000"/>
<g fill="none" stroke-linejoin="round" stroke-linecap="round">
<path d="${path(coast)}" stroke="#787878" stroke-width="0.45"/>
<path d="${path(inland)}" stroke="#5a5a5a" stroke-width="0.4"/>
<path d="${path(bd)}" stroke="#b4b4b4" stroke-width="0.85"/>
</g>
</svg>`

  return () => sharp(Buffer.from(svg)).removeAlpha().greyscale()
}

/*
  The land against water decision, rasterised from the SAME dataset the border
  lines are drawn from: Natural Earth via world-atlas, 50m. That is the whole
  point: the border lines can never again sit off the coastline, because both
  come from one cartography. The Blue Marble blue dominance test this replaces
  judged land pixel by pixel from colour, which disagreed with Natural Earth
  by a few pixels along every coast.

  A slight blur keeps the coast transition continuous, which the packing
  depends on: the old colour test's soft ramp is what made the single channel
  seamless across the shoreline.
*/
async function coastMask([w, h]) {
  const topo = JSON.parse(
    readFileSync(resolve(root, 'node_modules/world-atlas/land-50m.json'), 'utf8'),
  )
  const projection = geoEquirectangular()
    .translate([w / 2, h / 2])
    .scale(w / (2 * Math.PI))
  const path = geoPath(projection)
  const land = feature(topo, topo.objects.land)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
<rect width="${w}" height="${h}" fill="#000"/>
<path d="${path(land)}" fill="#fff"/>
</svg>`

  return sharp(Buffer.from(svg)).removeAlpha().greyscale().blur(0.7).raw().toBuffer()
}

/*
  The land silhouette, as a single greyscale channel.

  The planet's colour is generated in the shader, not sampled from an albedo
  map, so nothing here needs to carry colour. All the surface texture needs to
  say is where land is and roughly how bright it is, which is one channel and a
  fraction of the bytes.
*/
async function landMask(daySrc, bathSrc, ne, [w, h]) {
  const base = await sharp(daySrc).resize(w, h, { fit: 'fill' }).removeAlpha().toBuffer()
  const { data } = await sharp(base).raw().toBuffer({ resolveWithObject: true })
  const depth = await sharp(bathSrc)
    .resize(w, h, { fit: 'fill' })
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer()

  const n = w * h
  const out = Buffer.alloc(n)

  for (let i = 0; i < n; i++) {
    const r = data[i * 3]
    const g = data[i * 3 + 1]
    const b = data[i * 3 + 2]
    const lum = r * 0.299 + g * 0.587 + b * 0.114
    /* Land against water comes from the rasterised Natural Earth mask now,
       already softened at the edge so the packing stays continuous. */
    const ocean = 1 - ne[i] / 255

    /*
      One channel, two signals. Ocean depth uses the bottom half of the range
      and land brightness the top.

      Depth comes from the GEBCO grid, not from Blue Marble's own ocean
      shading: GEBCO has real trenches, ridges and shelves. The squared curve
      stretches the shelf against the abyss: GEBCO puts continental shelf near
      the top of its range and deep ocean near the middle, and squaring pushes
      the deeps down while barely touching the shallows, so the bright coastal
      shelf falls away into properly dark open ocean.
    */
    const dn = depth[i] / 255
    const deep = 0.5 * dn * dn
    const high = 0.5 + 0.5 * Math.min(1, lum / 255)
    out[i] = clamp((deep * ocean + high * (1 - ocean)) * 255)
  }

  return () => sharp(out, { raw: { width: w, height: h, channels: 1 } })
}

async function writeGraded(name, make, quality) {
  const out = await make().webp({ quality, effort: 6 }).toBuffer()
  writeFileSync(resolve(outDir, name), out)
  total += out.length
  const meta = await sharp(out).metadata()
  console.log(`  wrote ${name.padEnd(20)} ${meta.width}x${meta.height}  ${kb(out.length)}`)
}

/*
  Clouds stay a separate texture on their own shell. This was measured, not
  assumed.

  NASA publishes no cloud composited map worth using: the land_ocean_ice_cloud
  records only exist at 2048 and the Black Marble has no cloud variant at all.
  Baking one here from the two full resolution sources was tried and is the
  wrong trade. Cloud detail is high frequency everywhere, including over ocean
  that otherwise compresses to almost nothing, so the combined image resists
  WebP badly:

    baked, one 8192 texture      q44 3579 kB   q52 3983 kB   q66 4853 kB
    separate                     day 8192 q68 1709 kB + clouds 3072 q64 856 kB

  Separate is a megabyte smaller at a quality the baked version cannot reach at
  any setting, and it keeps the shell's parallax at the limb. The shell is
  parented to the surface group in the scene, so it behaves exactly as a baked
  texture would: no motion of its own.
*/
console.log('City lights')
const night = await grab(SETS.night, 'try')
used.push(['lights.webp', night.licence, night.url])
/*
  Sharpened, not just downsampled.

  City lights are the only surface detail on this planet, so they carry the
  whole render and a soft one reads as a blur rather than as cities. Downsampling
  a 13500 wide source is inherently softening, so the resample is followed by an
  unsharp pass and a contrast lift that pulls the dim halo around each
  conurbation down toward black while leaving the cores bright.

  It also compresses better afterwards, because the crushed halo is flat.
*/
await write('lights.webp', night.buf, SIZES.lights, (p) =>
  p
    .removeAlpha()
    .sharpen({ sigma: 0.7, m1: 0.6, m2: 2.4 })
    /*
      Crushed harder than looks reasonable. Black Marble carries a dim blue grey
      wash over unlit land, not just the lights themselves, and on a planet
      whose only surface data is this map that wash renders the whole night side
      purple. The shader also thresholds it, but taking it out here means the
      flattened areas compress instead of costing bytes.
    */
    .linear(1.45, -30)
    .webp({ quality: 62, effort: 6 }),
)

console.log('Land silhouette and ocean depth')
const day = await grab(SETS.day, 'try')
const bath = await grab(SETS.bath, 'try')
const ne = await coastMask(SIZES.land)
used.push(['land.webp', `${day.licence} + ${bath.licence} + Natural Earth`, bath.url])
await writeGraded('land.webp', await landMask(day.buf, bath.buf, ne, SIZES.land), 60)

console.log('Country outlines')
used.push(['borders.webp', 'Natural Earth via world-atlas, public domain', 'countries-50m'])
/* Quality 86, higher than anything else here. Lossy compression smears one
   pixel lines, and smearing was half of why these read as blurry. */
await writeGraded('borders.webp', await borderMask(SIZES.borders), 86)

/*
  Deep space background. A supplied plate, not a fetched one: the rendered star
  shell was replaced by a CSS background on .hero-base, so this just optimises
  the source PNG sitting in the repo root. Both formats, picked by image-set().
*/
console.log('Galaxy background')
const galaxySrc = resolve(root, 'Galaxy BG.png')
if (existsSync(galaxySrc)) {
  const g = readFileSync(galaxySrc)
  /* The source plate is green; the site's palette moved to a blue planet with
     gold accents, so the hue rotates to match. Keep in sync with the values
     used when the plate was regenerated. */
  const webp = await sharp(g).modulate({ hue: 100, saturation: 0.95 }).webp({ quality: 86, effort: 6 }).toBuffer()
  const avif = await sharp(g).modulate({ hue: 100, saturation: 0.95 }).avif({ quality: 58, effort: 6 }).toBuffer()
  writeFileSync(resolve(outDir, 'galaxy.webp'), webp)
  writeFileSync(resolve(outDir, 'galaxy.avif'), avif)
  total += webp.length + avif.length
  console.log(`  galaxy.webp ${kb(webp.length)}, galaxy.avif ${kb(avif.length)}`)
  used.push(['galaxy.webp/avif', 'supplied artwork', 'Galaxy BG.png'])
} else {
  console.log('  Galaxy BG.png not found in the repo root, skipped')
}

/*
  The cloud coverage, enhanced at bake time.

  The NASA composite is real weather, which is why its large shapes are right,
  but at 2560 wide its edges are soft and its interiors flat, and on the cloud
  shell that read as a wrapped sheet. Two fixes, both baked here so they cost
  the runtime nothing:

    domain warp   the source is resampled through a low frequency warp field,
                  which curls every straight satellite-blurred edge the way
                  shear actually deforms a cloud bank
    fBm detail    value noise fBm, pulled through the same warp so it marbles
                  instead of tiling, added only where the map is mid grey. The
                  cores and the clear sky are untouched, so every weather
                  system keeps its identity; the edges pick up billow.

  Every octave of both fields is periodic in x, so the seam where the map
  wraps around the globe stays invisible.
*/
async function cloudMask(src, [w, h]) {
  const base = await sharp(src)
    .resize(w, h, { fit: 'fill' })
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer()

  /* Deterministic permutation, so the bake is reproducible run to run. */
  let seed = 0x2f6e2b1
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]

  const fade = (t) => t * t * (3 - 2 * t)
  /* Value noise on an integer lattice, wrapped in x at `px` cells so every
     octave tiles across the map seam. px never exceeds 256 here, so the
     & 255 after the modulo is the identity, not a second wrap. */
  const cell = (ix, iy, px) => perm[(perm[(((ix % px) + px) % px) & 255] + (iy & 255)) & 511] / 255
  const vnoise = (x, y, px) => {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const u = fade(x - ix)
    const v = fade(y - iy)
    const a = cell(ix, iy, px)
    const b = cell(ix + 1, iy, px)
    const c = cell(ix, iy + 1, px)
    const d = cell(ix + 1, iy + 1, px)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
  /* u, v in map units. Octaves double from f0 cells across the width; half a
     cell vertically per horizontal cell keeps them square on a 2:1 map. */
  const fbm = (u, v, f0, oct, off) => {
    let amp = 0.5
    let sum = 0
    let norm = 0
    let f = f0
    for (let o = 0; o < oct; o++) {
      sum += amp * vnoise(u * f + off, v * f * 0.5 + off * 1.93, f)
      norm += amp
      amp *= 0.55
      f *= 2
    }
    return sum / norm
  }

  /* Bilinear read of the source, wrapping in x, so the warp can pull from
     across the seam without a discontinuity. */
  const tap = (u, v) => {
    const x = (u - Math.floor(u)) * w
    const y = Math.min(Math.max(v * h, 0), h - 1.001)
    const x0 = Math.floor(x) % w
    const y0 = Math.floor(y)
    const x1 = (x0 + 1) % w
    const y1 = Math.min(y0 + 1, h - 1)
    const fx = x - Math.floor(x)
    const fy = y - y0
    const a = base[y0 * w + x0]
    const b = base[y0 * w + x1]
    const c = base[y1 * w + x0]
    const d = base[y1 * w + x1]
    return (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) / 255
  }

  const out = Buffer.alloc(w * h)
  for (let yp = 0; yp < h; yp++) {
    const v = (yp + 0.5) / h
    for (let xp = 0; xp < w; xp++) {
      const u = (xp + 0.5) / w
      /* The warp field. Low frequency, because shear is a large scale force:
         a high frequency warp reads as jitter, not weather. */
      const wx = fbm(u, v, 6, 3, 41.7) - 0.5
      const wy = fbm(u, v, 6, 3, 17.3) - 0.5
      /* The source, pulled through a small warp: enough to curl an edge,
         never enough to move a weather system off its geography. */
      const bn = tap(u + wx * 0.006, v + wy * 0.006)
      /* The billow, through a warp eight times stronger, which is what makes
         it marble rather than sit on the map as a regular grain. */
      const dn = fbm(u + wx * 0.05, v + wy * 0.05, 8, 6, 0)
      /* Mid grey mask: detail lives on the edges of the systems, peaking at
         50% coverage and vanishing in solid cores and clear sky. */
      const edge = bn * (1 - bn) * 4
      out[yp * w + xp] = clamp((bn + (dn - 0.5) * 0.34 * edge) * 255)
    }
  }

  /* Same density curve the flat bake used: crush the thin haze, keep cores. */
  return () => sharp(out, { raw: { width: w, height: h, channels: 1 } }).linear(1.55, -28)
}

console.log('Cloud layer')
const cloud = await grab(SETS.clouds, 'try')
used.push(['clouds.webp', `${cloud.licence}, edges detail enhanced at bake`, cloud.url])
await writeGraded('clouds.webp', await cloudMask(cloud.buf, SIZES.clouds), 58)

console.log('Tour panorama')
const tour = await grab(SETS.tour, 'try')
used.push(['tour.webp', tour.licence, tour.url])
await write('tour.webp', tour.buf, [4096, 2048], (p) => p.webp({ quality: 68, effort: 6 }))

console.log(`\nTotal texture payload: ${kb(total)}\n`)
console.log('Attribution, for docs/09-asset-manifest.md:')
for (const [file, licence, url] of used) console.log(`  ${file.padEnd(20)} ${licence}\n    ${url}`)
