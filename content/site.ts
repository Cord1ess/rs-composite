export const site = {
  name: 'RSComposite',
  legalName: 'RS Composite',
  founded: 1998,
  tagline: 'Knitwear made from yarn to carton.',
  description:
    'A 197,263 sq ft knit composite facility in Narayanganj, Bangladesh, built to the US Green Building Council Gold standard.',
  address: {
    line1: 'Holding No. 890, Shasongaon',
    line2: 'Fatullah, Narayanganj-1420',
    country: 'Bangladesh',
  },
  email: 'rs@rscomposite.com',
  careersEmail: 'cv@rscomposite.com',
  phones: ['+88-01711-563148', '+88-01711-686237'],
  /** Placeholder targets. Which accounts exist is an open question. */
  socials: [
    { name: 'LinkedIn', icon: 'linkedin', href: '#' },
    { name: 'Facebook', icon: 'facebook', href: '#' },
    { name: 'Instagram', icon: 'instagram', href: '#' },
  ] as const,
}
