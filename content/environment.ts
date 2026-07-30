import type { IconName } from '@/components/icons/Icon'

export type EnvItem = { title: string; body: string; icon: IconName }

export const environment: EnvItem[] = [
  {
    title: 'Rainwater',
    body: 'A natural water management system recycles and reuses both rainwater and surface water.',
    icon: 'rainwater',
  },
  {
    title: 'Effluent Treatment Plant',
    body: 'Effluent is cleansed chemically and biologically, then returned to nature safely.',
    icon: 'effluent',
  },
  {
    title: 'Boiler',
    body: "The factory burns its own garment waste to raise steam for finishing and ironing.",
    icon: 'boiler',
  },
  {
    title: 'Daylight',
    body: 'Building orientation and glazing put daylight to work before electricity does.',
    icon: 'daylight',
  },
  {
    title: 'Temperature',
    body: 'Floors are held under 30°C, with energy efficient and noise free machines throughout.',
    icon: 'temperature',
  },
  {
    title: 'Waste',
    body: 'Solid waste and wastewater are separated and managed across the whole operation.',
    icon: 'waste',
  },
  {
    title: 'Gardens',
    body: 'The building is surrounded by greenery and water. Workers walk in the garden during breaks.',
    icon: 'garden',
  },
  {
    title: 'Walking distance',
    body: 'Most workers reach the factory on foot, which lifts the local economy with it.',
    icon: 'walk',
  },
]
