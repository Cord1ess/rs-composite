/**
 * The asset pipeline: four streaming fetches with honest progress weights,
 * single-channel extraction, filtering setup. Abortable, so a disposed
 * scene stops pulling bytes, and every terminal failure propagates to the
 * caller — the caller decides what a dead load means for the page.
 */

import { RepeatWrapping } from 'three'
import type { DataTexture, WebGLRenderer } from 'three'
import { extractChannel, fetchBitmap } from '../textures'

export type EarthMaps = {
  lightsMap: DataTexture
  landMap: DataTexture
  borderMap: DataTexture
  cloudMap: DataTexture | null
}

export async function loadEarthMaps(opts: {
  clouds: boolean
  renderer: WebGLRenderer
  signal?: AbortSignal
  onProgress?: (fraction: number) => void
}): Promise<EarthMaps> {
  /* Weights are rough file-size shares, so the loading bar moves honestly. */
  const parts = { lights: 0, land: 0, borders: 0, clouds: opts.clouds ? 0 : 1 }
  const push = () =>
    opts.onProgress?.(
      parts.lights * 0.4 + parts.land * 0.25 + parts.borders * 0.15 + parts.clouds * 0.2,
    )

  const [lightsBm, landBm, borderBm, cloudBm] = await Promise.all([
    fetchBitmap('/textures/lights.webp', (f) => ((parts.lights = f), push()), opts.signal),
    fetchBitmap('/textures/land.webp', (f) => ((parts.land = f), push()), opts.signal),
    fetchBitmap('/textures/borders.webp', (f) => ((parts.borders = f), push()), opts.signal),
    opts.clouds
      ? fetchBitmap('/textures/clouds.webp', (f) => ((parts.clouds = f), push()), opts.signal)
      : Promise.resolve(null),
  ])

  /* The lights ship as colour but the shader only ever used the luminance,
     so the maximum channel is folded in during extraction. They arrive sRGB
     encoded; the shader linearises with a pow. */
  const lightsMap = extractChannel(lightsBm, 'max')
  const landMap = extractChannel(landBm, 'r')
  const borderMap = extractChannel(borderBm, 'r')
  const cloudMap = cloudBm ? extractChannel(cloudBm, 'r') : null

  const maxAniso = opts.renderer.capabilities.getMaxAnisotropy()
  /*
    The surface is seen at a glancing angle across most of the visible cap,
    which is exactly where anisotropic filtering earns its keep, and also
    exactly where its cost explodes. Level 8 costs roughly half of 16 in the
    worst case and only ever differs past an 8:1 footprint this view barely
    reaches.
  */
  /* The lights take level 4 where the rest take 8: the largest texture in
     the scene, sampled twice per fragment, and its content is dots whose
     glow the shader blooms anyway — the golden diff at 4 is indistinguishable
     while the worst-case bandwidth halves. Coastlines keep 8; their
     crispness is the point of the land map. */
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
