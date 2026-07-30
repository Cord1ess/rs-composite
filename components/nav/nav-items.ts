/**
 * The whole site map, grouped the way the header presents it: three buttons,
 * each opening one submenu. The same structure feeds the phone sheet, so the
 * two can never drift apart.
 */
export type NavItem = { label: string; href: string; note: string }
export type NavGroup = { label: string; items: NavItem[] }

export const navGroups: NavGroup[] = [
  {
    label: 'Facility',
    items: [
      { label: 'About', href: '/about', note: 'Who RSComposite is, since 1998' },
      { label: 'Facility', href: '/facility', note: 'Buildings, utilities and IT' },
      { label: 'Environment', href: '/environment', note: 'LEED Gold, water, waste and daylight' },
      { label: 'People', href: '/people', note: '2,250 workers and how they are treated' },
    ],
  },
  {
    label: 'Production',
    items: [
      { label: 'Process', href: '/process', note: 'Knitting through to packing' },
      { label: 'Products', href: '/products', note: 'The full export range' },
      { label: 'Certifications', href: '/certifications', note: 'Every standard we hold' },
    ],
  },
  {
    label: 'Company',
    items: [
      { label: 'Sister Concerns', href: '/sister-concerns', note: 'Five more group companies' },
      { label: 'Careers', href: '/careers', note: 'Working at RSComposite' },
      { label: 'Contact', href: '/contact', note: 'Narayanganj, Bangladesh' },
    ],
  },
]
