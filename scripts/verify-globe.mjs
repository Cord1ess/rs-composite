/**
 * Golden-frame regression harness for the globe.
 *
 *   node scripts/verify-globe.mjs            compare against tests/golden
 *   node scripts/verify-globe.mjs --golden   (re)record the goldens
 *
 * Captures the hero entry frame and the settled showcase against the dev
 * server on :3000, with the tour spin and cloud drift frozen through the
 * tune system (localStorage is seeded before the app boots, the dev panel
 * replays it into the scene through the tune bus). That makes captures
 * repeatable; what noise remains (route pulse beads, dither) is absorbed by
 * the thresholds.
 *
 * Diffing is sharp-based: mean absolute difference per subpixel plus the
 * share of "hot" pixels (any channel off by more than 24). Both must pass.
 * Thresholds were set from measured back-to-back capture noise, times three.
 *
 * Chromium path and flags match the project's established headless workflow.
 */

import { mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require('puppeteer-core')
const sharp = require('sharp')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const goldenDir = resolve(root, 'tests/golden')
const outDir = resolve(root, 'tests/output')
mkdirSync(goldenDir, { recursive: true })
mkdirSync(outDir, { recursive: true })

const record = process.argv.includes('--golden')
const BASE = process.env.GLOBE_URL ?? 'http://localhost:3000'

/*
  The harness needs a running dev server. In a chained `npm run check` that
  may not exist; comparing against nothing helps nobody, so compare mode
  skips loudly (exit 0) while recording mode fails, because silently
  recording nothing would be worse. GLOBE_REQUIRE=1 makes the skip a
  failure for CI-style use.
*/
try {
  await fetch(BASE, { signal: AbortSignal.timeout(3000) })
} catch {
  if (record || process.env.GLOBE_REQUIRE === '1') {
    console.error(`FAIL: no dev server reachable at ${BASE}`)
    process.exit(1)
  }
  console.warn(`SKIP: no dev server reachable at ${BASE} — golden verify not run`)
  process.exit(0)
}

/* Per-view thresholds: mean abs subpixel diff, and % of pixels with any
   channel off by >24. The beads travelling the arcs are the main honest
   source of frame-to-frame noise. */
const VIEWS = [
  { name: 'entry', scroll: 0, mean: 1.6, hot: 0.8 },
  { name: 'showcase', scroll: 1400, mean: 1.6, hot: 0.8 },
]

async function capture(view) {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
    args: ['--enable-unsafe-swiftshader', '--window-size=1600,900'],
    defaultViewport: { width: 1600, height: 900 },
  })
  try {
    const page = await browser.newPage()
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
    /* Freeze the tour and the drift before any app code runs. */
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('earth-tune-v1', JSON.stringify({ $tourSpin: 0, $cloudLag: 0 }))
    })
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 })
    /* The freeze seed reaches the scene through the tune panel, and the
       panel body is a lazily compiled chunk in dev: captures must not
       start until it is mounted (its button in the DOM implies its effect
       has replayed the seed through the bus), or a slow first compile lets
       the drift run unfrozen and the capture is nondeterministic. */
    await page.waitForSelector('button[aria-label="Earth tuning panel"]', { timeout: 60000 })
    /* Anchor on the reveal, not the clock: the loading screen locks page
       scroll while it covers the hero and releases it when the curtain
       lifts. A flat wait raced dev-server compiles and caught mid-entrance
       frames; this waits out any compile, then gives the entrance and the
       arc draw-in a fixed settle. */
    await page.waitForFunction(
      () =>
        document.querySelector('canvas') &&
        document.documentElement.style.overflow !== 'hidden',
      { timeout: 60000 },
    )
    await new Promise((r) => setTimeout(r, 8000))
    if (view.scroll > 0) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), view.scroll)
      await new Promise((r) => setTimeout(r, 2500))
    }
    const path = resolve(outDir, `${view.name}.png`)
    await page.screenshot({ path })
    return path
  } finally {
    await browser.close()
  }
}

async function diff(aPath, bPath) {
  const [a, b] = await Promise.all(
    [aPath, bPath].map((p) => sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true })),
  )
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    return { mean: Infinity, hot: 100 }
  }
  let sum = 0
  let hot = 0
  const n = a.info.width * a.info.height
  for (let i = 0; i < n; i++) {
    const o = i * 4
    const dr = Math.abs(a.data[o] - b.data[o])
    const dg = Math.abs(a.data[o + 1] - b.data[o + 1])
    const db = Math.abs(a.data[o + 2] - b.data[o + 2])
    sum += dr + dg + db
    if (dr > 24 || dg > 24 || db > 24) hot++
  }
  return { mean: sum / (n * 3), hot: (hot / n) * 100 }
}

let failed = false
for (const view of VIEWS) {
  const shot = await capture(view)
  const golden = resolve(goldenDir, `${view.name}.png`)
  if (record) {
    await sharp(shot).toFile(golden)
    console.log(`  golden recorded: ${view.name}`)
    continue
  }
  if (!existsSync(golden)) {
    console.error(`  MISSING golden for ${view.name} — run with --golden first`)
    failed = true
    continue
  }
  const { mean, hot } = await diff(shot, golden)
  const ok = mean <= view.mean && hot <= view.hot
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'} ${view.name.padEnd(9)} mean ${mean.toFixed(3)} (max ${view.mean})  hot ${hot.toFixed(2)}% (max ${view.hot}%)`,
  )
  if (!ok) failed = true
}

if (record) console.log('Goldens written to tests/golden.')
process.exit(failed ? 1 : 0)
