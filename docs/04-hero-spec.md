# 04. Hero Specification

The landing screen. Rewritten from the original two panel split into a
conventional website layout after review.

## Why the split panel was dropped

The first build followed the supplied specification exactly: a 52/48 flex row,
navigation inside the left panel, a stack of feature cards filling the right.
It looked like a product launch page, not like a manufacturer a sourcing manager
would trust. It also had no site header, so there was nowhere for real
navigation to live. Everything below the fold felt disconnected from it.

The elements are all kept. They are arranged the way a website is arranged.

## The scroll sequence

The hero is a sequence, not a screen. A 260vh runway with a pinned stage inside
it. One number, `--hp`, drives everything.

```
0.00 to 0.50   the crop pulls back from the cinematic close up to a whole ball
0.45 to 0.78   the rotation settles into the network orientation
0.62 onward    the headline is gone, the shipping caption takes its place
0.74 onward    leader lines and market labels draw in
past 1.00      the stage unpins, the page continues
```

The crop and rotation ranges overlap on purpose. The globe starts turning toward
its final orientation before it has finished shrinking, so the two read as one
move rather than two.

`HeroStage` owns a single passive scroll listener, rAF guarded, writing two
things. A float on a plain module object that the render loop reads, plus a CSS
custom property that the copy fades against. Neither goes through React, so
scrolling the hero causes no reconciles at all.

**This is also what fixed the texture budget.** Peak magnification now happens
only at scroll zero and falls away immediately, so the day map does not need to
hold up under the close crop indefinitely. It went from 8192 to 6144, so the
whole payload dropped by a third.

Under reduced motion the runway collapses to one screen and the progress is
pinned at the settled end, so the globe simply arrives in its final orientation
with the labels already up.

### Rotation blending

The freely turning angle and the settled orientation are kept separate. The
scene tracks `freeSpin`, which auto rotation and drag both write to, then draws
`lerp(freeSpin, target, settle)`. Overwriting the angle instead would make drag
fight the scroll. The target is snapped to the nearest 2π equivalent of
`freeSpin`, or the globe unwinds several turns backwards to reach it.

## Layout

```
fixed site header            transparent at top, solid on scroll
  logo + wordmark  |  primary nav  |  Enquiry  |  Menu (mobile)

hero runway                  260vh, stage sticky inside it
  globe          z-1         right side on desktop, behind text on mobile
  scrim          z-2         vertical and horizontal, pointer-events-none
  hotspots       z-3         info cards, above the scrim
  content        z-10        max-w-[1400px] container, left aligned
      label      USGBC LEED Gold certified. Narayanganj, Bangladesh.
      h1         Knitwear made / from yarn to carton
      lead       one sentence on the composite line
      actions    See the Facility (strong)  ·  Start an enquiry (surface)
      pills      Knitting · Dyeing and Finishing · Garmenting
      scroll cue mobile only
  quick links    one blurred bar, four flat cards inside
```

The quick link bar sits at the bottom of the hero, inside the same container as
the content. It is the element that replaces the old right panel. It does
the same job in a shape people recognise.

## Content

| Slot | Copy |
|---|---|
| Wordmark | RSComposite |
| Label | USGBC LEED Gold certified. Narayanganj, Bangladesh. |
| Headline | Knitwear made / *from yarn to carton* |
| Lead | A 197,263 sq ft knit composite facility. Knitting, dyeing, finishing, cutting, printing, embroidery, sewing and packing all happen on one site. |
| Primary action | See the Facility |
| Secondary action | Start an enquiry |
| Pills | Knitting. Dyeing and Finishing. Garmenting. |

The serif italic span on line two is the only non Poppins text on the screen.

### Quick links

| Card | Icon | Body | Links to |
|---|---|---|---|
| Environment | `garden` | Rainwater, effluent treatment, waste fired boiler | `/environment` |
| Knitting | `knitting` | Single Jersey, Interlock, Rib, Piqué, Jacquard | `/process/knitting` |
| Dyeing and Finishing | `dyeing` | Calibrated lines, checked yard by yard | `/process/dyeing-and-finishing` |
| Certifications | `certificate` | LEED, BSCI A, Sedex 4 Pillar, ISO 9001 | `/certifications` |

Four columns at 1024px and up, two at 640px, one below that. The bar itself is
the only light tier surface on the page. Its four children are flat, so hovering
one changes a background colour rather than re-rasterising a blur.

## The quote

Moved out of the hero into its own centred band between People and
Certifications. In the split layout it was pinned to the bottom of the left
panel where it competed with the headline. As a full width band with air around
it, it lands harder.

Copy and attribution are unchanged: "From start to finish, *quality is
uncompromised*." attributed to Md. Morshed Sarwar, with a short rule either side
of the name.

## Background. The globe.

The video was removed. The supplied clip had visible jump cuts, which read as
stock footage. Stock footage is the exact thing the hero exists to avoid.

In its place is a globe with Bangladesh highlighted and shipping arcs running to
the four export markets. It says where RSComposite is and where it ships, in one
image, which is a stronger opening argument for a manufacturer than abstract
motion.

### The flat SVG tier was removed

An earlier build shipped two tiers: a projected SVG globe for everyone, with the
3D Earth loading over the top on capable devices. The SVG was generated from
`world-atlas` through `d3-geo` at build time.

It is gone. Both tiers were visible at once in practice. A flat line drawing
sitting under a photographic planet looked exactly as bad as it sounds. The
generator script, `public/globe.svg`, the hotspot layer built for it and the
three devDependencies that produced it were all deleted. `content/globe.ts` is
now a plain hand written list of five places with longitude and latitude, since
that is all the 3D scene needs.

What that costs: there is no longer a fallback for devices that cannot run
WebGL. The capability gate was narrowed to match. What fails it now sees the
plain dark hero. Detail below.

### Layering

```
z-0   hero-base       flat dark field, only seen if the gate fails
z-1   globe canvas    full bleed. star field plus the cropped planet.
z-2   hero-scrim      pointer-events-none, so hover still reaches the canvas
z-10  hero content    pointer-events-none, interactive children opt back in
```

The canvas is full bleed rather than a box on the right, because the star field
is the background of the whole section and the planet is cropped by the bottom
of the viewport.

## The 3D tier

A real sphere in three.js, loaded on idle, over the top of the flat globe.

### Why this became possible

The reason a spinning globe was rejected earlier was that a rotating sphere and
a fixed overlay cannot stay aligned. Going properly 3D removes that problem
entirely: the markers and the arcs are objects in the same scene as the sphere,
so they rotate with it and stay attached to the surface. Realism and the
information layer stop competing.

### What is in the scene

| Object | Detail |
|---|---|
| Star field | Back faced shell, NASA all sky survey. Not `scene.background`, because that cannot be graded. |
| Earth | Sphere at radius 1, 128 by 96 segments, custom `ShaderMaterial` blending a day map and a night map, graded green |
| Clouds | Shell at radius 1.006, parented to the surface group so it has no motion of its own. Pure white with a greyscale `alphaMap`. |
| Atmosphere | A flat plane just behind the sphere's centre plane with a smooth radial falloff, additive, depth tested |
| Markers | Five small spheres on the surface, one per place |
| Arcs | Four `TubeGeometry` runs along great circles, lifted by a sine profile so they leave the surface |
| Lights | One low ambient at 0.16, one directional along the sun vector. The Earth shader does its own lighting; the light exists for the cloud shell. |

### The crop

Measured off the reference frame, not guessed. A circle was fitted to three
points on the limb in a 2000 by 1299 still:

```
limb circle   centre (1607, 1439) px   radius 1186 px
in screen units, frame half height = 1
              centre (0.607, -1.216)   radius 1.826
limb apex     ndc y 0.61, leaving the top 19% of the frame as sky
```

Those are held as `REFERENCE`, in normalised units rather than world units, so
the composition survives any aspect ratio: the sphere keeps the same position
relative to the frame instead of drifting as the window widens.

`CROP` is `REFERENCE` scaled by `ZOOM`, currently **0.86**. Scaling the radius
and the centre by the same factor is a pure zoom about the screen centre, so the
composition is unchanged and only the framing loosens. It is one number to turn
if the crop wants adjusting again:

```
zoom 1.00   limb apex ndc y 0.61   sky above 19% of the frame
zoom 0.86   limb apex ndc y 0.52   sky above 24% of the frame
```

Narayanganj stays within two percent of the screen centre through the change.
`CROP_NARROW` pulls it back further for portrait, which would otherwise be
almost entirely planet.

### Rotation centre, plus what the crop costs

`CENTRE` is `lon 132, lat -26`, found by sweeping longitude and latitude against
the crop and scoring where the markers land. It puts Narayanganj within two
percent of the screen centre at 16:9, 64 degrees off the sub-camera point, and
holds it on screen down to a 1.3 aspect.

**The four export markets are on the far side and cannot be seen.** This is not
a tuning failure, it is arithmetic. At this crop depth the sub-camera point sits
well below the frame, so the visible cap is a narrow swathe. Bangladesh to
Europe is 63 degrees. A sweep of every rotation that keeps Narayanganj on screen
returns at most one visible marker:

```
 aspect 1.78
   Narayanganj  ndc  -0.02  -0.01   64deg  VISIBLE
   Poland       ndc   0.01  -0.07  123deg  far side
   France       ndc   0.06  -0.21  135deg  far side
   UK           ndc   0.09  -0.18  136deg  far side
   Netherlands  ndc   0.07  -0.14  133deg  far side
```

The arcs still leave Narayanganj and run out over the limb, which reads as
shipping over the horizon. The destination markers hide themselves when they
are behind it. The export markets are covered by the Markets section further
down the page.

Pulling the crop back to roughly `r 1.30` would bring all five back at the cost
of the reference framing. That is a content decision, not a technical one.

### Day and night

The surface is a custom shader rather than a lit material, because city lights
are emissive. They do not get darker for being in shadow, so they cannot come
from a normal lighting model.

```
daylight = smoothstep(-0.22, 0.30, dot(normal, sun))
lit      = day * (0.14 + 0.96 * max(dot(normal, sun), 0))
lights   = night * 1.5 * (1 - daylight)
colour   = lit * daylight + lights
```

The terminator is deliberately wide. A narrow one reads as a lighting bug rather
than as dusk.

The sun is fixed in world space and does not rotate with the Earth, so the
terminator stays put while the planet turns through it. Cities light up as they
cross into night.

Its angle matters more than it looks. At 44 degrees off the view axis the whole
visible disc was in daylight and the night map was never seen at all. It now
sits at 65 degrees, `(0.88, 0.20, 0.43)`, which puts the terminator through
Europe: Bangladesh stays in clear daylight while the export markets are lit by
their own cities.

### Atmosphere

Two earlier attempts were wrong and both are worth recording.

**A back faced fresnel shell**, which is the usual way to do this. It is
brightest at its own silhouette, so it draws a hard circular edge around the
glow. That is not a tuning problem, it is the wrong shape.

**A plane with `depthTest: false` and `renderOrder: -1`.** The intent was that
the Earth would paint over the middle. It does not. The Earth is opaque, so it
renders in the opaque pass, then every transparent object renders after that
pass regardless of render order. The glow painted straight over the planet.

What works: the plane sits at local z `-0.06`, just behind the limb ring, with
depth testing **on** and depth writing off. Every fragment inside the silhouette
fails the depth test against the sphere, so only the halo outside it survives.
Alpha is two summed `smoothstep` falloffs, a tight bright band on the limb and a
wide soft haze. It reaches zero before the plane runs out, so there is no
edge anywhere. The plane lives inside the crop group so it scales with the
planet. The camera never moves, so it needs no billboarding.

The band is deliberately tight and very bright with a wider soft bloom behind
it, because in the reference the rim is a thin hard line of light rather than a
broad haze.

There is a second half to it. The halo plane can only draw *outside* the
silhouette. In the reference the glow clearly continues onto the planet for
a few percent of the radius. Without that the bright rim stops dead at the edge
and the planet looks like a sticker. So the Earth's own shader adds a fresnel
scattering term in the same colour:

```glsl
float fres = 1.0 - clamp(dot(n, viewDir), 0.0, 1.0);
color += uAtmo * pow(fres, 3.6) * (0.34 + 0.95 * smoothstep(-0.4, 0.45, sunDot));
```

One colour, `0x5bffa6`, feeds both, so the band on the planet and the band
outside it are continuous.

### The green grade

Three layers carry it, all in shaders, never as a CSS filter over the canvas,
which would repaint the whole viewport on every frame.

| Layer | Treatment |
|---|---|
| Star field | `pow(c, 1.18)` to crush the empty sky toward black, then tinted `(0.74, 1.00, 0.92)` at 85% |
| Earth surface | multiplied by `(0.50, 1.14, 0.82)` |
| Atmosphere | `0x5bffa6`, on the halo and on the surface scattering |

The surface is also kept dark on purpose, `day * (0.05 + 0.62 * sunDot)`. In the
reference the planet sits well below mid grey and the rim carries all of the
brightness. Lighting it normally and then tinting produced something much
flatter.

This is the second sanctioned exception to the grayscale rule. It is not
really an exception: the interface is still grayscale, the world imagery is not.
See [03-design-system.md](03-design-system.md).

Plain three.js, no react-three-fiber. r3f would add roughly 30 kB and a
reconciler to a scene with one sphere, one shell, one glow and four tubes.
Nothing in it needs React.

### Motion

- Auto spin at 0.028 rad/s, about one turn every three and a half minutes.
- Clouds do not drift. The shell is parented to the same group as the surface,
  so it inherits the spin exactly and behaves as a baked in layer would.
- Drag to spin, with inertia on release. Auto spin fades back in 3.5 seconds
  after the pointer is let go.
- Entrance is the one you asked for. The stage translates up 8% and fades in
  over 1100ms, as a CSS transform on the wrapper rather than a material tween,
  so it is composited.
- The arcs draw outward from Narayanganj over 1.5 seconds, staggered, using
  `setDrawRange` on the tube index buffer.

### Camera framing

`CAM_Z` and `CAM_FOV` are paired so the sphere fills **77%** of the frame
height. The flat SVG is generated at a matching 77%, down from 98%, because any
mismatch shows as a jump in scale when one crossfades into the other.

The first attempt filled 92%, which looked better on its own but left the
atmosphere nowhere to go: the halo was still at a quarter opacity when it
reached the edge of the canvas and got sliced off. The frame now reaches 1.38
world units at the sphere's depth and the glow finishes at 1.34, so it fades out
inside the frame rather than being cut by it.

### Position on screen

The globe used to sit at `right: -14%` with a box 92vh wide, which pushed a
third of it past the edge of the viewport. It is now fully on screen:

```
lg:right-[3%] lg:top-1/2 lg:w-[min(75vh,780px)]
```

The box is deliberately larger than the globe, since the sphere fills 77% of it
and the rest is where the atmosphere fades. At 1920 wide the visible globe runs
from roughly x1172 to x1773. The headline column is capped at `max-w-xl` until
the extra large breakpoint so the two never collide.

### Orientation

Longitude and latitude to a point on the sphere is written once, in the
orientation that matches three's default `SphereGeometry` UV layout. Getting it
wrong puts Bangladesh in the Pacific. It was checked numerically before the
scene was trusted:

```
globe fills 77% of frame height
frame reaches 1.38 world units; glow ends at 1.34 -> fades before the edge

Narayanganj   x   0.50 y   0.05 in frame   day
Poland        x  -0.32 y   0.47 in frame   terminator
France        x  -0.47 y   0.46 in frame   terminator
UK            x  -0.45 y   0.49 in frame   terminator
Netherlands   x  -0.42 y   0.49 in frame   terminator
```

The tilt group carries `rotation.x` for latitude and the world group inside it
carries `rotation.y` for the spin, so the Earth turns about its own tilted axis
rather than about the screen vertical.

### Cost, and how it stays contained


| | |
|---|---|
| three.js chunk, gzipped | 81.1 kB |
| `lights.webp`, 4096 by 2048 | 161 kB |
| `land.webp`, 3072 by 1536 greyscale | 180 kB |
| `stars.webp`, 4096 by 2048 | 145 kB |
| Typical desktop download | 486 kB |

### Lights first, not albedo

The photographic route was abandoned. Three rounds of chasing a real Blue Marble
surface produced something that was both heavy and unconvincing, because a
2 km per pixel albedo map magnified onto a cropped sphere and then darkened and
tinted is neither sharp nor realistic.

The reference that broke the deadlock renders **only the night lights**. No
albedo at all. Once that is the rule, everything gets smaller and better at the
same time:

| | |
|---|---|
| Albedo map, 6144 | **deleted**, was 571 kB |
| Cloud map | **deleted**, was 518 kB |
| City lights, 4096 | 161 kB |
| Land silhouette, 3072 greyscale | 180 kB |

The planet's colour is generated in the shader from three constants. The land
texture is a single greyscale channel that only says where land is and roughly
how bright, which is why it costs 180 kB instead of 571. Ocean is crushed to
black in it, because on a lights first render the ocean is a shaded gradient
with nothing to lose.

### The green blob was not a lighting bug

Worth recording first, because it cost a review cycle and looked exactly like an
art direction problem.

The glint used a variable called `half`. **`half` is a reserved keyword in GLSL
ES.** The fragment shader failed to compile, the Earth mesh silently stopped
drawing, leaving only the atmosphere plane on screen. That
plane's alpha varies with the angle around its centre, which is why it rendered
as a flat disc with a conical gradient.

Two things now guard against a repeat. `renderer.debug.onShaderError` logs the
compile log loudly rather than letting the mesh vanish quietly, plus the shader
sources are scanned for reserved words used as identifiers.

The diagnosis was confirmed before touching anything: the textures were sampled
directly and came back correct, Sahara 140, mid Pacific 0, Bangladesh 66, land
coverage 33.9%. Ruling the data out is what pointed at the shader.

### Two more things that made it a blob

Worth recording, because both are specific to a globe this heavily cropped and
neither is obvious.

**The fresnel exponent.** A cropped globe shows almost nothing except the region
near the limb, so `1 - dot(n, viewDir)` is large across the *entire* visible cap
rather than only at its edge. Measured at the top of the cap:

```
pow(fres, 3.2) = 0.18      floods the whole planet with atmosphere
pow(fres, 9.0) = 0.006     confined to the edge, which is what is wanted
```

At 3.2 the glow was an order of magnitude brighter than the lit surface, so the
planet rendered as a featureless wash of colour. It is now split into a tight
bright rim at exponent 9, which only exists within a few percent of the
silhouette, plus a broad haze at low enough amplitude to tint rather than drown.

**The sun angle.** Fully behind the planet put the entire visible cap between
-0.10 and -0.54, so nothing was lit at all. It is now grazing rather than
backlit, solved by sampling the cap instead of guessing:

```
sun (0.30, 0.72, -0.30)    top-right 0.49   centre 0.20   bottom -0.04
```

That is a clean gradient from lit at the top right down to night at the bottom,
which is the reference exactly: bright limb up top, terminator low, city lights
in the dark lower third. Two nearby candidates were wrong in opposite
directions, one leaving nothing lit, the other leaving no dark side for the
lights to show against.

Diffuse gain is 7, which looks extreme until you notice peak `sunDot` across the
cap is only 0.49. A gain near 1 leaves the planet black.

The halo is weighted toward the sun side rather than drawn as an even ring,
because an even ring is the giveaway that it is a shader. A specular term adds
the glint where the sun clears the limb, masked to water so it never lights up a
continent.

### Market labels

The four export markets sit within a few pixels of each other on the globe, so a
single fixed label offset stacks all four in the same place. Each visible marker
gets a rung on a ladder instead, ordered by screen height and reassigned every
frame so the ladder never leaves gaps as markers rotate out of view. The leader
line does the work of saying which label belongs to which marker.

### Palette

Brand green. The reference is blue and was used for its lighting and
composition only.

```
OCEAN  vec3(0.045, 0.150, 0.110)   brighter, more saturated
LAND   vec3(0.050, 0.092, 0.068)   darker, greyer
ATMO   0x4fe6a8
GLINT  vec3(0.780, 1.000, 0.880)
```

Ocean is the brighter of the two, which is the right way round: water scatters
more than land at a grazing sun angle.

### How the textures got small

Three passes, in order of what they were worth. None of them cost visible
quality, because each removes work that was being thrown away later anyway.

**Ocean flattening, 980 kB to 705 kB.** 68% of an equirectangular Earth map is
ocean. This scene darkens and green tints it until almost none of its detail
survives on screen. WebP does not know that, so it was spending a large share of
the file on bathymetry gradients and JPEG noise from the source that nobody
would ever see. The encoder now gets a heavily blurred ocean and untouched land.

The mask comes from blue dominance, which is reliable on Blue Marble: ocean is
strongly blue, ice and cloud are neutral, land is not. It is then blurred and
re-thresholded so it retreats from the coastline, because shallow coastal water
is blue enough to be caught and blurring it would soften every shore. That pulls
the flattened area from 68% down to 52%, which is the cost of keeping coastlines
crisp and worth paying.

**Baking the green grade, 705 kB to 620 kB.** It was a fixed per channel
multiply running on every fragment of every frame. Moving it into the asset
changes nothing visually, removes the shader work, then lowers the dynamic range
of the red and blue channels, which WebP rewards. The night map gets the same
multiply so the two stay in step across the terminator.

The cost: changing the grade now means regenerating the texture rather than
editing a uniform. The grade is settled, so that is the right way round.

**Cloud quality 60 to 48, 521 kB to 518 kB at 2560.** This is an alpha channel
for a soft, semi transparent layer, not something the eye reads directly, plus it
is modulated by opacity and lighting before it reaches the screen.

### Formats that were measured and not used

**AVIF.** 707 kB against WebP's 705 at matched quality on the day map, so it
buys nothing here while adding a support probe and a slower decode. It was worth
about 18% on the cloud map alone, which is not enough to justify shipping two
formats.

**KTX2 with Basis Universal.** The right answer when video memory is the
constraint: it stays compressed into VRAM and typically cuts texture memory four
to eight times. It is the wrong answer when download size is the constraint,
which is the case here, since ETC1S files are comparable to JPEG rather than to
WebP and UASTC is larger still. Worth revisiting only if VRAM becomes the
problem on low end hardware.
| Added to first load JS | nothing. Home is 112 kB, as it was before any of this. |

### Why the surface is 6144

Cropping the globe magnifies the texture with it. At 4096 the surface works out
at about **0.71 texels per device pixel** at the entry crop, undersampled by
roughly half, which is exactly what pixellation looks like.

8192 was tried and measured 1.42, but it cost 1670 kB against 966. Since the
entry crop is now the first moment of a scroll sequence rather than a permanent
state, that headroom is never used for long. 6144 gives **1.07**, the right side
of one, saving 700 kB.

There are still two day maps because a good number of GPUs report a maximum
texture size of 4096 and would fail to upload 6144 at all. The scene asks
`renderer.capabilities.maxTextureSize` which to fetch. Only one is downloaded.

Anisotropic filtering is set to 16 on the surface and the clouds, because the
visible cap is seen at a glancing angle almost everywhere, which is precisely
where it earns its keep.

Everything else is deliberately smaller. City lights are diffuse blobs, so 2048
is plenty and costs 46 kB. Clouds sit at 3072 as a compromise: 4096 cost 1.4 MB
on its own, because greyscale cloud detail is high frequency noise that WebP
compresses badly. The star field is 4096 and still only 145 kB, because most of
it is black.

### Why clouds are not baked into the surface

NASA publishes no cloud composited map worth using. The `land_ocean_ice_cloud`
records only exist at 2048 and the Black Marble has no cloud variant at all, so
the only way to get one is to composite it here from the two full resolution
sources. That was built and measured. It is the wrong trade:

```
baked, one 8192 texture    q44 3579 kB   q52 3983 kB   q66 4853 kB
separate                   day 8192 q68 1709 kB + clouds 3072 q64 856 kB
```

Cloud detail is high frequency everywhere, including over ocean that otherwise
compresses to almost nothing, so the combined image resists WebP at every
setting. Separate is a megabyte smaller at a quality the baked version cannot
reach at all, plus it keeps the shell's parallax at the limb.

The behaviour people actually want from a baked texture, clouds locked to the
surface, comes free: the shell is parented to the same group as the Earth, so it
inherits the rotation and has no motion of its own.

The four source images are 70 MB together, so `scripts/fetch-textures.mjs`
caches them under `.texture-cache/`. Re-encoding at a different quality does not
mean downloading them again.

Source resolutions went up to match: the day map now comes from NASA's 21600 by
10800 Blue Marble rather than the 5400 version, and the night map from the 13500
wide Black Marble.

Everything above is behind a dynamic import that only fires after
`requestIdleCallback`, then only when the device passes the gate.

The gate is narrower than it was, because deleting the SVG removed the safety
net. It no longer excludes phones, since there is nothing else for them to fall
back to, and it no longer excludes reduced motion: that renders the Earth and
then holds it still rather than skipping it. What still fails is data saver, a
`slow-2g`/`2g`/`3g` connection, two cores or no WebGL, and those see the plain
dark hero with no globe at all.

The renderer caps device pixel ratio at 1.5 and stops its animation loop through
an IntersectionObserver when the hero leaves the viewport.

Marker positions are projected to screen every frame and written straight to
`style.transform` on five DOM nodes. They never pass through React state, which
would mean a reconcile per frame. Only which marker is active is state. That
changes on hover.

### Textures

All three come from published NASA sets, which are public domain, rather than
being derived by hand. `scripts/fetch-textures.mjs` tries a list of sources per
texture and prints which one answered, because the licence differs between them.

| File | Source | Native |
|---|---|---|
| `earth-day.webp` | NASA Visible Earth, Blue Marble Next Generation | 5400 by 2700 |
| `earth-night.webp` | NASA Black Marble 2016 | 3600 by 1800 |
| `clouds.webp` | NASA Blue Marble cloud composite | 8192 by 4096 |

The cloud layer is stored as a single greyscale image used as an `alphaMap`, not
as RGBA. The shell is pure white so only coverage matters. That is a quarter
of the bytes of a four channel texture with none of the blockiness a compressed
alpha channel produces. The earlier version was a 1024 wide source with alpha
baked in, which is exactly why it looked like a blocky mess.

`solarsystemscope.com` is listed first for each texture and is the set most
projects use, but it rejects programmatic fetches, so every file here came from
NASA. That is the better outcome anyway: public domain needs no attribution,
where the solarsystemscope set is CC BY 4.0.

The script does not run on build. Outputs are committed, because a homepage
should never depend on a third party host being reachable at deploy time.

### What was considered and not used

**`mapcn` arcs**, built on MapLibre GL. Real globe projection and arcs out of
the box, but the imagery comes from map tiles, so it needs a tile provider
account and an API key, it fetches tiles on every load, it has no cloud
layer. Roughly 220 kB before any tiles. It also makes the hero behave like a map
application rather than a brand image.

**`cobe`**, the 5 kB WebGL dot globe. It draws markers on a rotating sphere but
cannot fill a country shape. A fixed SVG overlay cannot stay aligned with
it. Superseded entirely by going 3D.

**Runtime `d3-geo` reprojection** for drag to spin on the flat globe. Roughly
70 kB gzipped once the topology is included. It also puts the projection on the
main thread on every pointer move. Also superseded.

## Header behaviour

- Transparent while the page is at the top, so nothing sits on the hero.
- Solid dark at scroll position 24px and beyond.
- No `backdrop-filter`. A fixed blurred element repaints on every scroll frame,
  which is exactly the cost the performance contract exists to avoid.
- State comes from one passive scroll listener guarded by
  `requestAnimationFrame`, toggling a single boolean.
- Below 1024px the nav collapses to a Menu button that opens the full screen
  overlay, which is the one place the strong tier is allowed.

## Responsive

| Viewport | Behaviour |
|---|---|
| 1024px and up | Full nav in the header. Headline at `text-7xl`, `text-[5.25rem]` from 1280px. Quick links four across. |
| 640 to 1023px | Header collapses to Menu. Headline `text-6xl`. Quick links two across. Scroll cue appears. |
| Below 640px | Headline `text-[2.75rem]`. Quick links stack. Enquiry moves into the menu. |

`min-h-[100svh]` rather than `100vh`, so mobile browser chrome does not push the
quick link bar off screen.

## Definition of done

- Earth renders in Chrome, Safari, Firefox, iOS Safari and Android Chrome
- All five markers on screen and front facing at aspect ratios from 1.78 to 1.3
- Arcs draw once and stop
- Reduced motion renders the Earth, settles, then holds still with the loop off
- Devices failing the gate get the plain dark hero with no broken canvas
- Every hotspot reachable by keyboard, each with a described label
- Exactly two `backdrop-filter` surfaces on the page
- Zero `border-*` utility classes
- Every text layer passes WCAG AA against the brightest sampled video frame
- Reduced motion keeps the video off and disables all transforms and icon motion
- Full keyboard tab order with a visible focus ring
- Largest contentful paint under 2.5 seconds on throttled 4G
- Renders correctly with JavaScript disabled
- No emoji, no decorative numbering, no accent shapes
