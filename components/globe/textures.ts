/**
 * Texture acquisition for the globe: the generated noise tile, streaming
 * fetch with progress for the loading screen, and single channel extraction
 * to R8. DOM free, so it runs on the main thread or in the worker.
 */

import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RedFormat,
  RepeatWrapping,
  RGFormat,
} from 'three'

/*
  The water noise, precomputed.

  This used to be two octaves of procedural value noise in the fragment shader:
  eight sin() calls and a dozen mixes per fragment, across every fragment of a
  planet that fills most of the frame. As a 256 square tiling texture it is two
  cached reads. Same character, deterministic seed so every visitor sees the
  same water, mipmapped so the ball view does not shimmer.
*/
export function makeNoiseTexture(): DataTexture {
  const GRID = 32
  const SIZE = 256
  let seed = 987654321
  const rand = () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const grid = new Float32Array(GRID * GRID)
  for (let i = 0; i < grid.length; i++) grid[i] = rand()

  const smooth = (t: number) => t * t * (3 - 2 * t)
  const data = new Uint8Array(SIZE * SIZE)
  for (let y = 0; y < SIZE; y++) {
    const gy = (y / SIZE) * GRID
    const y0 = Math.floor(gy)
    const fy = smooth(gy - y0)
    for (let x = 0; x < SIZE; x++) {
      const gx = (x / SIZE) * GRID
      const x0 = Math.floor(gx)
      const fx = smooth(gx - x0)
      const a = grid[(y0 % GRID) * GRID + (x0 % GRID)]
      const b = grid[(y0 % GRID) * GRID + ((x0 + 1) % GRID)]
      const c = grid[((y0 + 1) % GRID) * GRID + (x0 % GRID)]
      const d = grid[((y0 + 1) % GRID) * GRID + ((x0 + 1) % GRID)]
      const top = a + (b - a) * fx
      data[y * SIZE + x] = Math.round((top + (c + (d - c) * fx - top) * fy) * 255)
    }
  }

  const tex = new DataTexture(data, SIZE, SIZE, RedFormat)
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.magFilter = LinearFilter
  tex.minFilter = LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

/*
  Texture loading, rebuilt around two facts.

  First, this may run in a worker, where TextureLoader's Image element does not
  exist. fetch and createImageBitmap exist everywhere this code can run.

  Second, every one of these maps is a single signal: the land mask is packed
  into one channel by design, the borders are greyscale, and the shader only
  ever reads the lights' luminance. Uploading them as RGBA spent four bytes a
  texel on one byte of information. Extracted to single channel R8, the three
  maps drop from about 140 MB of GPU memory with mipmaps to about 35 MB, and
  every sample moves a quarter of the bytes. That is most of what a compressed
  texture pipeline would have bought, with no transcoder wasm, no build tool
  and zero quality change, since the bytes are identical to the source channel.

  Streaming progress feeds the loading screen through onLoad.
*/
export async function fetchBitmap(
  url: string,
  report: (fraction: number) => void,
  signal?: AbortSignal,
  retried = false,
): Promise<ImageBitmap> {
  const res = await fetch(url, { signal }).catch((err) => {
    /* An abort is a decision, not a failure: no retry, propagate. */
    if (retried || signal?.aborted) throw err
    return null
  })
  if (!res || !res.ok) {
    /* One retry with a short backoff covers the transient failures that
       otherwise strand the globe silently: a flaky hotel network, a CDN
       hiccup mid deploy. A second failure is real and propagates. */
    if (!retried) {
      await new Promise((resolve) => setTimeout(resolve, 900))
      return fetchBitmap(url, report, signal, true)
    }
    throw new Error(`${url}: ${res ? res.status : 'network error'}`)
  }
  const total = Number(res.headers.get('Content-Length')) || 0
  let blob: Blob
  if (res.body && total > 0) {
    const reader = res.body.getReader()
    const chunks: BlobPart[] = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.byteLength
      report(Math.min(1, received / total))
    }
    blob = new Blob(chunks)
  } else {
    blob = await res.blob()
  }
  report(1)
  return createImageBitmap(blob)
}

/** Draw the bitmap once, keep one channel (or the RG pair for the border
    distance fields), flip to GL row order. */
export function extractChannel(bitmap: ImageBitmap, mode: 'r' | 'max' | 'rg'): DataTexture {
  const { width, height } = bitmap
  const cnv =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement('canvas'), { width, height })
  const ctx = cnv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  ctx.drawImage(bitmap, 0, 0)
  const src = ctx.getImageData(0, 0, width, height).data
  bitmap.close()

  const channels = mode === 'rg' ? 2 : 1
  const out = new Uint8Array(width * height * channels)
  for (let y = 0; y < height; y++) {
    const from = y * width
    const to = (height - 1 - y) * width
    for (let x = 0; x < width; x++) {
      const i = (from + x) * 4
      if (mode === 'rg') {
        out[(to + x) * 2] = src[i]
        out[(to + x) * 2 + 1] = src[i + 1]
      } else {
        out[to + x] = mode === 'r' ? src[i] : Math.max(src[i], src[i + 1], src[i + 2])
      }
    }
  }

  const tex = new DataTexture(out, width, height, mode === 'rg' ? RGFormat : RedFormat)
  tex.magFilter = LinearFilter
  tex.minFilter = LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

