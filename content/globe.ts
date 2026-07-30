/**
 * The places marked on the globe.
 *
 * This used to be generated, because the flat SVG fallback needed every point
 * projected into a fixed orthographic view. That fallback is gone, and the 3D
 * scene places markers from longitude and latitude directly, so the whole build
 * step and its three dependencies went with it.
 *
 * Origin is the facility. The rest are the export markets in the source
 * documents. Countries, not brands, so no permission is needed. The one line
 * descriptions are inferred from the customer mix and still need confirming.
 * See docs/11-open-questions.md.
 */

export type GlobePlace = {
  id: string
  label: string
  note: string | null
  lon: number
  lat: number
}

export const places: GlobePlace[] = [
  /* Labelled with the country: at globe scale that is the meaningful name.
     The city appears in the marker's detail card instead. */
  { id: 'origin', label: 'Bangladesh', note: null, lon: 90.5, lat: 23.62 },
  { id: 'poland', label: 'Poland', note: 'Childrenswear and denim', lon: 21.0, lat: 52.23 },
  { id: 'france', label: 'France', note: 'Childrenswear and basics', lon: 2.35, lat: 48.85 },
  { id: 'uk', label: 'United Kingdom', note: 'Casual and outdoor', lon: -0.13, lat: 51.5 },
  { id: 'netherlands', label: 'Netherlands', note: 'Retail and promotional', lon: 4.9, lat: 52.37 },
  /*
    Added from the buyer logo board on the previous site, which carries two
    large US retailers. The source documents list only European customers, so
    this is the one market that came from the logos rather than the paperwork.
    Flagged for confirmation in docs/11-open-questions.md.
  */
  { id: 'usa', label: 'United States', note: 'Big box retail programmes', lon: -96, lat: 38.5 },
]
