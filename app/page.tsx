import { preload } from 'react-dom'
import TunePanel from '@/components/dev/TunePanel'
import { SectionSnap } from '@/components/ui/SectionSnap'
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
  /*
    No texture preloads any more, deliberately. They fire from the HTML
    before the capability probe can decline, so every GATED visitor (data
    saver, no WebGL, weak device) downloaded ~3.4 MB it would never use —
    the exact people the gate exists to protect. Since audit III the main
    thread starts the real fetches the moment the globe effect runs, so
    the preload head start had shrunk to the hydration delta; the loading
    screen absorbs it. The galaxy plate stays preloaded: it is a CSS
    background every visitor sees, fallback or not.
  */
  preload('/textures/galaxy.avif', { as: 'image', type: 'image/avif' })

  return (
    <>
      {/* Section based scrolling: gestures step between snap stops instead of
          free scrolling. Home page only; content pages read normally. */}
      <SectionSnap />
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
