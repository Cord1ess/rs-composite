/**
 * Regenerates public/textures/hero-fallback.webp from the live globe, so the
 * static fallback that gated and failed visitors see can never again drift
 * behind the real design.
 *
 *   npm run fallback     (dev server must be running on :3000)
 *
 * Captures the hero with the tour frozen (same tune-seed trick as the verify
 * harness) and every DOM layer that does not belong in the bake hidden: the
 * fixed chrome (header, badges, dev button), the hero copy, the scrim (it
 * still renders above the fallback at runtime, so baking it in would apply
 * it twice) and the marker overlay. What remains is the galaxy plate and the
 * planet: exactly the layers the fallback replaces.
 */

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require('puppeteer-core')
const sharp = require('sharp')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'public/textures/hero-fallback.webp')

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
  args: ['--enable-unsafe-swiftshader', '--window-size=1600,900'],
  defaultViewport: { width: 1600, height: 900 },
})
const page = await browser.newPage()
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('earth-tune-v1', JSON.stringify({ $tourSpin: 0, $cloudLag: 0 }))
})
await page.goto(process.env.GLOBE_URL ?? 'http://localhost:3000', {
  waitUntil: 'networkidle2',
  timeout: 60000,
})
/* Same waits as the verify harness: the tune panel must be mounted (it
   carries the freeze seed through the bus) and the reveal must have
   happened, both immune to dev-server compile latency. */
await page.waitForSelector('button[aria-label="Earth tuning panel"]', { timeout: 60000 })
await page.waitForFunction(
  () =>
    document.querySelector('canvas') && document.documentElement.style.overflow !== 'hidden',
  { timeout: 60000 },
)
await new Promise((r) => setTimeout(r, 8000))

await page.evaluate(() => {
  const hide = (el) => {
    el.style.visibility = 'hidden'
  }
  document.querySelectorAll('.hero-copy, .hero-network, .hero-scrim, .globe-leaders').forEach(hide)
  /* Marker dots and hover layers are siblings of the canvas. */
  document.querySelectorAll('canvas ~ div, canvas ~ svg').forEach(hide)
  /* All fixed chrome: header, dev button, badges. */
  for (const el of document.body.querySelectorAll('*')) {
    if (getComputedStyle(el).position === 'fixed') hide(el)
  }
})
await new Promise((r) => setTimeout(r, 400))

const png = await page.screenshot()
await browser.close()

const webp = await sharp(png).webp({ quality: 72, effort: 6 }).toBuffer()
await sharp(webp).toFile(out)
console.log(`hero-fallback.webp rebaked: ${(webp.length / 1024).toFixed(0)} kB`)
