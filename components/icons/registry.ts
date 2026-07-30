import type { ComponentType } from 'react'
import * as G from './glyphs'

export type Motion =
  | 'spin'
  | 'bob'
  | 'slide-x'
  | 'slide-y'
  | 'wave'
  | 'rise'
  | 'fill'
  | 'fold'
  | 'pulse'
  | 'step'
  | 'drop'
  | 'nudge-x'
  | 'none'

type Entry = { glyph: ComponentType; motion: Motion }

export const registry = {
  // interface
  menu: { glyph: G.Menu, motion: 'nudge-x' },
  close: { glyph: G.Close, motion: 'pulse' },
  'arrow-right': { glyph: G.ArrowRight, motion: 'nudge-x' },
  'arrow-up-right': { glyph: G.ArrowUpRight, motion: 'nudge-x' },
  'chevron-down': { glyph: G.ChevronDown, motion: 'slide-y' },
  mail: { glyph: G.Mail, motion: 'slide-y' },
  plus: { glyph: G.Plus, motion: 'pulse' },
  minus: { glyph: G.Minus, motion: 'pulse' },
  phone: { glyph: G.Phone, motion: 'pulse' },
  pin: { glyph: G.Pin, motion: 'pulse' },
  download: { glyph: G.Download, motion: 'slide-y' },

  // process
  knitting: { glyph: G.Knitting, motion: 'spin' },
  dyeing: { glyph: G.Dyeing, motion: 'wave' },
  cutting: { glyph: G.Cutting, motion: 'slide-x' },
  printing: { glyph: G.Printing, motion: 'slide-y' },
  embroidery: { glyph: G.Embroidery, motion: 'bob' },
  sewing: { glyph: G.Sewing, motion: 'bob' },
  finishing: { glyph: G.Finishing, motion: 'slide-x' },
  packing: { glyph: G.Packing, motion: 'fold' },

  // environment
  rainwater: { glyph: G.Rainwater, motion: 'drop' },
  effluent: { glyph: G.Effluent, motion: 'wave' },
  boiler: { glyph: G.Boiler, motion: 'rise' },
  daylight: { glyph: G.Daylight, motion: 'nudge-x' },
  temperature: { glyph: G.Temperature, motion: 'fill' },
  waste: { glyph: G.Waste, motion: 'drop' },
  garden: { glyph: G.Garden, motion: 'wave' },
  walk: { glyph: G.Walk, motion: 'step' },

  // compliance
  certificate: { glyph: G.Certificate, motion: 'pulse' },
  audit: { glyph: G.Audit, motion: 'none' },
  healthcare: { glyph: G.Healthcare, motion: 'pulse' },
  childcare: { glyph: G.Childcare, motion: 'nudge-x' },
  'fire-safety': { glyph: G.FireSafety, motion: 'pulse' },

  // company
  globe: { glyph: G.Globe, motion: 'spin' },
  factory: { glyph: G.Factory, motion: 'none' },

  // social
  linkedin: { glyph: G.Linkedin, motion: 'none' },
  facebook: { glyph: G.Facebook, motion: 'none' },
  instagram: { glyph: G.Instagram, motion: 'none' },
} satisfies Record<string, Entry>

export type IconName = keyof typeof registry
