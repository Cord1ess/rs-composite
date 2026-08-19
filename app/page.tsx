import { preload } from 'react-dom'
import TunePanel from '@/components/dev/TunePanel'
import { Hero } from '@/components/hero/Hero'
import { Facts } from '@/components/sections/Facts'
import {
  Introduction,
  TourFacility,
  EnvironmentSection,
  ProcessSection,
  Quality,
  People,
  Quote,
  CertificationsSection,
} from '@/components/sections/home'

export default function HomePage() {
  /*
    Start the globe's downloads with the HTML instead of after hydration, idle
    callback and a dynamic import. The three surface maps are consumed through
    fetch in the scene, so they preload as fetch; the galaxy plate is a CSS
    background, so it preloads as an image. Home page only: no other route
    pays for these bytes.
  */
  preload('/textures/lights.webp', { as: 'fetch' })
  preload('/textures/land.webp', { as: 'fetch' })
  preload('/textures/borders.webp', { as: 'fetch' })
  preload('/textures/galaxy.avif', { as: 'image', type: 'image/avif' })

  return (
    <>
      <Hero />
      <Facts />
      <Introduction />
      <TourFacility />
      <EnvironmentSection />
      <ProcessSection />
      <Quality />
      <People />
      <Quote />
      <CertificationsSection />
      {/* Dev-only earth tuning surface; renders nothing in production
          unless the URL carries ?tune. */}
      <TunePanel />
    </>
  )
}
