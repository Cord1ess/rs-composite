/**
 * The tuning schema: every visual parameter of the earth system in one place.
 *
 * TUNE holds the shipped values. Keys map one to one onto shader uniform
 * names, applied generically across the three materials by EarthScene.setTune;
 * keys starting with $ are scene-level (sun direction, halo plane depth,
 * motion speeds) and are handled by name.
 *
 * The dev panel's sections, labels and ranges live in tune-schema.ts, kept
 * apart on purpose: this module ships inside the worker and scene chunks,
 * and sibling exports do not tree-shake apart, so the schema strings were
 * riding along (audit III, A2). The panel's Copy button exports whatever
 * differs from these defaults; baking a tuning run permanently means
 * editing the numbers in this file, nothing else.
 *
 * Shared by the worker and the main thread; imports nothing but config.
 */

import { ATMO, CITY, GLINT, LAND, OCEAN, RESUME_AFTER, SUN, TOUR_SPIN } from './config'

export type TuneValue = number | [number, number, number]

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
  /* Ice caps: the land channel's brightest band whitens toward uIceCol.
     0.75 sits above desert luminance (~0.66) and below snowpack (0.85+). */
  uIceCol: [0.19, 0.23, 0.29],
  uIceLo: 0.75,
  uIceHi: 0.92,
  uIceAmt: 0.9,

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
