/**
 * The three materials, built against the shared uniform table.
 *
 * Wiring is derived, not listed: each builder parses the uniform
 * declarations out of its own GLSL and resolves every name either from the
 * caller's extras (textures, runtime state) or from the sky-state table.
 * A name that neither side knows throws at construction — a shader and
 * tune.ts can never silently disagree about what exists.
 */

import { DataTexture, ShaderMaterial, Vector2 } from 'three'
import { cloudShader, earthShader, haloShader } from '../shaders'
import type { SkyState } from './sky-state'

type Uniforms = Record<string, { value: unknown }>

const DECLARED = /uniform\s+\w+\s+(\w+)\s*;/g

function wire(glsl: string, sky: SkyState, extras: Uniforms): Uniforms {
  const out: Uniforms = {}
  for (const match of glsl.matchAll(DECLARED)) {
    const name = match[1]
    if (out[name]) continue
    const extra = extras[name]
    if (extra) out[name] = extra
    else out[name] = sky.share(name)
  }
  return out
}

export function buildEarthMaterial(
  sky: SkyState,
  maps: {
    lightsMap: DataTexture
    landMap: DataTexture
    borderMap: DataTexture
    cloudMap: DataTexture | null
    noiseTex: DataTexture
  },
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: wire(earthShader.fragmentShader, sky, {
      uLights: { value: maps.lightsMap },
      uLand: { value: maps.landMap },
      uBorders: { value: maps.borderMap },
      uNoise: { value: maps.noiseTex },
      uClouds: { value: maps.cloudMap ?? maps.noiseTex },
      uSun: sky.sun,
      uDark: sky.dark,
      uCloudShift: sky.cloudShift,
      /* Derived from the actual bitmap, so a resized bake can never
         silently degrade the bicubic filter. */
      uLandTexel: {
        value: new Vector2(1 / maps.landMap.image.width, 1 / maps.landMap.image.height),
      },
    }),
    vertexShader: earthShader.vertexShader,
    fragmentShader: earthShader.fragmentShader,
  })
}

export function buildCloudMaterial(
  sky: SkyState,
  cloudMap: DataTexture,
  noiseTex: DataTexture,
): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: wire(cloudShader.fragmentShader, sky, {
      uClouds: { value: cloudMap },
      uNoise: { value: noiseTex },
      uSun: sky.sun,
      uCloudShift: sky.cloudShift,
    }),
    vertexShader: cloudShader.vertexShader,
    fragmentShader: cloudShader.fragmentShader,
  })
}

export function buildHaloMaterial(sky: SkyState): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    /* Normal alpha blending, deliberately not additive: additive blue over
       the backdrop's warm nebula regions can only sum to violet, which was
       the purple halo, unfixable by hue tuning. Painting the air's own
       colour over the backdrop cannot. */
    depthWrite: false,
    depthTest: true,
    uniforms: wire(haloShader.fragmentShader, sky, {
      /* The halo names the atmosphere colour uColor; sharing uAtmo's
         object keeps them one value forever. */
      uColor: sky.share('uAtmo'),
      uSunDir: sky.sunDir,
    }),
    vertexShader: haloShader.vertexShader,
    fragmentShader: haloShader.fragmentShader,
  })
}
