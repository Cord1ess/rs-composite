/**
 * The asset pipeline, split at the thread boundary.
 *
 * fetchEarthBitmaps runs on the MAIN thread. That is the A1 fix from audit
 * III: the <link preload> cache is document-scoped, so when the worker did
 * its own fetching, every preloaded texture was requested twice (measured:
 * three duplicate requests per visit, up to ~900 kB on a cold CDN). Fetched
 * here the preloads are consumed, the downloads start before the worker has
 * even booted, and the decoded ImageBitmaps transfer into the worker with
 * zero copies.
 *
 * prepareEarthMaps runs wherever the scene lives (worker or main thread):
 * single-channel extraction is a heavy pixel loop and belongs off the main
 * thread whenever a worker exists.
 */

import { RepeatWrapping } from 'three'
import type { DataTexture, WebGLRenderer } from 'three'
import { extractChannel, fetchBitmap } from '../textures'

export type EarthBitmaps = {
  lights: ImageBitmap
  land: ImageBitmap
  borders: ImageBitmap
  clouds: ImageBitmap | null
}

export type EarthMaps = {
  lightsMap: DataTexture
  landMap: DataTexture
  borderMap: DataTexture
  cloudMap: DataTexture | null
}

export async function fetchEarthBitmaps(
  clouds: boolean,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<EarthBitmaps> {
  /* Weights are rough file-size shares, so the loading bar moves honestly. */
  const parts = { lights: 0, land: 0, borders: 0, clouds: clouds ? 0 : 1 }
  const push = () =>
    onProgress?.(
      parts.lights * 0.4 + parts.land * 0.25 + parts.borders * 0.15 + parts.clouds * 0.2,
    )

  const [lights, land, borders, cloudsBm] = await Promise.all([
    fetchBitmap('/textures/lights.webp', (f) => ((parts.lights = f), push()), signal),
    fetchBitmap('/textures/land.webp', (f) => ((parts.land = f), push()), signal),
    fetchBitmap('/textures/borders.webp', (f) => ((parts.borders = f), push()), signal),
    clouds
      ? fetchBitmap('/textures/clouds.webp', (f) => ((parts.clouds = f), push()), signal)
      : Promise.resolve(null),
  ])

  return { lights, land, borders, clouds: cloudsBm }
}

export function prepareEarthMaps(bitmaps: EarthBitmaps, renderer: WebGLRenderer): EarthMaps {
  /* The lights ship as colour but the shader only ever used the luminance,
     so the maximum channel is folded in during extraction. They arrive sRGB
     encoded; the shader linearises with a pow. */
  const lightsMap = extractChannel(bitmaps.lights, 'max')
  const landMap = extractChannel(bitmaps.land, 'r')
  const borderMap = extractChannel(bitmaps.borders, 'r')
  const cloudMap = bitmaps.clouds ? extractChannel(bitmaps.clouds, 'r') : null

  const maxAniso = renderer.capabilities.getMaxAnisotropy()
  /*
    The surface is seen at a glancing angle across most of the visible cap,
    which is exactly where anisotropic filtering earns its keep, and also
    exactly where its cost explodes. Level 8 costs roughly half of 16 in the
    worst case and only ever differs past an 8:1 footprint this view barely
    reaches. The lights take 4 (audit II, F17): the largest texture in the
    scene, dot content the shader blooms anyway, indistinguishable at 4.
  */
  lightsMap.anisotropy = Math.min(maxAniso, 4)
  landMap.anisotropy = Math.min(maxAniso, 8)
  borderMap.anisotropy = Math.min(maxAniso, 8)
  if (cloudMap) {
    cloudMap.anisotropy = Math.min(maxAniso, 8)
    /* The deck drifts and its taps cross the seam; it must wrap. */
    cloudMap.wrapS = RepeatWrapping
  }

  return { lightsMap, landMap, borderMap, cloudMap }
}
