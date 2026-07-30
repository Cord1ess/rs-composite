export type Fact = {
  value: string
  /** Numeric portion for the count up, when the figure is countable. */
  count?: number
  suffix?: string
  label: string
}

export const facts: Fact[] = [
  { value: '1998', label: 'Established' },
  { value: '197,263', count: 197263, suffix: ' sq ft', label: 'Operation area' },
  { value: '2,250', count: 2250, label: 'People, half of them women' },
  { value: '25', count: 25, label: 'Sewing lines' },
  { value: '1.2m', label: 'Pieces every month' },
  { value: 'Gold', label: 'USGBC LEED certified' },
]
