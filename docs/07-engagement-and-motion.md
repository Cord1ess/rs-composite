# 07. Engagement and Motion

The goal is to captivate the visitor, keep them on the page and make them
explore. Everything here serves that. Anything that conflicts with it loses.

## Three windows

| Window | Question in their head | What answers it |
|---|---|---|
| First 3 seconds | What am I looking at | Video, liquid glass, strict grayscale |
| 3 to 30 seconds | Is there more | Labelled links visible above the fold |
| 30 seconds to 5 minutes | Was it worth it | The scroll sequence pays off every promise |

Most factory sites fail the first window. Sites that pass it usually fail the
second, because a beautiful hero with nothing visibly beyond it reads as a
splash screen. Splash screens get closed.

## First window

Rules for the moment of arrival:

- The video is already moving on first paint. The poster to video handoff is
  invisible.
- Nothing may cover the hero. No cookie banner, no newsletter modal, no chat
  bubble, no preloader.
- No motion graphics, no typewriter effect, no counting numbers. Grayscale glass
  over video is enough on its own.

One entrance animation is permitted. A 500ms fade and 12px rise, staggered 40ms
apart, in this order: wordmark, logo, headline, primary action, pills, right
panel, quote. No scale, no blur. It reads as the glass settling into place.
Disabled entirely under reduced motion.

## Second window

Eight things above the fold lead somewhere. Every one is a real link.

| Element | Destination |
|---|---|
| See the Facility | `/facility` |
| Knitting pill | `/process/knitting` |
| Dyeing and Finishing pill | `/process/dyeing-and-finishing` |
| Garmenting pill | `/process` |
| Environment card | `/environment` |
| Dyeing and Finishing card | `/process/dyeing-and-finishing` |
| Certifications card | `/certifications` |
| Knitting card | `/process/knitting` |

**Hover.** The glass tier never changes on hover, since that flickers. Instead
the icon circle brightens from `bg-white/10` to `bg-white/20`, the icon plays its
motion once and the card lifts to `scale-105`. The message is that this responds,
so it goes somewhere.

**Scroll cue.** One chevron below the pills at `text-white/50`, looping a 6px
rise and fall on a 2.4 second cycle. It is the cheapest reliable device against
bouncing. It fades out permanently once the user passes 5vh.

**The fold.** The hero is `min-h-screen`, but the next section's first line sits
so that roughly 40px of it is visible on a 1080p screen. A hero that occupies
exactly 100vh reads as a closed door. A hero with something under its edge reads
as a page.

## Mobile

Below 1024px the right panel is hidden, which removes four of the eight links.
Mobile compensates:

- The scroll cue is mandatory rather than optional.
- The three pills wrap to two rows and stay full size. They are now the primary
  way to explore.
- A horizontally scrolling rail carrying the same three right panel cards sits
  immediately below the fold, so the promise is delayed rather than deleted.

Mobile is the same promise resequenced, never a stripped hero.

## Third window

### Reveal grammar

Every section uses the same reveal so the page feels authored rather than
assembled.

```
from:     opacity 0, y 24px
to:       opacity 1, y 0
duration: 600ms
easing:   cubic-bezier(0.22, 1, 0.36, 1)
trigger:  IntersectionObserver at 15% visible, once
stagger:  60ms between children
```

No parallax on body content. No horizontal drift. No rotation. The glass system
is already doing a lot, so motion stays quiet.

### Section behaviour

**Facts.** Figures count up from zero once on entry over 900ms. Numbers only,
never the units. Reduced motion renders final values immediately.

**Environment.** A background layer cross fades between campus footage as the
cards scroll past, under the same grayscale filter as the hero.

**Process.** The set piece. Eight stages, pinned and moving horizontally.

- The section pins for roughly 800vh of scroll while stages translate sideways.
- Each stage shows full bleed grayscale footage, the stage name, one line of
  description and a glass detail card that slides in.
- Its animated icon loops while the stage is on screen and stops when it leaves.
- A progress rail sits at the bottom edge. It shows stage names, not numbers.
  Eight short labels, the current one at `text-white`, the rest at
  `text-white/50`.
- Below 1024px and under reduced motion the section becomes a plain vertical
  stack of eight blocks. The pin is an enhancement and never a dependency.

Stages are never labelled 01 through 08. The name is the label.

**People.** A slow grayscale portrait grid. This is the only section allowed to
feel warm. It does that with photography rather than colour.

**Certifications.** Grayscale marks on glass tiles, each expanding on click to
show the standard, the scope, the certificate number and the validity date.
Buyers open these.

### Converting without interrupting

No exit intent modal, ever. Instead a persistent glass bar fades in after the
Process section and stays: "Tell us what you need made" with one action. It
converts without covering anything.

## The Menu overlay

- Opens as a full screen strong glass layer over the still playing, further
  blurred video.
- Items rise in on a 40ms stagger.
- Each top level group carries one line of description rather than only a label.
  A navigation that explains gets used.
- Focus trapped, Escape closes, closes on route change, body scroll locked while
  open.

## Motion budget

| Rule | Limit |
|---|---|
| Elements animating at once | 8 |
| Properties | `transform`, `opacity` and `stroke-dashoffset` only |
| Scroll handlers | `requestAnimationFrame` throttled, or CSS driven |
| Frame rate | 60fps on a mid tier Android. If the pinned Process section cannot hold it, the vertical fallback ships everywhere. |
| Video decoding | One at a time. Off screen video pauses. |

Animating `backdrop-filter` is banned. It repaints everything behind the element
and destroys the frame rate on exactly the devices we care about.

## Not doing

| Pattern | Why not |
|---|---|
| Preloader or percentage counter | Adds seconds to the first window to solve a problem we do not have |
| Auto rotating carousel | Takes control away, buyers dislike them, poor for search |
| Exit intent modal | Small conversion lift for a large brand cost |
| Custom cursor or cursor follower | Dated. Hostile on touch. |
| Page wide scroll jacking | Only the Process section pins. It has a full fallback. |
| Chat widget on first paint | Covers the hero |
| Animated background gradients | Competes with the video for attention and GPU |
| Decorative numbering on stages or sections | Adds no information |
| Colour anywhere | Breaks the strongest idea in the system |

## Measurement

- `hero_action_click`, `hero_pill_click` with label, `hero_card_click` with label
- `scroll_depth` at 25, 50, 75 and 100%
- `process_stage_view` with the stage name
- `certificate_expand` with the certificate name
- `enquiry_start` and `enquiry_submit`

If `hero_pill_click` is near zero after a month, the pills are reading as
decoration and need a different affordance. That is what this instrumentation
exists to catch.
