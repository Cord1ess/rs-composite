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
  /* The shell's coverage channel. 3072 (audit IV, M1: the NASA + Patterson
     blend) plus the fBm detail baked in by cloudMask. */
  clouds: [3072, 1536],
}

/* Natural Earth 10m GeoJSON (audit IV, M2): five times the coastline and
   border detail of the 50m topojson, feeding the border SDF and the
   land/water mask. Bake-time only. */
const NE10M = {
  countries: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson',
  boundaries: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_boundary_lines_land.geojson',
  coastline: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_coastline.geojson',
  land: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson',
}

/*
  Art-direction switches (audit IV). Each is a one-line flip and a re-bake.

  BMNG_MONTH (M3): which month of the Blue Marble 2004 series feeds land
  brightness, the ice gate and the night-light snow suppression. September
  confines the rendered ice caps to true ice sheets (Greenland, the
  Himalaya); December drapes the whole boreal north in snow.

  CLOUD_SOURCE (M1, revised on review): 'blend' takes the per-pixel maximum
  of the NASA MODIS composite (dense, wide coverage) and Patterson's
  hand-cleaned storm deck (strong system structure) — the owner found
  Patterson alone too sparse. 'storm', 'fair' and 'nasa' select a single
  source.

  STARFIELD (M7): 'eso' grades the real Milky Way panorama (ESO/S. Brunier,
  CC BY 4.0 — keep the credit in the asset manifest); 'plate' uses the
  supplied Galaxy BG.png as before.
*/
const BMNG_MONTH = '200409'
const CLOUD_SOURCE = 'blend'
const STARFIELD = 'eso'

const BMNG_RECORDS = { '200409': 73801, '200412': 73909 }

const SETS = {
  day: [
    /* 28 MB, 21600 by 10800. The 5400 version was tried first and is not enough
       resolution once the globe is cropped this hard. */
    [`NASA Visible Earth BMNG ${BMNG_MONTH}, public domain`, `https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/${BMNG_RECORDS[BMNG_MONTH]}/world.topo.bathy.${BMNG_MONTH}.3x21600x10800.jpg`],
    ['NASA Visible Earth 5400, public domain', 'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg'],
  ],
  stars: [
    ['ESO/S. Brunier Milky Way panorama, CC BY 4.0', 'https://cdn.eso.org/images/large/eso0932a.jpg'],
  ],
  night: [
    ['NASA Black Marble 2016 3km, public domain', 'https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg'],
    ['NASA Black Marble 2016 0.1deg, public domain', 'https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg'],
  ],
  cloudsNasa: [
    ['NASA Blue Marble clouds 8k, public domain', 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif'],
    ['NASA Blue Marble clouds 2k, public domain', 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg'],
  ],
  cloudsPatterson: [
    [
      'Natural Earth III storm clouds (Tom Patterson), public domain',
      'http://shadedrelief.com/natural3/ne3_data/8192/clouds/storm_clouds_8k.jpg',
    ],
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

/** grab() for JSON sources: same cache, no image metadata. */
async function grabJson(url, label) {
  const cached = resolve(cacheDir, createHash('sha1').update(url).digest('hex'))
  if (existsSync(cached)) {
    console.log(`  ${label}: cached`)
    return JSON.parse(readFileSync(cached, 'utf8'))
  }
  process.stdout.write(`  ${label}: ${new URL(url).host} ... `)
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`)
  const text = await res.text()
  console.log(`ok, ${mb(Buffer.byteLength(text))}`)
  writeFileSync(cached, text)
  return JSON.parse(text)
}

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
async function borderSDF([w, h]) {
  /*
    Distance fields, not strokes (the third border pipeline, and the last).

    A rasterised stroke can never beat the texture's own resolution: at the
    entry crop one border texel spans ~2.55 screen pixels, so a one-texel
    line magnified bilinearly is 2.5 px of blur before the shader even
    samples it, and every attempt to thin the stroke just dimmed it. The
    field flips the problem: each channel stores DISTANCE to the nearest
    line (R: every border, G: Bangladesh), and the shader draws a line of
    exact screen-pixel width with fwidth, the same trick font rendering
    uses. Crisp at the entry magnification, crisp at the ball view, and the
    widths become live tunables instead of bake-time commitments.

    Rasterised at 2x so the line skeleton is sub-texel thin after the 2x
    min-downsample; distances via a two-pass chamfer transform (exact
    enough at a 6-texel range), normalised so 1.0 = 6 texels. Lossless
    WebP: lossy would put wobble straight into line geometry.
  */
  const W = w * 2
  const H = h * 2
  /* Natural Earth 10m (audit IV, M2): the coastline and the de facto
     boundary lines ship as ready-made linework, so no topology juggling;
     Bangladesh's own ring comes from the countries file. */
  const projection = geoEquirectangular()
    .translate([W / 2, H / 2])
    .scale(W / (2 * Math.PI))
  const path = geoPath(projection)

  const coast = await grabJson(NE10M.coastline, 'coastline 10m')
  const inland = await grabJson(NE10M.boundaries, 'boundaries 10m')
  const countries = await grabJson(NE10M.countries, 'countries 10m')
  const bd = countries.features.find(
    (f) => (f.properties.ADMIN ?? f.properties.NAME) === 'Bangladesh',
  )
  if (!bd) throw new Error('Bangladesh not found in ne_10m_admin_0_countries')

  const rasterize = async (paths) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#000"/>
<g fill="none" stroke="#fff" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round">
${paths.map((d) => `<path d="${d}"/>`).join('\n')}
</g>
</svg>`
    return sharp(Buffer.from(svg)).removeAlpha().greyscale().raw().toBuffer()
  }

  /* Two-pass 3x3 chamfer distance transform, float. Seeded from the
     ANTI-ALIASED raster, not a binary threshold: a partially covered pixel
     starts at a fractional distance, which recovers the centreline's
     sub-texel position — binary seeds quantise the line to the raster grid
     and every diagonal renders as a staircase. Accuracy is within a few
     percent of Euclidean, invisible at a six-texel range. */
  const chamfer = (seed) => {
    const d = new Float32Array(W * H).fill(1e9)
    for (let i = 0; i < W * H; i++) {
      if (seed[i] > 16) d[i] = 1 - seed[i] / 255
    }
    const D = Math.SQRT2
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        let v = d[i]
        if (x > 0 && d[i - 1] + 1 < v) v = d[i - 1] + 1
        if (y > 0) {
          if (d[i - W] + 1 < v) v = d[i - W] + 1
          if (x > 0 && d[i - W - 1] + D < v) v = d[i - W - 1] + D
          if (x < W - 1 && d[i - W + 1] + D < v) v = d[i - W + 1] + D
        }
        d[i] = v
      }
    }
    for (let y = H - 1; y >= 0; y--) {
      for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x
        let v = d[i]
        if (x < W - 1 && d[i + 1] + 1 < v) v = d[i + 1] + 1
        if (y < H - 1) {
          if (d[i + W] + 1 < v) v = d[i + W] + 1
          if (x < W - 1 && d[i + W + 1] + D < v) v = d[i + W + 1] + D
          if (x > 0 && d[i + W - 1] + D < v) v = d[i + W - 1] + D
        }
        d[i] = v
      }
    }
    return d
  }

  console.log('  chamfer: all borders')
  const dAll = chamfer(await rasterize([path(coast), path(inland)]))
  console.log('  chamfer: bangladesh')
  const dBd = chamfer(await rasterize([path(bd)]))

  /* Min-downsample 2x (distances halve with the resolution), clamp at six
     texels, pack R = all borders, G = Bangladesh, B unused. */
  const MAXD = 6
  const out = Buffer.alloc(w * h * 3)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i0 = y * 2 * W + x * 2
      const a = Math.min(dAll[i0], dAll[i0 + 1], dAll[i0 + W], dAll[i0 + W + 1]) / 2
      const b = Math.min(dBd[i0], dBd[i0 + 1], dBd[i0 + W], dBd[i0 + W + 1]) / 2
      const o = (y * w + x) * 3
      out[o] = clamp((Math.min(a, MAXD) / MAXD) * 255)
      out[o + 1] = clamp((Math.min(b, MAXD) / MAXD) * 255)
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: 3 } })
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
  const projection = geoEquirectangular()
    .translate([w / 2, h / 2])
    .scale(w / (2 * Math.PI))
  const path = geoPath(projection)
  /* 10m land polygons (M2), same cartography family as the border SDF. */
  const land = await grabJson(NE10M.land, 'land 10m')

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
/*
  Ice suppression in the lights bake.

  Black Marble is not only city light: moonlit snow makes the Greenland ice
  sheet (and high mountain snowfields) genuinely bright in the source, and
  the shader's city terms then tint that broad wash gold. Gold over the
  planet's dark blue land reads BROWN, which is exactly what Greenland did
  at the terminator. The wash is not city light, so it dies in the bake:
  wherever the day map says the ground is bright AND unsaturated (snow and
  ice; deserts are bright but saturated and keep their wash), the night
  energy is cut by 85%. City cores are point features on darker terrain and
  never meet both tests.
*/
async function lightsMask(nightSrc, daySrc, [w, h]) {
  const night = await sharp(nightSrc).resize(w, h, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  const day = await sharp(daySrc).resize(w, h, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

  const n = w * h
  for (let i = 0; i < n; i++) {
    const o = i * 3
    const r = day[o] / 255
    const g = day[o + 1] / 255
    const b = day[o + 2] / 255
    const hi = Math.max(r, g, b)
    const lo = Math.min(r, g, b)
    const sat = hi > 0 ? (hi - lo) / hi : 0
    const ice = smooth((hi - 0.55) / 0.2) * smooth((0.16 - sat) / 0.1)
    if (ice > 0) {
      const f = 1 - 0.85 * ice
      night[o] = Math.round(night[o] * f)
      night[o + 1] = Math.round(night[o + 1] * f)
      night[o + 2] = Math.round(night[o + 2] * f)
    }
  }

  return () =>
    sharp(night, { raw: { width: w, height: h, channels: 3 } })
      .sharpen({ sigma: 0.7, m1: 0.6, m2: 2.4 })
      .linear(1.45, -30)
}

console.log('City lights')
const night = await grab(SETS.night, 'try')
/* The day map is fetched here for the ice test; the land step's own grab
   below hits the cache, so the bytes only ever download once. */
const dayForIce = await grab(SETS.day, 'try')
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
/* Sharpen and crush live inside lightsMask now, applied after the ice
   suppression. The crush (linear 1.45, -30) stays as hard as ever: Black
   Marble's dim blue-grey wash over unlit land would render the night side
   purple, and flattening it here compresses instead of costing bytes. */
await writeGraded('lights.webp', await lightsMask(night.buf, dayForIce.buf, SIZES.lights), 62)

console.log('Land silhouette and ocean depth')
const day = await grab(SETS.day, 'try')
const bath = await grab(SETS.bath, 'try')
const ne = await coastMask(SIZES.land)
used.push(['land.webp', `${day.licence} + ${bath.licence} + Natural Earth`, bath.url])
await writeGraded('land.webp', await landMask(day.buf, bath.buf, ne, SIZES.land), 60)

console.log('Country outlines')
used.push(['borders.webp', 'Natural Earth via world-atlas, public domain', 'countries-50m'])
{
  const sdf = await borderSDF(SIZES.borders)
  const buf = await sdf.webp({ lossless: true, effort: 6 }).toBuffer()
  writeFileSync(resolve(outDir, 'borders.webp'), buf)
  total += buf.length
  console.log(`  wrote ${'borders.webp'.padEnd(20)} ${SIZES.borders[0]}x${SIZES.borders[1]}  ${kb(buf.length)}`)
}

/*
  Deep space background. A supplied plate, not a fetched one: the rendered star
  shell was replaced by a CSS background on .hero-base, so this just optimises
  the source PNG sitting in the repo root. Both formats, picked by image-set().
*/
console.log('Galaxy background')
if (STARFIELD === 'eso') {
  /*
    The real sky (audit IV, M7): ESO's Milky Way panorama, graded into the
    site's world. Cover-cropped to the galactic band, dimmed well below the
    planet's brightness, desaturated, and cooled with a blue-leaning tint
    so the warm dust lanes can't reintroduce the purple-halo fight. CC BY:
    the ESO/S. Brunier credit must ship in the asset manifest.
  */
  const stars = await grab(SETS.stars, 'try')
  const grade = () =>
    sharp(stars.buf)
      .resize(2048, 1152, { fit: 'cover', position: 'centre' })
      .modulate({ brightness: 0.62, saturation: 0.72 })
      .tint({ r: 168, g: 200, b: 255 })
      /* Lift the band's mids, hold the black floor. */
      .linear(1.06, -8)
  const webp = await grade().webp({ quality: 86, effort: 6 }).toBuffer()
  const avif = await grade().avif({ quality: 58, effort: 6 }).toBuffer()
  writeFileSync(resolve(outDir, 'galaxy.webp'), webp)
  writeFileSync(resolve(outDir, 'galaxy.avif'), avif)
  total += webp.length + avif.length
  console.log(`  galaxy.webp ${kb(webp.length)}, galaxy.avif ${kb(avif.length)}`)
  used.push(['galaxy.webp/avif', stars.licence, stars.url])
} else {
  const galaxySrc = resolve(root, 'Galaxy BG.png')
  if (existsSync(galaxySrc)) {
    const g = readFileSync(galaxySrc)
    /* The source plate is green; the site's palette moved to a blue planet
       with gold accents, so the hue rotates to match. */
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

  /* Softer crush than the original (1.55, -28): the owner asked for more,
     more spread-out cloud, and the old curve was killing exactly the mid
     density coverage that reads as weather across open ocean. */
  return () => sharp(out, { raw: { width: w, height: h, channels: 1 } }).linear(1.38, -18)
}

console.log('Cloud layer')
if (CLOUD_SOURCE === 'blend') {
  /*
    The blend (owner review of M1): Patterson's storm deck alone read as
    too sparse. The per-pixel MAX of the NASA composite and the Patterson
    deck keeps NASA's dense, spread coverage everywhere and lets
    Patterson's cleaned storm systems punch through where they are the
    stronger signal — more cloud, better structure, no seam risk since
    both are full-coverage equirectangular.
  */
  const nasa = await grab(SETS.cloudsNasa, 'try')
  const patterson = await grab(SETS.cloudsPatterson, 'try')
  const [w, h] = SIZES.clouds
  const a = await sharp(nasa.buf).resize(w, h, { fit: 'fill' }).removeAlpha().greyscale().raw().toBuffer()
  const b = await sharp(patterson.buf).resize(w, h, { fit: 'fill' }).removeAlpha().greyscale().raw().toBuffer()
  for (let i = 0; i < a.length; i++) if (b[i] > a[i]) a[i] = b[i]
  const blended = await sharp(a, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer()
  used.push(['clouds.webp', `${nasa.licence} + ${patterson.licence}, max-blended`, patterson.url])
  await writeGraded('clouds.webp', await cloudMask(blended, SIZES.clouds), 58)
} else {
  const cloud = await grab(CLOUD_SOURCE === 'nasa' ? SETS.cloudsNasa : SETS.cloudsPatterson, 'try')
  used.push(['clouds.webp', `${cloud.licence}, edges detail enhanced at bake`, cloud.url])
  await writeGraded('clouds.webp', await cloudMask(cloud.buf, SIZES.clouds), 58)
}

console.log('Tour panorama')
const tour = await grab(SETS.tour, 'try')
used.push(['tour.webp', tour.licence, tour.url])
await write('tour.webp', tour.buf, [4096, 2048], (p) => p.webp({ quality: 68, effort: 6 }))

console.log(`\nTotal texture payload: ${kb(total)}\n`)
console.log('Attribution, for docs/09-asset-manifest.md:')
for (const [file, licence, url] of used) console.log(`  ${file.padEnd(20)} ${licence}\n    ${url}`)
