# 08. Icon System

One custom animated SVG set covering the whole site. Every icon depicts the
thing it labels. No metaphors, no emoji, no mixed sources.

## Why not an off the shelf set

The supplied specification uses lucide-react. Lucide is a good geometric base
but it has no knitting machine, no dye vat, no effluent plant and no embroidery
head, so a manufacturing site built on it ends up labelling dyeing with a magic
wand and certifications with a book. Those are metaphors. A sourcing manager
reads them as decoration.

The set is therefore drawn in house, on the same grid and stroke as lucide so
the generic interface icons (menu, arrow, close, external link, social) stay
visually identical to the custom ones.

## Drawing rules

Every icon, without exception:

| Property | Value |
|---|---|
| Canvas | 24 by 24 |
| Live area | 20 by 20, 2px padding on all sides |
| Stroke | 1.5px |
| Caps and joins | round |
| Fill | none |
| Colour | `currentColor` |
| `vector-effect` | `non-scaling-stroke` |
| Corner radius on shapes | 2px minimum |
| Optical alignment | centred by mass, not by bounding box |

No filled shapes. No two tone. No gradients. No perspective. Everything reads at
16px and at 64px without redrawing.

Each icon is built from named path groups so animation can target parts:

```
<g data-part="static">   never moves
<g data-part="motion">   the part that animates
<g data-part="trace">    stroke-dasharray draw-on paths
```

## Motion rules

Icons are animated, quietly. Motion carries meaning, never attention.

| Trigger | Behaviour |
|---|---|
| First time in view | Draw on. `stroke-dashoffset` from full to 0 over 600ms. Once only. |
| Hover or focus on the parent | The `motion` group plays its loop once |
| Active process stage | The `motion` group loops continuously while the stage is on screen |
| Reduced motion | No draw on, no loop. Final state renders immediately. |

Constraints:

- Animate `transform`, `opacity` and `stroke-dashoffset` only. Never `width`,
  `height`, `d`, `filter` or `stroke-width`.
- Loop length 1200ms to 2000ms. Anything faster reads as nervous.
- Easing `cubic-bezier(0.22, 1, 0.36, 1)`, or linear for rotation.
- Maximum eight icons animating at once on any screen.
- Idle looping is allowed only for the active process stage. Everywhere else
  motion is triggered.

## The set

### Process icons

These are the important ones. Each depicts real equipment or a real operation.

| Name | Depicts | Motion |
|---|---|---|
| `knitting` | Circular knitting machine head with needle bed and yarn feed | Yarn path traces in a loop, needle bed rotates slowly |
| `dyeing` | Dye vat with fabric rope and liquid line | Liquid line rises and falls, fabric rope rotates |
| `finishing` | Stenter frame with fabric passing through rollers | Fabric translates left to right, rollers rotate |
| `cutting` | Layered fabric stack with a cutting head on a rail | Cutting head travels the rail once |
| `printing` | Screen frame with squeegee over a garment panel | Squeegee sweeps down the frame |
| `embroidery` | Embroidery head with needle and hoop | Needle drives up and down, thread trace draws |
| `sewing` | Sewing machine head, needle and feed dog | Needle drives, stitch line traces behind it |
| `finishing-qc` | Garment on a form with an inspection lens | Lens travels across the garment |
| `packing` | Carton with folded garments and a seal line | Carton flaps fold closed |
| `lab` | Beaker with a colour swatch card | Swatch card slides in, liquid line settles |
| `cad` | Pattern piece with grade lines on a screen | Grade lines draw on in sequence |

### Environment icons

| Name | Depicts | Motion |
|---|---|---|
| `rainwater` | Roof line with rain and a collection tank | Droplets fall, tank level rises |
| `effluent` | Treatment tanks with a flow line between them | Flow line traces through the tanks |
| `boiler` | Boiler vessel with a steam line | Steam line rises and dissipates |
| `daylight` | Window aperture with light rays onto a floor plane | Rays extend |
| `temperature` | Thermometer against a floor line | Column settles to its mark |
| `waste` | Sorted bins with a return arrow | Arrow travels the loop |
| `garden` | Tree and water feature against the building line | Leaves drift once |
| `walk` | Figure walking toward a building outline | Figure takes two steps |
| `generator` | Generator unit with a power line | Power line pulses once |

### Compliance and facility icons

| Name | Depicts | Motion |
|---|---|---|
| `certificate` | Document with a seal | Seal ribbon draws on |
| `audit` | Clipboard with a tick line | Tick draws |
| `fire-safety` | Hose reel and alarm | Alarm ring pulses once |
| `healthcare` | Cross on a card | Cross draws from centre |
| `childcare` | Adult and child figures | Small figure lifts once |
| `water` | Tap with a glass | Stream falls once |
| `camera` | Fixed CC camera on a bracket | Camera pans once |
| `server` | Rack with status lines | Status lines blink in sequence |
| `ventilation` | Duct with fan blades | Blades rotate |

### Interface icons

Generic, drawn on the same grid so nothing looks borrowed.

`menu`, `close`, `arrow-right`, `arrow-down`, `arrow-up-right`, `chevron-down`,
`plus`, `minus`, `download`, `mail`, `phone`, `pin`, `external`, `search`,
`play`, `pause`, `linkedin`, `facebook`, `instagram`, `x`, `youtube`.

Motion for these:

| Icon | Motion |
|---|---|
| `menu` | Two bars converge into a cross on open |
| `arrow-right` | Shaft extends and head follows on hover |
| `chevron-down` | Bounces 3px on the scroll cue |
| `download` | Arrow drops into the tray on hover |
| `mail` | Flap opens on hover |
| Social marks | No motion. Colour transition only. |

Social marks are drawn as official glyph outlines and are exempt from the stroke
rule, since a redrawn brand mark is worse than a correct one at the wrong
weight. They render in `currentColor` at white.

## Implementation

```
components/icons/
  Icon.tsx            wrapper. size, strokeWidth, animate, aria
  registry.ts         name to component map, typed
  process/            knitting.tsx, dyeing.tsx, ...
  environment/
  compliance/
  interface/
```

```tsx
type IconProps = {
  name: IconName
  size?: 16 | 20 | 24 | 32 | 48
  animate?: 'inview' | 'hover' | 'loop' | 'none'
  title?: string          // omit for decorative, sets aria-hidden
  className?: string
}
```

Notes:

- One React component per icon, no sprite sheet. Tree shaking keeps only what a
  page imports.
- Animation is CSS driven through data attributes on the wrapper. No animation
  library in the icon layer, so icons cost nothing on the hero.
- `Icon` reads `prefers-reduced-motion` once at the app level through a context
  rather than per icon.
- Icons with `title` render `role="img"` and a `<title>`. Icons without render
  `aria-hidden="true"`.

## Hero usage

| Position | Icon | Animation |
|---|---|---|
| Menu button | `menu` | hover |
| Primary action | `arrow-right` | hover |
| Enquiry button | `mail` | hover |
| Social pill | brand marks plus `arrow-right` | none, hover on the arrow |
| Environment card | `garden` | inview |
| Dyeing and Finishing card | `dyeing` | inview then hover |
| Certifications card | `certificate` | inview then hover |
| Knitting card | `arrow-right` | hover |
| Scroll cue | `chevron-down` | loop |

That is nine animated icons on one screen, one over the eight limit, so the
scroll cue loop and the draw on animations are staggered: draw on completes
during the entrance sequence. Only the scroll cue loops afterwards.

## Production

- Draw in Figma on a 24px grid with a 1.5px stroke, outline nothing.
- Export SVG, run through SVGO with `convertPathData` precision 2.
- Hand annotate `data-part` groups. This step is manual and is the reason the
  set is scoped to roughly forty icons rather than two hundred.
- Every icon reviewed at 16px on a dark background before it enters the registry.

## Definition of done

- Every icon renders correctly at 16, 24 and 48px on the dark scrim
- No icon uses fill, gradient or a second colour
- Every process stage has a literal icon. No metaphors survive review.
- Reduced motion renders every icon in final state with no animation
- No page animates more than eight icons at once
- Icon layer adds no runtime JavaScript dependency
