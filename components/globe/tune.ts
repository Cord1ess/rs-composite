/**
 * The tuning schema: every visual parameter of the earth system in one place.
 *
 * TUNE holds the shipped values. Keys map one to one onto shader uniform
 * names, applied generically across the three materials by EarthScene.setTune;
 * keys starting with $ are scene-level (sun direction, halo plane depth,
 * motion speeds) and are handled by name.
 *
 * SECTIONS drives the dev panel (components/dev/TunePanel.tsx): the floating
 * control surface sends live updates through the tune bus, and its Copy
 * button exports whatever differs from these defaults. Baking a tuning run
 * permanently means editing the numbers in this file, nothing else.
 *
 * Shared by the worker and the main thread; imports nothing but config.
 */

import { ATMO, CITY, GLINT, LAND, OCEAN, RESUME_AFTER, SUN, TOUR_SPIN } from './config'

export type TuneValue = number | [number, number, number]

export type TuneEntry = {
  key: string
  label: string
  min?: number
  max?: number
  step?: number
  /** RGB triple rendered as three channel sliders, 0..cmax each. */
  color?: boolean
  cmax?: number
}

export type TuneSection = { title: string; entries: TuneEntry[] }

export const TUNE: Record<string, TuneValue> = {
  /* --- sun & day --- */
  $sunX: SUN.x,
  $sunY: SUN.y,
  $sunZ: SUN.z,
  uTermLo: -0.18,
  uTermHi: 0.42,
  uSunGain: 7.0,
  uSunExp: 1.25,
  uAmbHero: 0.035,
  uAmbDark: 0.016,
  uDuskTint: [1.07, 0.98, 0.9],
  uNightFloor: 0.018,
  uNightFloorDark: 0.008,
  uShoreNight: 0.05,
  uLimbDark: 0.22,

  /* --- ocean & land --- */
  uOcean: [OCEAN.x, OCEAN.y, OCEAN.z],
  uShallow: [0.05, 0.18, 0.34],
  uLandCol: [LAND.x, LAND.y, LAND.z],
  uAtmo: [ATMO.r, ATMO.g, ATMO.b],
  uShelfExp: 1.3,
  uDeepMul: 0.5,
  uWaveBase: 0.92,
  uWaveAmp: 0.16,
  uShoreGlow: 0.55,

  /* --- city lights --- */
  uCity: [CITY.x, CITY.y, CITY.z],
  uCityGain: 1.5,
  uCityThLo: 0.05,
  uCityThHi: 0.45,
  uHazeGain: 0.35,
  uBorderLit: 0.3,
  uBorderDay: 0.15,

  /* --- water glint --- */
  uGlint: [GLINT.x, GLINT.y, GLINT.z],
  uGlintExp: 26,
  uLaneTight: 45,
  uGlintFresW: 2.8,
  uGlintBase: 0.1,
  uGlintGain: 1.4,
  uGlintShelf: 0.5,

  /* --- surface rim --- */
  uRimPow: 9.0,
  uRimGain: 1.6,
  uHazePow: 2.5,
  uHazeAmt: 0.06,
  uRimSunLo: 0.18,
  uRimSunGain: 1.5,
  uRimWhite: 0.5,

  /* --- cloud look --- */
  uCloudAmt: 1,
  uDeckLo: 0.26,
  uDeckGrain: 0.2,
  uDeckHi: 0.82,
  uCoreLo: 0.58,
  uCoreHi: 0.96,
  uVeilLo: 0.14,
  uVeilHi: 0.58,
  uVeilEnvLo: 0.06,
  uVeilEnvHi: 0.3,
  uVeilAlpha: 0.38,
  uVeilSupp: 0.85,
  uVeilColMix: 1.1,
  uToneBase: 0.72,
  uToneDeck: 0.18,
  uToneCore: 0.12,
  uCloudWhite: [0.94, 0.97, 1.02],
  uCloudGain: 1.45,
  uCloudExp: 0.9,
  uTopBase: 0.9,
  uTopGain: 0.4,
  uShadeGain: 1.6,
  uShadeBase: 0.55,
  uShadeCore: 0.9,
  uCShOffX: 0.0026,
  uCShOffY: 0.0038,
  uCloudAmb: [0.1, 0.16, 0.3],
  uCAmbBase: 0.38,
  uCAmbNight: 0.45,
  uVeilCol: [0.64, 0.71, 0.82],
  uVeilColBase: 0.25,
  uVeilColGain: 0.95,
  uCFresLo: 0.72,
  uCFresHi: 0.96,
  uCNightAlpha: 0.22,
  uParDeck: 0.0025,
  uParVeil: 0.008,
  uCLimbDark: 0.22,

  /* --- cloud shadows on the ground --- */
  uShOffX: 0.003,
  uShOffY: 0.0044,
  uShMip: 2.5,
  uShLo: 0.3,
  uShHi: 0.9,
  uShStr: 0.34,
  uShCity: 0.7,
  uShGlint: 0.7,

  /* --- halo: atmosphere & edge glow --- */
  uShellStr: 0.16,
  uShellFall: 9.0,
  uLitLo: 0.3,
  uLitHi: 0.85,
  uSideExp: 4.0,
  uRingEdge: 1.035,
  uRingBase: 0.7,
  uRingGain: 2.3,
  uBandFall: 4.5,
  uBandBase: 0.3,
  uBandGain: 1.5,

  /* --- halo: the spark --- */
  uSparkPos: 1.008,
  uHeartAmp: 10,
  uHeartTang: 1400,
  uHeartRad: 2600,
  uBleedAmp: 1.5,
  uBleedK: 55,
  uWinLo: 1.85,
  uWinHi: 2.38,
  uCompress: 1.25,
  uWhiteCurve: 0.85,
  uHaloDeep: [0.34, 0.78, 1.0],
  uHaloPale: [0.5, 0.92, 1.0],
  uPaleMix: 0.65,
  $haloZ: -0.02,

  /* --- motion --- */
  $tourSpin: TOUR_SPIN,
  $cloudLag: 0.15,
  $resumeAfter: RESUME_AFTER,
}

const n = (key: string, label: string, min: number, max: number, step = 0.01): TuneEntry => ({
  key,
  label,
  min,
  max,
  step,
})
const c = (key: string, label: string, cmax = 1.2): TuneEntry => ({ key, label, color: true, cmax })

export const SECTIONS: TuneSection[] = [
  {
    title: 'Sun & day',
    entries: [
      n('$sunX', 'Sun X', -1, 1),
      n('$sunY', 'Sun Y', -1, 1),
      n('$sunZ', 'Sun Z', -1, 1),
      n('uTermLo', 'Terminator start', -1, 0.5),
      n('uTermHi', 'Terminator end', -0.5, 1),
      n('uSunGain', 'Surface sun gain', 0, 16, 0.1),
      n('uSunExp', 'Surface sun falloff', 0.4, 3),
      n('uAmbHero', 'Ambient (hero)', 0, 0.12, 0.001),
      n('uAmbDark', 'Ambient (section)', 0, 0.12, 0.001),
      c('uDuskTint', 'Dusk tint', 1.3),
      n('uNightFloor', 'Night floor (hero)', 0, 0.06, 0.001),
      n('uNightFloorDark', 'Night floor (section)', 0, 0.06, 0.001),
      n('uShoreNight', 'Night shoreline', 0, 0.2, 0.005),
      n('uLimbDark', 'Limb darkening', 0, 0.6),
    ],
  },
  {
    title: 'Ocean & land',
    entries: [
      c('uOcean', 'Deep ocean'),
      c('uShallow', 'Shallow water'),
      c('uLandCol', 'Land'),
      c('uAtmo', 'Atmosphere blue'),
      n('uShelfExp', 'Depth ramp curve', 0.4, 3),
      n('uDeepMul', 'Abyss darkness', 0, 1),
      n('uWaveBase', 'Sea state base', 0.5, 1.2),
      n('uWaveAmp', 'Sea state ripple', 0, 0.5),
      n('uShoreGlow', 'Shoreline glow', 0, 1.5),
    ],
  },
  {
    title: 'City lights',
    entries: [
      c('uCity', 'Light colour'),
      n('uCityGain', 'Brightness', 0, 4, 0.05),
      n('uCityThLo', 'Threshold start', 0, 0.5),
      n('uCityThHi', 'Threshold end', 0.05, 1),
      n('uHazeGain', 'Bloom haze', 0, 1),
      n('uBorderLit', 'Borders at night', 0, 0.8),
      n('uBorderDay', 'Borders day dim', 0, 0.6),
    ],
  },
  {
    title: 'Water glint',
    entries: [
      c('uGlint', 'Glint colour'),
      n('uGlintExp', 'Tightness', 4, 80, 1),
      n('uLaneTight', 'Lane squeeze', 5, 120, 1),
      n('uGlintFresW', 'Edge weighting', 0, 6, 0.05),
      n('uGlintBase', 'Base level', 0, 0.5, 0.005),
      n('uGlintGain', 'Gain', 0, 4, 0.05),
      n('uGlintShelf', 'Shallow boost', 0, 1.5, 0.05),
    ],
  },
  {
    title: 'Surface rim',
    entries: [
      n('uRimPow', 'Rim tightness', 2, 20, 0.5),
      n('uRimGain', 'Rim strength', 0, 4, 0.05),
      n('uHazePow', 'Haze tightness', 1, 6, 0.1),
      n('uHazeAmt', 'Haze strength', 0, 0.3, 0.005),
      n('uRimSunLo', 'Dark side floor', 0, 1),
      n('uRimSunGain', 'Sun side gain', 0, 4, 0.05),
      n('uRimWhite', 'Whitening', 0, 1),
    ],
  },
  {
    title: 'Clouds: coverage & strata',
    entries: [
      n('uCloudAmt', 'Cloud amount', 0, 1),
      n('uDeckLo', 'Deck threshold', 0, 0.8),
      n('uDeckGrain', 'Edge grain', 0, 0.5),
      n('uDeckHi', 'Deck solid at', 0.3, 1),
      n('uCoreLo', 'Core starts', 0.2, 1),
      n('uCoreHi', 'Core solid at', 0.4, 1),
      n('uVeilLo', 'Veil threshold', 0, 0.8),
      n('uVeilHi', 'Veil solid at', 0.1, 1),
      n('uVeilEnvLo', 'Veil near systems', 0, 0.5),
      n('uVeilEnvHi', 'Veil gate end', 0.05, 0.8),
      n('uVeilAlpha', 'Veil opacity', 0, 1),
      n('uVeilSupp', 'Veil under deck', 0, 1),
      n('uParDeck', 'Deck parallax', 0, 0.01, 0.0005),
      n('uParVeil', 'Veil parallax', 0, 0.02, 0.0005),
    ],
  },
  {
    title: 'Clouds: light & tone',
    entries: [
      c('uCloudWhite', 'Sunlit white', 1.3),
      n('uCloudGain', 'Sun gain', 0, 3, 0.05),
      n('uCloudExp', 'Sun falloff', 0.4, 2),
      n('uTopBase', 'Tone floor', 0.4, 1.3),
      n('uTopGain', 'System tops boost', 0, 1),
      n('uToneBase', 'Ladder: skirts', 0.3, 1),
      n('uToneDeck', 'Ladder: deck step', 0, 0.5),
      n('uToneCore', 'Ladder: core step', 0, 0.5),
      n('uShadeGain', 'Flank shading', 0, 4, 0.05),
      n('uShadeBase', 'Shade base', 0, 1.5, 0.05),
      n('uShadeCore', 'Shade on cores', 0, 2, 0.05),
      n('uCShOffX', 'Shade offset X', -0.01, 0.01, 0.0002),
      n('uCShOffY', 'Shade offset Y', -0.01, 0.01, 0.0002),
      c('uCloudAmb', 'Skylight fill'),
      n('uCAmbBase', 'Fill base', 0, 1),
      n('uCAmbNight', 'Fill at night', 0, 1),
      c('uVeilCol', 'Veil colour'),
      n('uVeilColBase', 'Veil dimness', 0, 1),
      n('uVeilColGain', 'Veil sun gain', 0, 2, 0.05),
      n('uVeilColMix', 'Veil handover', 0.3, 2, 0.05),
      n('uCFresLo', 'Limb fade start', 0.3, 1),
      n('uCFresHi', 'Limb fade end', 0.5, 1),
      n('uCNightAlpha', 'Night ghost', 0, 1),
      n('uCLimbDark', 'Limb darkening', 0, 0.6),
    ],
  },
  {
    title: 'Cloud shadows (ground)',
    entries: [
      n('uShOffX', 'Cast offset X', -0.012, 0.012, 0.0002),
      n('uShOffY', 'Cast offset Y', -0.012, 0.012, 0.0002),
      n('uShMip', 'Softness (mip)', 0, 5, 0.1),
      n('uShLo', 'Threshold start', 0, 0.8),
      n('uShHi', 'Threshold end', 0.2, 1),
      n('uShStr', 'Darkness', 0, 0.8),
      n('uShCity', 'Over city lights', 0, 1),
      n('uShGlint', 'Over the glint', 0, 1),
    ],
  },
  {
    title: 'Halo: atmosphere & edge',
    entries: [
      n('uShellStr', 'Atmosphere strength', 0, 0.5, 0.005),
      n('uShellFall', 'Atmosphere reach', 2, 20, 0.5),
      n('uLitLo', 'Glow arc start', -1, 1),
      n('uLitHi', 'Glow arc full', -0.5, 1),
      n('uSideExp', 'Crest focus', 1, 8, 0.5),
      n('uRingEdge', 'Ring width', 1.0, 1.1, 0.001),
      n('uRingBase', 'Ring base', 0, 2, 0.05),
      n('uRingGain', 'Ring at crest', 0, 5, 0.05),
      n('uBandFall', 'Bloom reach', 1, 15, 0.25),
      n('uBandBase', 'Bloom base', 0, 1.5, 0.02),
      n('uBandGain', 'Bloom at crest', 0, 4, 0.05),
      n('$haloZ', 'Plane depth', -0.2, 0, 0.005),
    ],
  },
  {
    title: 'Halo: the spark',
    entries: [
      n('uSparkPos', 'Position on edge', 1.0, 1.1, 0.001),
      n('uHeartAmp', 'Core intensity', 0, 30, 0.5),
      n('uHeartTang', 'Core width', 100, 6000, 50),
      n('uHeartRad', 'Core height', 100, 8000, 50),
      n('uBleedAmp', 'Bleed intensity', 0, 4, 0.05),
      n('uBleedK', 'Bleed falloff', 5, 200, 1),
      n('uWinLo', 'Fade-out start', 1.2, 2.3, 0.01),
      n('uWinHi', 'Fade-out end', 1.5, 2.44, 0.01),
      n('uCompress', 'Saturation curve', 0.4, 3, 0.05),
      n('uWhiteCurve', 'Whitening curve', 0.2, 2, 0.05),
      c('uHaloDeep', 'Deep limb tint'),
      c('uHaloPale', 'Pale edge tint'),
      n('uPaleMix', 'Pale mix', 0, 1),
    ],
  },
  {
    title: 'Motion',
    entries: [
      n('$tourSpin', 'Tour speed', 0, 0.15, 0.002),
      n('$cloudLag', 'Cloud lag', 0, 1),
      n('$resumeAfter', 'Resume delay', 0, 8, 0.25),
    ],
  },
]
