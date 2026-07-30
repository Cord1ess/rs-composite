import type { IconName } from '@/components/icons/Icon'

export type Stage = {
  slug: string
  name: string
  line: string
  icon: IconName
  /** What the stage page states, one short point each. */
  points: string[]
  /** Optional chip list the stage page shows (fabrics, print types). */
  range?: string[]
  /** Real photo of the stage, where one exists from the old site's imagery. */
  photo?: string
}

export const process: Stage[] = [
  {
    slug: 'knitting',
    name: 'Knitting',
    line: 'Open width and tubular machines producing premium knit fabric.',
    icon: 'knitting',
    photo: '/photos/knitting.webp',
    points: [
      'Open width and tubular circular machines.',
      'Twelve knit constructions, from Single Jersey to Inkjet Yarn Jersey.',
      'Fabric moves straight to dyeing without leaving the site.',
    ],
    range: [
      'Single Jersey',
      'Interlock',
      'Rib',
      'Drop Needle',
      'Jacquard',
      'Lycra Jersey',
      'Piqué',
      'Double Lacoste',
      'Slub Jersey',
      'Double Jersey',
      'Neppy Yarn Jersey',
      'Inkjet Yarn Jersey',
    ],
  },
  {
    slug: 'dyeing-and-finishing',
    name: 'Dyeing and Finishing',
    line: 'Dyed, finished and checked yard by yard against a 4 Point system.',
    icon: 'dyeing',
    points: [
      'A calibrated dye lab keeps shade consistent between lots.',
      'Every roll is checked yard by yard against the 4 Point system.',
      'Group capacity of 35,000 kg a day of knit dyeing and finishing.',
    ],
  },
  {
    slug: 'cutting',
    name: 'Cutting',
    line: 'CAD pattern work into computerised cutting lines. Precision with minimal waste.',
    icon: 'cutting',
    points: [
      'Patterns are drawn in CAD and nested for minimal waste.',
      'Computerised cutting lines hold the tolerance the marker sets.',
      'Cut panels are bundled and tracked into sewing.',
    ],
  },
  {
    slug: 'printing',
    name: 'Printing',
    line: 'Digital screen, thermal, discharge, flock, foil, sublimation, photo, puff and all over print.',
    icon: 'printing',
    photo: '/photos/printing.webp',
    points: [
      'Ten print techniques under one roof.',
      'Strike offs are approved before bulk runs.',
    ],
    range: [
      'Digital screen',
      'Thermal',
      'Discharge',
      'Flock',
      'Foil',
      'Sublimation',
      'Photo',
      'Puff',
      'Burn out',
      'All over',
    ],
  },
  {
    slug: 'embroidery',
    name: 'Embroidery',
    line: 'Multi head machines for detail work at production scale.',
    icon: 'embroidery',
    points: [
      'Multi head machines run detail work at production speed.',
      'Logos, badges and decorative stitching to the tech pack.',
    ],
  },
  {
    slug: 'sewing',
    name: 'Sewing',
    line: '25 lines, spacious floors, 1.2 million pieces a month.',
    icon: 'sewing',
    photo: '/photos/sewing.webp',
    points: [
      '25 lines across spacious, ventilated floors.',
      '1.2 million pieces a month at full run rate.',
      'In line quality checks rather than end of line only.',
    ],
  },
  {
    slug: 'finishing',
    name: 'Finishing',
    line: 'Final inspection with attention to every detail.',
    icon: 'finishing',
    points: [
      'Pressing and final inspection piece by piece.',
      'Steam comes from the boiler fired by the factory’s own waste.',
    ],
  },
  {
    slug: 'packing',
    name: 'Packing',
    line: 'Cartoned and shipped under CT-PAT rules.',
    icon: 'packing',
    points: [
      'Checked, folded and cartoned to the buyer’s pack plan.',
      'Packing and shipping run to CT-PAT rules.',
    ],
  },
]

export const fabrics = [
  'Single Jersey',
  'Interlock',
  'Rib',
  'Drop Needle',
  'Jacquard',
  'Lycra Jersey',
  'Piqué',
  'Double Lacoste',
  'Slub Jersey',
  'Double Jersey',
  'Neppy Yarn Jersey',
  'Inkjet Yarn Jersey',
]
