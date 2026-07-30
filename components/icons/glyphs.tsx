/**
 * Icon glyphs. 24x24 canvas, 1.5 stroke, round caps, no fills, currentColor.
 * Every glyph depicts the thing it labels. No metaphors.
 *
 * data-part="motion" marks the group that animates.
 * data-part="trace"  marks paths that draw on.
 */

/* ----------------------------------------------------------- interface */

export const Menu = () => (
  <>
    <path d="M4 9h16" />
    <g data-part="motion">
      <path d="M4 15h16" />
    </g>
  </>
)

export const Close = () => (
  <g data-part="motion">
    <path d="M6.5 6.5l11 11" />
    <path d="M17.5 6.5l-11 11" />
  </g>
)

export const ArrowRight = () => (
  <g data-part="motion">
    <path d="M4 12h15" />
    <path d="M13 6l6 6-6 6" />
  </g>
)

export const ArrowUpRight = () => (
  <g data-part="motion">
    <path d="M7 17L17 7" />
    <path d="M8.5 7H17v8.5" />
  </g>
)

export const ChevronDown = () => (
  <g data-part="motion">
    <path d="M6 9.5l6 6 6-6" />
  </g>
)

export const Mail = () => (
  <>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <g data-part="motion">
      <path d="M3.8 7l8.2 6 8.2-6" />
    </g>
  </>
)

export const Plus = () => (
  <g data-part="motion">
    <path d="M12 5.5v13" />
    <path d="M5.5 12h13" />
  </g>
)

export const Minus = () => (
  <g data-part="motion">
    <path d="M5.5 12h13" />
  </g>
)

export const Phone = () => (
  <g data-part="motion">
    <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />
  </g>
)

export const Pin = () => (
  <>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <g data-part="motion">
      <circle cx="12" cy="10" r="2.5" />
    </g>
  </>
)

export const Download = () => (
  <>
    <path d="M4.5 16v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" />
    <g data-part="motion">
      <path d="M12 3.5v11" />
      <path d="M7.5 10.5l4.5 4.5 4.5-4.5" />
    </g>
  </>
)

/* ------------------------------------------------------------- process */

/** Circular knitting machine seen from above. Needle bed rotates. */
export const Knitting = () => (
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.2" />
    <g data-part="motion">
      <path d="M12 4v2.2" />
      <path d="M12 17.8V20" />
      <path d="M4 12h2.2" />
      <path d="M17.8 12H20" />
      <path d="M6.34 6.34l1.56 1.56" />
      <path d="M16.1 16.1l1.56 1.56" />
      <path d="M17.66 6.34L16.1 7.9" />
      <path d="M7.9 16.1l-1.56 1.56" />
    </g>
  </>
)

/** Dye vat with fabric rope entering. Liquid level moves. */
export const Dyeing = () => (
  <>
    <path d="M4 8.5h16v8.5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" />
    <path d="M9 8.5c0-2.2 1.3-3.5 3-3.5s3 1.3 3 3.5" data-part="trace" />
    <g data-part="motion">
      <path d="M5 13.6c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 5 0" />
    </g>
  </>
)

/** Ply stack with a cutting head travelling its rail. */
export const Cutting = () => (
  <>
    <path d="M3 5.5h18" />
    <g data-part="motion">
      <rect x="9.25" y="2.75" width="5.5" height="5.5" rx="1" />
      <path d="M12 8.25v3.25" />
    </g>
    <path d="M3 14h18" />
    <path d="M3 17h18" />
    <path d="M3 20h18" />
  </>
)

/** Screen frame with a squeegee sweeping down. */
export const Printing = () => (
  <>
    <rect x="3" y="3.5" width="18" height="12.5" rx="1.5" />
    <g data-part="motion">
      <path d="M5.5 9.5h13" />
      <path d="M11 7.2h2" />
    </g>
    <path d="M7 20h10" />
  </>
)

/** Embroidery head. Needle drives, stitch traces in the hoop. */
export const Embroidery = () => (
  <>
    <circle cx="12" cy="15" r="5.5" />
    <g data-part="motion">
      <path d="M12 2.5v6.2" />
      <path d="M11.1 4.4h1.8" />
    </g>
    <path d="M9.3 16.4c1.8-2.4 3.6-2.4 5.4 0" data-part="trace" />
  </>
)

/** Sewing machine head. Needle bar drives, stitches trace behind. */
export const Sewing = () => (
  <>
    <path d="M3 5.5h13a3 3 0 0 1 3 3v2.5" />
    <path d="M3 5.5v6" />
    <path d="M2 18.5h20" />
    <g data-part="motion">
      <path d="M19 12v3.6" />
    </g>
    <path d="M5 15.5h2M9 15.5h2M13 15.5h2" data-part="trace" />
  </>
)

/** Finished garment under an inspection lens. */
export const Finishing = () => (
  <>
    <path d="M8.8 3.5L5.5 5.4v3.9h2.6V20.5h7.8V9.3h2.6V5.4l-3.3-1.9" />
    <path d="M8.8 3.5a3.2 3.2 0 0 0 6.4 0" />
    <g data-part="motion">
      <circle cx="13.6" cy="13.5" r="2.8" />
      <path d="M15.6 15.5l1.9 1.9" />
    </g>
  </>
)

/** Carton with flaps closing. */
export const Packing = () => (
  <>
    <path d="M4 9.5h16V20.5H4z" />
    <g data-part="motion">
      <path d="M4 9.5L7.5 5h9l3.5 4.5" />
    </g>
    <path d="M12 9.5v11" />
  </>
)

/* --------------------------------------------------------- environment */

/** Roof, falling rain, collection tank. */
export const Rainwater = () => (
  <>
    <path d="M2.5 8.5L8 4l5.5 4.5" />
    <g data-part="motion">
      <path d="M5.5 11v2.2" />
      <path d="M8 12.4v2.2" />
      <path d="M10.5 11v2.2" />
    </g>
    <path d="M14.5 9.5h6.5v11h-6.5z" />
    <path d="M14.5 15.5h6.5" />
  </>
)

/** Two treatment tanks with flow between them. */
export const Effluent = () => (
  <>
    <path d="M12 4.5v4.5" />
    <path d="M9.5 4.5h5" />
    <path d="M3 9.5h6.5v10H3z" />
    <path d="M14.5 9.5H21v10h-6.5z" />
    <path d="M9.5 13h5" />
    <g data-part="motion">
      <path d="M4 15.5c1-0.9 1.8-0.9 2.8 0s1.8 0.9 2.8 0" />
      <path d="M15.5 16.5c1-0.9 1.8-0.9 2.8 0s1.8 0.9 2.8 0" />
    </g>
  </>
)

/** Boiler vessel raising steam. */
export const Boiler = () => (
  <>
    <path d="M6 10h12v8.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
    <path d="M8.5 20.5v1.5" />
    <path d="M15.5 20.5v1.5" />
    <path d="M9 14.5h6" />
    <g data-part="motion">
      <path d="M9.5 8c0-1.6 1.6-1.6 1.6-3.2" />
      <path d="M14 8c0-1.6 1.6-1.6 1.6-3.2" />
    </g>
  </>
)

/** Window aperture throwing daylight across a floor. */
export const Daylight = () => (
  <>
    <path d="M3.5 3.5h7v17h-7z" />
    <path d="M7 3.5v17" />
    <g data-part="motion">
      <path d="M13 7.5l6.5 2.5" />
      <path d="M13 12h7.5" />
      <path d="M13 16.5l6.5-2.5" />
    </g>
  </>
)

/** Thermometer against a floor line. */
export const Temperature = () => (
  <>
    <path d="M12 3.5a2 2 0 0 1 2 2v8.1a3.8 3.8 0 1 1-4 0V5.5a2 2 0 0 1 2-2z" />
    <g data-part="motion">
      <path d="M12 9.5v5.5" />
    </g>
    <path d="M15.8 7h3M15.8 10h2M15.8 13h3" />
  </>
)

/** Sorted waste dropping into a bin. */
export const Waste = () => (
  <>
    <g data-part="motion">
      <path d="M9.5 3.5v3" />
      <path d="M12 2.5v4" />
      <path d="M14.5 3.5v3" />
    </g>
    <path d="M4.5 10h15" />
    <path d="M6.5 10h11l-0.9 9.2a1.5 1.5 0 0 1-1.5 1.3H8.9a1.5 1.5 0 0 1-1.5-1.3z" />
  </>
)

/** Tree and water on the campus. */
export const Garden = () => (
  <>
    <path d="M12 3c-3.3 0-5.6 2.4-5.6 5.1s2.3 4.7 5.6 4.7 5.6-2 5.6-4.7S15.3 3 12 3z" />
    <path d="M12 12.8v4.4" />
    <g data-part="motion">
      <path d="M3 20.5c1.8-1.3 3.2-1.3 5 0s3.2 1.3 5 0 3.2-1.3 5 0" />
    </g>
  </>
)

/** Worker walking to the factory. */
export const Walk = () => (
  <>
    <circle cx="6.5" cy="4" r="1.9" />
    <path d="M6.5 6.5v5.5" />
    <path d="M6.5 8.5L9 10.5" />
    <path d="M6.5 12l2.2 7.5" />
    <g data-part="motion">
      <path d="M6.5 12L4.3 19.5" />
    </g>
    <path d="M13 20.5V9h8v11.5" />
    <path d="M15.5 12h1.2M18.8 12H20M15.5 15.5h1.2M18.8 15.5H20" />
    <path d="M2 20.5h20" />
  </>
)

/* ---------------------------------------------------------- compliance */

/** Certificate with a seal. */
export const Certificate = () => (
  <>
    <path d="M18.5 12.5V7.2L14.3 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h3.6" />
    <path d="M13.8 3v4.5h4.7" />
    <path d="M8.5 10h3.5M8.5 13.5h3" />
    <g data-part="motion">
      <circle cx="16.4" cy="16.6" r="3.1" />
    </g>
    <path d="M14.6 19.1L13.9 22l2.5-1.1 2.5 1.1-0.7-2.9" />
  </>
)

/** Inspection clipboard with a tick. */
export const Audit = () => (
  <>
    <path d="M8.5 4.5H6.5A1.5 1.5 0 0 0 5 6v13.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5h-2" />
    <rect x="8.5" y="2.75" width="7" height="3.5" rx="1" />
    <path d="M8.5 13.2l2.6 2.6 4.4-5" data-part="trace" />
  </>
)

/** Health card. */
export const Healthcare = () => (
  <>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <g data-part="motion">
      <path d="M12 9v6" />
      <path d="M9 12h6" />
    </g>
  </>
)

/** Adult and child, hands joined. */
export const Childcare = () => (
  <>
    <circle cx="7.2" cy="4.4" r="2" />
    <path d="M7.2 6.4v6.6" />
    <path d="M7.2 13l-1.9 7.5" />
    <path d="M7.2 13l2 7.5" />
    <circle cx="16.8" cy="10" r="1.6" />
    <path d="M16.8 11.6v4" />
    <path d="M16.8 15.6L15.4 20.5" />
    <path d="M16.8 15.6l1.4 4.9" />
    <g data-part="motion">
      <path d="M8.8 11.6h6.4" />
    </g>
  </>
)

/** Extinguisher and hose. */
export const FireSafety = () => (
  <>
    <path d="M8 9.5h6.5v9a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" />
    <path d="M9.8 6.5h3v3h-3z" />
    <path d="M12.8 5.5h3" />
    <path d="M9 13.5h4.5" />
    <g data-part="motion">
      <path d="M16 4.5c2.2 0 3.5 1.5 3.5 3.4" />
    </g>
  </>
)

/* ------------------------------------------------------------- company */

export const Globe = () => (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <g data-part="motion">
      <path d="M12 3a13.5 13.5 0 0 1 0 18a13.5 13.5 0 0 1 0-18z" />
    </g>
  </>
)

export const Factory = () => (
  <>
    <path d="M3 20.5V11.5l5.5 3v-3l5.5 3V4.5h6.5v16" />
    <path d="M2 20.5h20" />
    <path d="M16.5 8h1.5M16.5 11.5h1.5M16.5 15h1.5" />
  </>
)

/* -------------------------------------------------------------- social */

export const Linkedin = () => (
  <>
    <rect x="3" y="3" width="18" height="18" rx="3.5" />
    <path d="M7.6 10.5v6" />
    <circle cx="7.6" cy="7.5" r="0.65" />
    <path d="M11.6 16.5v-6" />
    <path d="M11.6 13.4a2.6 2.6 0 0 1 5.2 0v3.1" />
  </>
)

export const Facebook = () => (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 8.2h-1.6a1.9 1.9 0 0 0-1.9 1.9V21" />
    <path d="M9.4 13.4h5.2" />
  </>
)

export const Instagram = () => (
  <>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="16.9" cy="7.1" r="0.7" />
  </>
)
