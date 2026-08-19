'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

/*
  The gate. The panel body (sliders, schema, bus wiring) is its own chunk
  and only ever loads once this decides the panel is wanted: always in dev,
  and behind ?tune (or #tune) on a deployed build. Production visitors pay
  for neither the code nor the schema.
*/

const TunePanelBody = dynamic(() => import('./TunePanelBody'), { ssr: false })

export default function TunePanel() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (
      process.env.NODE_ENV === 'development' ||
      window.location.search.includes('tune') ||
      window.location.hash.includes('tune')
    ) {
      setEnabled(true)
    }
  }, [])

  return enabled ? <TunePanelBody /> : null
}
