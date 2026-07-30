# 03. Design System

Liquid glass over a generated globe, in strict grayscale. Every rule below is
normative.

## Performance contract

`backdrop-filter` is the most expensive property on this site. It forces the
browser to re-rasterise everything behind the element. It does that again on
every scroll frame, every hover and every video frame. A first build that used
it on roughly sixty cards was unusable.

The rules that came out of that:

1. **At most two `backdrop-filter` surfaces exist on the page.** Both live in the
   hero. Neither is `position: fixed`.
2. **Everything below the hero uses `.glass-surface`**, which is a flat
   translucent background with the same gradient ring and no blur. Over a near
   black page the difference is invisible.
3. **No CSS filter over a full viewport.** This applies to any video that is
   added later. It repaints at frame rate.
4. **Cards translate on hover, never scale.** Scaling an element that carries a
   masked `::before` ring re-rasterises the mask. Translation is composited.
   Small controls, pills and buttons may still scale.
5. **One IntersectionObserver for the whole page**, not one per revealed element.
6. **`content-visibility: auto` on every section below the fold**, so off screen
   sections cost no layout or paint.
7. **Animate `transform`, `opacity` and `stroke-dashoffset` only.** Animating
   `backdrop-filter` is banned outright.

## Colour

All variables are `0 0% X%` HSL. Hue and saturation are always zero.

```css
:root {
  --background:             0 0% 4%;
  --foreground:             0 0% 100%;
  --card:                   0 0% 8%;
  --card-foreground:        0 0% 100%;
  --popover:                0 0% 8%;
  --popover-foreground:     0 0% 100%;
  --primary:                0 0% 100%;
  --primary-foreground:     0 0% 4%;
  --secondary:              0 0% 15%;
  --secondary-foreground:   0 0% 100%;
  --muted:                  0 0% 15%;
  --muted-foreground:       0 0% 62%;
  --accent:                 0 0% 20%;
  --accent-foreground:      0 0% 100%;
  --destructive:            0 0% 30%;
  --destructive-foreground: 0 0% 100%;
  --border:                 0 0% 20%;
  --input:                  0 0% 20%;
  --ring:                   0 0% 80%;
  --radius: 1rem;
}
```

Text hierarchy over video. Only four levels exist.

| Class | Use |
|---|---|
| `text-white` | Headlines, primary labels, active nav, icons |
| `text-white/80` | Serif italic accents in headings, body copy, pill labels |
| `text-white/60` | Secondary descriptions inside cards |
| `text-white/50` | Small labels, meta, captions |

Nothing below 50. Nothing between these steps.

No colour anywhere in the interface. Not in certificate logos, partner marks,
charts, focus rings or error states. Third party logos render through
`filter: grayscale(1)`. Errors are communicated by weight, icon and words, never
by red.

**One deliberate exception: imagery of the real world.** The hero is a
photographic NASA Earth over a real all sky survey, graded green. Factory
footage will be in colour too when it exists. The rule is interface grayscale,
world in colour. That contrast is what stops the page reading as cold. It is
why the hero is the only thing on the home page with a hue.

The green grade is applied inside the Earth's fragment shader, not as a CSS
filter over the canvas, which would repaint the whole viewport on every frame.

## Typography

| Role | Family | Usage |
|---|---|---|
| Display and body | Poppins | All headings and body text |
| Serif accent | Source Serif 4 | Italic emphasis inside headings only. `<em>`, `<i>` or `.italic` within h1 to h3. |

Headings use weight 500. Not 600, not 700.

Source Serif 4 never appears in body copy, buttons, navigation or captions. Its
only job is one phrase per heading. That contrast is the signature.

```ts
// app/fonts.ts
import { Poppins, Source_Serif_4 } from 'next/font/google'

export const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
})

export const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  style: ['italic'],
  weight: ['300', '400'],
  variable: '--font-serif',
  display: 'swap',
})
```

```js
fontFamily: {
  display: ['var(--font-display)', 'system-ui', 'sans-serif'],
  serif:   ['var(--font-serif)', 'Georgia', 'serif'],
}
```

### Scale

| Token | Size | Tracking | Weight | Use |
|---|---|---|---|---|
| Hero h1 | `text-6xl lg:text-7xl` | `tracking-[-0.05em]` | 500 | Hero only |
| h2 | `text-4xl lg:text-5xl` | `tracking-[-0.04em]` | 500 | Section headings |
| h3 | `text-2xl lg:text-3xl` | `tracking-[-0.03em]` | 500 | Cards and sub sections |
| Wordmark | `text-2xl` | `tracking-tighter` | 600 | Logo lockup only |
| Body | `text-base` | normal | 400 | Paragraphs |
| Body small | `text-sm` | normal | 400 | Card descriptions |
| Pill and meta | `text-xs` | normal | 400 | Glass pills, captions |
| Label | `text-xs` | `tracking-widest` uppercase | 400 | Small section labels |

Negative tracking on headings is what keeps the type contemporary rather than
corporate. It is not optional.

## The three glass tiers

Defined under `@layer components` in `app/globals.css`. These are the only
three. Do not invent a fourth.

### Surface. The default.

No blur. Used for every card, panel, pill and control below the hero, plus
the header. This is what the overwhelming majority of the site uses.

```css
.glass-surface {
  position: relative;
  background: rgba(255, 255, 255, 0.035);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
/* ::before gradient ring identical to the tiers below, at 0.4 / 0.12 alpha */
```

### Light. Hero only.

Blur reduced from 4px to 6px because there is now only one of them, so it can
afford to read more clearly. Used on the hero's quick link bar.

```css
@layer components {
  .liquid-glass {
    position: relative;
    background: rgba(255, 255, 255, 0.03);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }

  .liquid-glass::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.4px;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.45) 0%,
      rgba(255, 255, 255, 0.15) 20%,
      transparent 40%,
      transparent 60%,
      rgba(255, 255, 255, 0.15) 80%,
      rgba(255, 255, 255, 0.45) 100%
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
}
```

### Strong. Primary action and the menu overlay only.

Blur reduced from 50px to 28px. At 50px the cost was severe and the visual gain
above 28px is close to nothing.

```css
@layer components {
  .liquid-glass-strong {
    position: relative;
    background: rgba(255, 255, 255, 0.05);
    -webkit-backdrop-filter: blur(28px);
    backdrop-filter: blur(28px);
    box-shadow:
      4px 4px 4px rgba(0, 0, 0, 0.05),
      inset 0 1px 1px rgba(255, 255, 255, 0.15);
    overflow: hidden;
  }

  .liquid-glass-strong::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.4px;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.5) 0%,
      rgba(255, 255, 255, 0.2) 20%,
      transparent 40%,
      transparent 60%,
      rgba(255, 255, 255, 0.2) 80%,
      rgba(255, 255, 255, 0.5) 100%
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
}
```

### Rules

- No `border-*` utility class anywhere in markup. The `::before` gradient ring is
  the border. A Tailwind border on a glass element double strokes and looks broken.
- Glass elements set their own `rounded-*`. The pseudo element inherits it.
- `overflow: hidden` is part of the recipe.
- Never nest a blurred tier inside another blurred tier. The blur compounds into
  mud and the cost doubles. Surface inside light is correct. That is what the
  hero's quick link bar does: one blurred container, flat children.
- `background-blend-mode: luminosity` was dropped. At 0.01 alpha it changed
  nothing visible and added a compositing pass.

### Radius

| Element | Radius |
|---|---|
| Panel overlays | `rounded-3xl` |
| Outer feature container | `rounded-[2.5rem]` |
| Cards | `rounded-3xl` |
| Pills, actions, icon buttons | `rounded-full` |

## Elements that do not exist

Deliberately absent from the whole system.

- Decorative numbering. No 01, 02, 03 on process stages, features or sections.
- Decorative rules, brackets, corner ticks, plus marks or crosshairs.
- Gradient text, glows, drop shadows on type.
- Badges, ribbons, "new" tags.
- Emoji.
- Any accent shape that carries no information.

If a mark on screen does not name something, link somewhere or separate two
things that need separating, it does not ship.

The one exception is the pair of horizontal rules either side of the hero quote
attribution. Those are structural: they set the name apart from the quote above
it.

## Icons

Custom animated SVG set. Every icon is literal. Full specification in
[08-icon-system.md](08-icon-system.md).

Standard container:

```html
<div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
```

The primary action uses the smaller variant: `w-7 h-7 rounded-full bg-white/15`.

## Motion

| Interaction | Treatment |
|---|---|
| Cards and panels | `hover:-translate-y-0.5 hover:bg-white/[0.06]`. Never scale. |
| Pills, buttons, small controls | `hover:scale-105 transition-transform` |
| Primary action | `hover:scale-105 active:scale-95 transition-transform` |
| Icon links | `transition-colors` on the text colour |
| Duration | 200ms |
| Easing | `cubic-bezier(0.22, 1, 0.36, 1)` |

Cards do not scale because a masked `::before` ring has to be re-rasterised at
every intermediate size. A 1 to 2px lift reads the same and costs nothing.

Scroll behaviour is specified in
[07-engagement-and-motion.md](07-engagement-and-motion.md).

`prefers-reduced-motion: reduce` disables video autoplay, all scale transforms,
all icon animation and all scroll driven motion. Opacity fades up to 150ms stay.

## Spacing and layout

- 4px base scale.
- Panel insets `inset-4 lg:inset-6`.
- Section rhythm on inner pages `py-24 lg:py-32`.
- Max content width `max-w-[1400px]`. The hero uses full viewport width.

| Range | Behaviour |
|---|---|
| Under 1024px | Left panel only, full width. Right panel hidden. |
| 1024px and up | Split. Left 52%, right 48%. |

## Legibility over video

With the video gone the risk dropped sharply, because a generated globe on a
flat dark field has a known, fixed luminance. The scrim stays, both to seat the
headline and because it will be needed again the moment real footage goes behind
anything.

The scrim sits between the globe and the content.

```css
.hero-scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(105deg,
      rgba(0,0,0,0.72) 0%,
      rgba(0,0,0,0.55) 45%,
      rgba(0,0,0,0.30) 100%),
    radial-gradient(120% 90% at 20% 60%,
      rgba(0,0,0,0.45) 0%, transparent 70%);
}
```

Weighted toward the left panel where the headline and the smallest text sit.

The hero background is now a projected globe rather than video, so the scrim's
job changed. It is weighted left, where the headline sits, then eases off on the
right so the globe keeps its contrast. It also darkens the bottom edge where the
quick link bar sits.

The scrim is `pointer-events-none` and sits between the globe and the hotspot
layer, so it never blocks a hover and never dims an info card. See
[04-hero-spec.md](04-hero-spec.md) for the full layer order.

**Video is no longer used anywhere on the site.** When real factory footage
exists it will play in colour with no CSS filter on it. Forcing a full viewport
filter onto a playing video repaints at frame rate. Desaturating footage
throws away the one warm, human, moving thing on an otherwise monochrome page.
The interface stays strict grayscale. Footage does not.

Verification before launch: check every text layer against WCAG AA over the
globe's brightest region, which is the land fill at the top left of the disc. If
footage is ever placed behind content, sample twelve evenly spaced frames and
check against the brightest. If any fail, deepen the scrim. Never lighten the
text opacity ladder.

## Accessibility

- Focus ring `focus-visible:ring-2 focus-visible:ring-white/80
  focus-visible:ring-offset-2 focus-visible:ring-offset-transparent`. Required,
  since the design has no borders.
- Video is decorative. `aria-hidden="true"`, muted, no audio track.
- Every icon only button carries an `aria-label`.
- Heading order never skips for styling.
- Minimum touch target 44 by 44. The 32px icon containers need an invisible
  padded hit area on mobile.
- The Menu overlay traps focus and closes on Escape.

## Backdrop filter support

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .liquid-glass        { background: rgba(255,255,255,0.06); }
  .liquid-glass-strong { background: rgba(20,20,20,0.55); }
}
```

The blur budget is two surfaces for the entire page: the hero quick link bar at
6px and the primary action at 28px. The menu overlay adds a third only while it
is open. While that is true, nothing behind it is being scrolled.

Inner pages get zero blurred surfaces. They use the surface tier throughout.
