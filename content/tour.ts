/**
 * Hotspots inside the facility tour panorama.
 *
 * yaw is degrees around the viewer, 0 straight ahead at load, positive to the
 * right. pitch is degrees above the horizon. When the real panorama is shot,
 * these get re-aimed at the actual machines; the notes stay one sentence.
 */
export type TourSpot = {
  id: string
  label: string
  note: string
  yaw: number
  pitch: number
}

export const tourSpots: TourSpot[] = [
  {
    id: 'knitting',
    label: 'Knitting',
    note: 'Circular machines knit Single Jersey, Rib, Interlock and Jacquard around the clock.',
    yaw: -20,
    pitch: 2,
  },
  {
    id: 'dyeing',
    label: 'Dyeing and Finishing',
    note: 'Calibrated dye lines, checked yard by yard before anything moves on.',
    yaw: 55,
    pitch: 4,
  },
  {
    id: 'cutting',
    label: 'Cutting',
    note: 'Bulk cutting with every pattern checked against the marker.',
    yaw: 135,
    pitch: -3,
  },
  {
    id: 'sewing',
    label: 'Sewing',
    note: '25 lines producing 1.2 million pieces a month.',
    yaw: -140,
    pitch: 0,
  },
  {
    id: 'packing',
    label: 'Packing',
    note: 'Pressed, checked and packed to CT-PAT rules before the carton seals.',
    yaw: -75,
    pitch: -4,
  },
]
