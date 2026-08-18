/**
 * Every tunable of the globe: palette, framing, camera path, speeds. Client
 * facing tweaks happen here; the scene consumes these and adds behaviour.
 * npm run solve re-derives the framing constants from content/globe.ts.
 */

import { Color, MathUtils, Vector3 } from 'three'

export const EARTH_R = 1
export const MARKER_R = 1.004

export const CAM_Z = 3.6
export const CAM_FOV = 42
/** Half the frame height in world units at the sphere's depth. */
export const FRAME_H = CAM_Z * Math.tan(MathUtils.degToRad(CAM_FOV / 2))

/*
  The crop, measured off the reference frame rather than guessed.

  A circle was fitted to three points on the limb in a 2000x1299 still. It came
  out at centre (1607, 1439) px, radius 1186 px, which in screen space is a
  sphere of radius 1.826 centred at (0.607, -1.216), in units where the frame
  half height is 1. The limb apex lands at 0.61, leaving the top 39% of the
  frame as sky.

  Held in normalised units rather than world units so the composition survives
  any aspect ratio: the sphere keeps the same position relative to the frame
  instead of drifting as the window widens.
*/
const REFERENCE = { r: 1.826, x: 0.607, y: -1.216 }

/*
  Pulled back a little from the reference. Scaling the radius and the centre by
  the same factor is a pure zoom about the screen centre, so the composition is
  unchanged and only the framing loosens: the limb drops and more sky opens up
  above it. Narayanganj stays where it was, near the middle.
*/
const ZOOM = 0.86
export const CROP_ENTRY = {
  r: REFERENCE.r * ZOOM,
  x: REFERENCE.x * ZOOM,
  /*
    Solved rather than scaled, and re-solved each time the vantage moves. The
    globe has been rolled down twice now to stop it being viewed from below, and
    rolling it moves Bangladesh up the frame, so the crop drops to put it back
    on the screen centre.

      lat -26  cropY -1.046   24% sky   centred
      lat -20  cropY -0.967   20%       centred
      lat -12  cropY -0.844   14%       centred
      lat -10  cropY -0.952   19%       right and below   <- here

    Moving Bangladesh off the dead centre handed back framing rather than
    costing it. The tour path does not appear in this table, because the
    planet's orientation does not depend on it. See TOUR_AXIS.
  */
  y: -0.952,
}

/*
  Portrait. The wide crop put the planet under the copy, which on a phone means
  the copy sits on the planet. Solved instead for a bottom anchored globe: apex
  at ndc -0.14, so the top 57% of the screen belongs to the text, and
  Narayanganj centred at (0, -0.62) on a phone aspect, drifting to x 0.33 on a
  portrait tablet, still comfortably framed.
*/
export const CROP_ENTRY_NARROW = { r: 0.75, x: 0.698, y: -0.892 }

/*
  Where the scroll takes it. A whole ball, right of centre, with the left of the
  frame free for the callouts. The radius is in frame half heights, so 0.6 is a
  sphere filling 60% of the frame height.

  Peak texture magnification happens at the entry crop and falls away to here,
  which is why the day map only needs 6144.
*/
export const CROP_FULL = { r: 0.6, x: 0.3, y: 0.02 }
/* Ball in the bottom half, centred, with the caption in the top half. */
export const CROP_FULL_NARROW = { r: 0.42, x: 0, y: -0.45 }

/*
  THE TOUR PATH. The planet never leaves its ordinary orientation: it spins
  about its own poles and north stays up, always. What follows the customers is
  the CAMERA VANTAGE. As the spin carries each longitude past the camera, the
  viewing latitude rides a circle fitted to the customers, so the view drifts up
  toward Europe as Europe comes round and back down for Bangladesh and the US.

  Two earlier attempts rotated the globe itself about a tilted axis. Both were
  rejected on sight, and rightly: any rotation about an axis that is not the
  planet's own poles reorients the continents. There is no algebra that avoids
  that, so the globe's rotation is left alone and the vantage does the work.

  The path. A globe spun about its poles sweeps the camera along one line of
  latitude, and the customers are not on one: Bangladesh is at 24 north, Europe
  at 49 to 52, the US at 38. But they do sit on one small circle. Searching the
  sphere for the pole that minimises the spread of dot products against all six
  gives longitude 167, latitude 67.5, where their spread collapses from 28.7
  degrees of co-latitude to 5.5. pathLat() below returns that circle's latitude
  at whatever longitude currently faces the camera, solved in closed form from

    sin(lat) cos(poleColat) + cos(lat) sin(poleColat) cos(dLon) = cos(radius)

  Checked against every customer: the path passes within 3 degrees of each.

    Narayanganj   actual 23.6   path 26.7
    Poland               52.2        49.5
    France               48.9        51.7
    United Kingdom       51.5        51.9
    Netherlands          52.4        51.5
    United States        38.5        35.5

  Measured effect, full ball: each market crosses within ndc 0.04 of the ball's
  centre as its longitude comes round. Entry crop: each passes through the same
  region Bangladesh occupies at load, misses of 0.00 to 0.45 against the spot
  (0.24, -0.20). The vantage swing is 7 to 52 degrees over a turn, with a
  steepest slope of about 1 degree of tilt per second at tour speed, slow
  enough to read as drift rather than as a camera move.
*/
const TOUR_AXIS = { lon: 166.7, lat: 67.5 }
/** Mean angular radius of the customer circle about that pole. */
const TOUR_RADIUS = 60.2

const POLE_COLAT = MathUtils.degToRad(90 - TOUR_AXIS.lat)
const POLE_THETA = MathUtils.degToRad(TOUR_AXIS.lon + 180)
const PATH_COS = Math.cos(MathUtils.degToRad(TOUR_RADIUS))

/** Latitude of the customer circle at the longitude facing the camera, given
    the spin. Cheap enough to call every frame: four trig calls. */
export function pathLat(spin: number): number {
  const dTheta = Math.PI / 2 - spin - POLE_THETA
  const q = Math.sin(POLE_COLAT) * Math.cos(dTheta)
  const r = Math.hypot(Math.cos(POLE_COLAT), q)
  const u = Math.atan2(q, Math.cos(POLE_COLAT)) + Math.acos(MathUtils.clamp(PATH_COS / r, -1, 1))
  return 90 - MathUtils.radToDeg(u)
}

/*
  The entry framing. lat is the vantage at load, spin is where the tour starts.
  Solved to land Narayanganj at ndc (0.24, -0.20), right of centre and below it,
  which is where the reference frame has it.
*/
export const ENTRY = { lat: -10, spin: 151 }

/*
  In the cinematic entry the vantage sits this far below the path, so the
  visible cap shows the path's neighbourhood rather than centring it. The scroll
  settle blends this offset away: in the full ball view the vantage rides the
  path exactly, which is what centres each market as it passes.
*/
export const ENTRY_DROP = ENTRY.lat - pathLat(MathUtils.degToRad(ENTRY.spin))

/*
  THE TWO RESTING SPOTS. The globe has exactly two defined states and always
  finds its way back to one of them, so it can never be left stranded wherever
  a drag or a half scroll happened to put it.

    Hero, progress low      ENTRY.spin, Bangladesh framed as solved above. The
                            tour drifts on from here, and any drag returns here
                            after the idle delay before the tour resumes.
    Section, progress high  SHOWCASE.spin, held still. No tour drift, because
                            this state sits under real page content and random
                            movement there reads as broken, not alive.

  SHOWCASE is the mid Atlantic: sub camera longitude -45, vantage 50 north off
  the path. Measured at the full ball crop, the United States sits at ndc
  (0.12, 0.04) left of the ball's centre and the European cluster at about
  (0.57, 0.13 to 0.26) right of it, all five customer markets visible in one
  frame. Bangladesh is on the far side in this state, which is correct: this
  section is about where the goods go.

  THE TRANSITION IS THE SCROLL. The rendered angle is a blend between the hero
  angle and the showcase angle, weighted by the same settle value that drives
  the crop and the vantage, so scrolling scrubs the turn directly: half way
  down the page is half way through the turn, and scrolling back up plays it
  backwards. Nothing waits for the scroll to finish. A first version eased
  toward the showcase over time after a zone boundary was crossed, and it felt
  exactly like waiting.

  While any blend is in effect the hidden hero end of the blend quietly seeks
  back to ENTRY.spin, invisibly, because the showcase end dominates the render.
  That is what makes scrolling up land on the default instead of on wherever
  the tour had wandered. The only time based motion left is settling home after
  a drag, which has no scroll position to be driven by.
*/
export const SHOWCASE = { spin: 315 }
/** Seek speed cap, radians per second, for the after-drag settle. */
export const SEEK_MAX = 1.4
/** Exponential approach constant: the remaining error decays to this fraction
    per second, giving a short settle tail. */
export const SEEK_RATE = 0.002

export function shortestAngle(a: number): number {
  return MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI
}

/*
  One correction on top of the path, for the US leg.

  The entry crop's sweet spot, where the markers parade through, sits about 28
  degrees of spin ahead of the sub-camera point. While the US crosses that spot
  the sub-camera point is still over the Atlantic, where the path is near its
  peak, so the vantage rode high and pressed the US down to ndc y -0.8, hugging
  the bottom of the frame. Bangladesh and Europe never feel this because the
  path is much flatter around their longitudes.

  Sampling the path ahead of the spin fixes the US but shifts Europe, which is
  already right. So the fix is local instead: a cosine windowed dip in the
  vantage, grid searched over centre, width and depth with Bangladesh and
  Europe pinned as constraints. At centre 325, width 65, depth 14 the US now
  passes straight through the sweet spot, miss 0.45 down to 0.00, while every
  other market's pass is unchanged to two decimals and the steepest vantage
  slope stays at 0.42 degrees per degree of spin.

  Entry crop only, like ENTRY_DROP: the full ball centres each market by
  construction, so both fade out with the settle.
*/
const DIP = { centre: 325, width: 65, depth: 14 }

export function vantageDip(spin: number): number {
  let d = MathUtils.euclideanModulo(MathUtils.radToDeg(spin), 360) - DIP.centre
  if (d > 180) d -= 360
  if (d < -180) d += 360
  if (Math.abs(d) >= DIP.width) return 0
  return -DIP.depth * 0.5 * (1 + Math.cos((Math.PI * d) / DIP.width))
}

/*
  Grazing, not behind.

  Solved numerically against the crop rather than guessed. Sampling the visible
  cap gives a clean gradient from lit at the top right down to night at the
  bottom, which is the reference exactly: bright limb up top, terminator low,
  city lights in the dark lower third.

    sun (0.30,0.72,-0.30)   top-right 0.49   centre 0.20   bottom -0.04

  Two nearby options were wrong in opposite directions. Fully behind
  (0.30,0.45,-0.84) put the entire cap in night at -0.10 to -0.54, so nothing
  was lit at all. Higher up (0.22,0.86,-0.10) lit everything from 0.24 to 0.72
  and left no dark side for the lights to show against.
*/
export const SUN = new Vector3(0.3, 0.72, -0.3).normalize()

/*
  The palette. There is no albedo texture, so these colours are the planet.

  The realistic blue earth, after the brand pivot away from the green planet:
  the brand colour is now the gold of the city lights, and the planet itself
  returns to the reference's blue. Luminance structure carries over from the
  green palette unchanged, only the hue moves: ocean brighter and more
  saturated than land, which is the right way round at a grazing sun angle.
*/
export const OCEAN = new Vector3(0.02, 0.1, 0.26)
/* Same blue family as the ocean, darker and more muted, never grey: the
   first blue pass used a blue to green ratio of 1.5 against the ocean's 2.6
   and the continents read as slate. */
export const LAND = new Vector3(0.03, 0.056, 0.125)
/** Specular off water where the sun clears the limb. Cool white. */
export const GLINT = new Vector3(0.72, 0.86, 1.0)
/** City lights. Warm sodium gold, which is now also the brand accent, so the
    planet wears the brand at night. The channel ratios matter more than the
    values: gains above roughly 1.6 clip all three channels and turn the
    cores white. */
export const CITY = new Vector3(1.0, 0.8, 0.5)

/** Atmosphere. One colour for the surface scattering and the halo, so the band
    that sits on the planet and the band that sits outside it are continuous. */
export const ATMO = new Color(0x5fb0ff)

/** Radians per second. A full customer tour takes about two and a half minutes. */
export const TOUR_SPIN = 0.042
export const RESUME_AFTER = 3.5

/*
  The cloud layer, the audit's one taste call. A single greyscale tap at low
  opacity in the same shader: no second sphere, no sorting. Clouds catch the
  sun on the day side, ghost faintly at night and drift slowly against the
  surface while the hero loop is already rendering. Flip this flag to render
  a bare planet again; the texture simply is not fetched.
*/
export const CLOUDS = true

export function toVector(lon: number, lat: number, radius: number): Vector3 {
  const phi = MathUtils.degToRad(90 - lat)
  const theta = MathUtils.degToRad(lon + 180)
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

