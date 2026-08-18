/**
 * Re-derives the globe's framing constants from the places list, so adding or
 * moving a market is `npm run solve` instead of hand-tuning five numbers.
 *
 * Reads content/globe.ts (light regex parse; the file is data). Prints the
 * constant block for components/globe/earth-scene.ts plus the verification
 * tables that originally justified each value. It changes no files: the
 * numbers are reviewed and pasted, because framing is a taste call and the
 * solver only proposes.
 *
 * What it solves, in dependency order:
 *   TOUR_AXIS     the pole minimising the spread of dot products against all
 *                 places: the small circle the camera vantage rides
 *   TOUR_RADIUS   mean angular radius of that circle
 *   ENTRY         spin and crop Y landing the origin at ndc (0.24, -0.20)
 *                 with the approved vantage of -10
 *   DIP           cosine windowed vantage correction, grid searched so every
 *                 market passes the entry sweet spot with the others pinned
 *   SHOWCASE      candidate spins for the settled view, with each market's
 *                 screen position printed for choosing
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/* ------------------------------------------------------------ input */

const source = readFileSync(resolve(root, 'content/globe.ts'), 'utf8')
const places = [...source.matchAll(
  /id:\s*'([^']+)'[^}]*?lon:\s*(-?[\d.]+)[^}]*?lat:\s*(-?[\d.]+)/g,
)].map(([, id, lon, lat]) => ({ id, lon: Number(lon), lat: Number(lat) }))

if (places.length < 3) {
  console.error('Could not parse places from content/globe.ts')
  process.exit(1)
}
const origin = places.find((p) => p.id === 'origin')
if (!origin) {
  console.error('No origin place found')
  process.exit(1)
}
console.log(`places: ${places.map((p) => p.id).join(', ')}\n`)

/* ------------------------------------------------------------- math */

const D = Math.PI / 180
const v3 = (x, y, z) => ({ x, y, z })
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z
const norm = (a) => {
  const l = Math.sqrt(dot(a, a))
  return v3(a.x / l, a.y / l, a.z / l)
}
const toVector = (lon, lat, r) => {
  const phi = (90 - lat) * D
  const th = (lon + 180) * D
  return v3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th))
}
const Ry = (v, a) =>
  v3(v.x * Math.cos(a) + v.z * Math.sin(a), v.y, -v.x * Math.sin(a) + v.z * Math.cos(a))
const Rx = (v, a) =>
  v3(v.x, v.y * Math.cos(a) - v.z * Math.sin(a), v.y * Math.sin(a) + v.z * Math.cos(a))

/* Scene constants that framing depends on. Keep in sync with earth-scene. */
const CAM_Z = 3.6
const TAN = Math.tan(21 * D)
const FRAME_H = CAM_Z * TAN
const ASPECT = 16 / 9
const REFERENCE = { r: 1.826, x: 0.607 }
const ZOOM = 0.86
const ENTRY_VANTAGE = -10
const SPOT = { x: 0.24, y: -0.2 }

/* ------------------------------------------------ 1. the tour axis */

const vecs = places.map((p) => toVector(p.lon, p.lat, 1))
let bestPole = null
for (let lat = 30; lat <= 89; lat += 0.25) {
  for (let lon = -180; lon < 180; lon += 0.5) {
    const pole = toVector(lon, lat, 1)
    const dots = vecs.map((v) => dot(v, pole))
    const spread = Math.max(...dots) - Math.min(...dots)
    if (!bestPole || spread < bestPole.spread) bestPole = { lon, lat, spread }
  }
}
const AXIS = { lon: Math.round(bestPole.lon * 10) / 10, lat: Math.round(bestPole.lat * 10) / 10 }
const pole = toVector(AXIS.lon, AXIS.lat, 1)
const meanDot = vecs.reduce((s, v) => s + dot(v, pole), 0) / vecs.length
const RADIUS = Math.round((Math.acos(meanDot) / D) * 10) / 10

console.log('TOUR_AXIS')
console.log(`  { lon: ${AXIS.lon}, lat: ${AXIS.lat} }   radius ${RADIUS}`)
console.log('  co-latitude from the fitted axis vs the north pole:')
for (const p of places) {
  const v = toVector(p.lon, p.lat, 1)
  const fromAxis = Math.acos(Math.min(1, Math.max(-1, dot(v, pole)))) / D
  const fromPole = 90 - p.lat
  console.log(`    ${p.id.padEnd(14)} ${fromAxis.toFixed(1).padStart(6)}   ${(90 - fromPole).toFixed(1).padStart(6)}`)
}

/* --------------------------------------------- 2. the vantage path */

const POLE_COLAT = (90 - AXIS.lat) * D
const POLE_THETA = (AXIS.lon + 180) * D
const PATH_COS = Math.cos(RADIUS * D)
const pathLat = (spin) => {
  const q = Math.sin(POLE_COLAT) * Math.cos(Math.PI / 2 - spin - POLE_THETA)
  const r = Math.hypot(Math.cos(POLE_COLAT), q)
  const u = Math.atan2(q, Math.cos(POLE_COLAT)) + Math.acos(Math.max(-1, Math.min(1, PATH_COS / r)))
  return 90 - u / D
}

console.log('\npath latitude at each place (should pass within a few degrees):')
for (const p of places) {
  console.log(`  ${p.id.padEnd(14)} actual ${p.lat.toFixed(1).padStart(6)}   path ${pathLat((-90 - p.lon) * D).toFixed(1).padStart(6)}`)
}

/* ----------------------------------- 3. entry spin and crop, wide */

function project(local, spinDeg, vantageDeg, crop, aspect = ASPECT) {
  let p = Rx(Ry(local, spinDeg * D), vantageDeg * D)
  p = v3(p.x * crop.r * FRAME_H, p.y * crop.r * FRAME_H, p.z * crop.r * FRAME_H)
  const cx = crop.x * FRAME_H * aspect
  const cy = crop.y * FRAME_H
  const w = v3(p.x + cx, p.y + cy, p.z)
  const vz = w.z - CAM_Z
  const rel = norm(v3(w.x - cx, w.y - cy, w.z))
  return { x: w.x / (-vz * TAN * aspect), y: w.y / (-vz * TAN), front: rel.z > 0.06 }
}

const originV = toVector(origin.lon, origin.lat, 1)
const crop = { r: REFERENCE.r * ZOOM, x: REFERENCE.x * ZOOM, y: -0.95 }
let entrySpin = 150
for (let i = 0; i < 200; i++) {
  const p = project(originV, entrySpin, ENTRY_VANTAGE, crop)
  entrySpin += (SPOT.x - p.x) * 30
}
for (let i = 0; i < 80; i++) {
  const p = project(originV, entrySpin, ENTRY_VANTAGE, crop)
  crop.y += (SPOT.y - p.y) * 0.6
}
entrySpin = ((Math.round(entrySpin) % 360) + 360) % 360
const pe = project(originV, entrySpin, ENTRY_VANTAGE, crop)
console.log('\nENTRY')
console.log(`  { lat: ${ENTRY_VANTAGE}, spin: ${entrySpin} }   CROP_ENTRY.y ${crop.y.toFixed(3)}`)
console.log(`  origin lands at ndc (${pe.x.toFixed(2)}, ${pe.y.toFixed(2)})  sky ${(((1 - (crop.y + crop.r)) / 2) * 100).toFixed(0)}%`)

/* ------------------------------------------------- 4. the US dip */

const DROP = ENTRY_VANTAGE - pathLat(entrySpin * D)
const wrap360 = (a) => ((a % 360) + 360) % 360

function missWithDip(place, dip) {
  const local = toVector(place.lon, place.lat, 1)
  let best = Infinity
  for (let i = 0; i < 2880; i++) {
    const sd = entrySpin + i * 0.125
    let bump = 0
    if (dip) {
      let dd = wrap360(sd) - dip.centre
      if (dd > 180) dd -= 360
      if (dd < -180) dd += 360
      if (Math.abs(dd) < dip.width) bump = -dip.depth * 0.5 * (1 + Math.cos((Math.PI * dd) / dip.width))
    }
    const van = pathLat(sd * D) + DROP + bump
    const p = project(local, sd, van, crop)
    if (!p.front || p.x < -0.95 || p.x > 0.95 || p.y < -0.95 || p.y > 0.95) continue
    best = Math.min(best, Math.hypot(p.x - SPOT.x, p.y - SPOT.y))
  }
  return best
}

const baseline = new Map(places.map((p) => [p.id, missWithDip(p, null)]))
const worst = [...baseline.entries()].filter(([id]) => id !== 'origin').sort((a, b) => b[1] - a[1])[0]
console.log('\nbaseline misses against the sweet spot:')
for (const [id, m] of baseline) console.log(`  ${id.padEnd(14)} ${m.toFixed(2)}`)

let bestDip = null
if (worst && worst[1] > 0.3) {
  for (let centre = 250; centre <= 360; centre += 5) {
    for (let width = 45; width <= 85; width += 10) {
      for (let depth = 6; depth <= 22; depth += 2) {
        const dip = { centre, width, depth }
        let ok = true
        for (const p of places) {
          if (p.id === worst[0]) continue
          if (Math.abs(missWithDip(p, dip) - baseline.get(p.id)) > 0.02) { ok = false; break }
        }
        if (!ok) continue
        const m = missWithDip(places.find((p) => p.id === worst[0]), dip)
        if (!bestDip || m < bestDip.miss) bestDip = { ...dip, miss: m }
      }
    }
  }
}
console.log('\nDIP')
if (bestDip) {
  console.log(`  { centre: ${bestDip.centre}, width: ${bestDip.width}, depth: ${bestDip.depth} }`)
  console.log(`  ${worst[0]} miss ${worst[1].toFixed(2)} -> ${bestDip.miss.toFixed(2)}, others pinned within 0.02`)
} else {
  console.log('  none needed: every market already passes within 0.3 of the spot')
}

/* --------------------------------------------------- 5. showcase */

const full = { r: 0.6, x: 0.3, y: 0.02 }
console.log('\nSHOWCASE candidates (market ndc at the full ball, pick by eye):')
for (let spin = 0; spin < 360; spin += 15) {
  const van = pathLat(spin * D)
  const pts = places
    .filter((p) => p.id !== 'origin')
    .map((p) => project(toVector(p.lon, p.lat, 1), spin, van, full))
  const visible = pts.filter((p) => p.front && Math.abs(p.x) < 1 && Math.abs(p.y) < 1).length
  if (visible < places.length - 1) continue
  const desc = places
    .filter((p) => p.id !== 'origin')
    .map((p, i) => `${p.id} (${pts[i].x.toFixed(2)},${pts[i].y.toFixed(2)})`)
    .join('  ')
  console.log(`  spin ${String(spin).padStart(3)}  vantage ${van.toFixed(0).padStart(3)}  ${desc}`)
}
console.log('\nDone. Paste chosen values into components/globe/earth-scene.ts.')
