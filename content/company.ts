export const certifications = [
  { name: 'LEED', body: 'US Green Building Council, Gold category.' },
  { name: 'amfori BSCI', body: 'Category A.' },
  { name: 'Sedex 4 Pillar', body: 'SMETA audited.' },
  { name: 'ISO 9001:2015', body: 'Quality management system.' },
  { name: 'OEKO-TEX', body: 'Tested for harmful substances.' },
  { name: 'GOTS', body: 'Global Organic Textile Standard.' },
  { name: 'Organic Content Standard', body: 'Organic content verified.' },
  { name: 'Global Recycled Standard', body: 'Recycled content verified.' },
  { name: 'Better Cotton Initiative', body: 'Sustainable cotton sourcing.' },
  { name: 'ICS', body: 'Initiative for Compliance and Sustainability.' },
]

/*
  Poland, France and the Netherlands come from the customer list in
  `RSComposite More Info.md`. The United Kingdom is inferred, since that document
  names Weird Fish without a country.

  The United States comes from the buyer logo board on the previous site, which
  carries two large US retailers that the source documents never mention. It is
  the one entry not backed by the paperwork. See docs/11-open-questions.md.
*/
export const markets = [
  { country: 'Poland', note: 'Childrenswear and denim' },
  { country: 'France', note: 'Childrenswear and basics' },
  { country: 'United Kingdom', note: 'Casual and outdoor' },
  { country: 'Netherlands', note: 'Retail and promotional' },
  { country: 'United States', note: 'Big box retail programmes' },
]

export const sisterConcerns = [
  {
    name: 'R.S. Knit Wears (Pvt.) Ltd.',
    area: '39,696 sq ft',
    capacity: '300,000 pieces a month',
    location: 'Shasongaon, Fatullah',
  },
  {
    name: 'R4 Fashion Wear (Pvt.) Ltd.',
    area: '25,000 sq ft',
    capacity: '300,000 pieces a month',
    location: 'BSCIC Hosiery Estate, Fatullah',
  },
  {
    name: 'Al-Amin Export Ltd.',
    area: '100,000 sq ft',
    capacity: '180,000 to 200,000 pieces a month',
    location: 'Madaninagar, Siddirganj',
  },
  {
    name: 'Zarjis Composite Knit Industries (Pvt.) Ltd.',
    area: '225,000 sq ft',
    capacity: '35,000 kg a day of knit dyeing and finishing',
    location: 'Kashipur, Fatullah',
  },
  {
    name: 'RS Tex Tech',
    area: 'Details pending',
    capacity: 'Details pending',
    location: 'Narayanganj',
  },
  {
    name: "Holm N' Holt",
    area: 'Details pending',
    capacity: 'Details pending',
    location: 'Narayanganj',
  },
]

export const products = [
  'T-Shirts',
  'Polo Shirts',
  'Sweatshirts',
  'Tank Tops',
  'Boxer Shorts',
  'Jogging Suits',
  'Pajama Sets',
  'Briefs',
  'Cardigans',
  'Trousers',
]
