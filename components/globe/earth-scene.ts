/**
 * The 3D Earth. Plain three.js, no react-three-fiber.
 *
 * Only ever reached through a dynamic import behind a capability gate, so none
 * of it is in the initial bundle.
 *
 * Runs on the main thread or inside a worker against an OffscreenCanvas, and
 * therefore touches no DOM API at all: no window, no document, no event
 * listeners. Pointer input arrives through the public pointerDown, pointerMove
 * and pointerUp methods, the device pixel ratio through options, and textures
 * through fetch, which exists in both worlds.
 */

import { ease } from '@/lib/scroll-progress'
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  DataTexture,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RedFormat,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'

export type ScenePlace = { id: string; lon: number; lat: number }

export type MarkerFrame = { id: string; x: number; y: number; visible: boolean }

export type EarthOptions = {
  canvas: HTMLCanvasElement | OffscreenCanvas
  places: ScenePlace[]
  originId: string
  /** False under prefers-reduced-motion. Renders, settles, then holds still. */
  motion: boolean
  /** window.devicePixelRatio, passed in because a worker has no window. */
  dpr: number
  /** Hero scroll progress, 0 to 1. Read once per frame, never through React. */
  getProgress: () => number
  onMarkers: (frames: MarkerFrame[]) => void
  onReady: () => void
  /** Asset loading progress, 0 to 1, for the loading screen. */
  onLoad?: (progress: number) => void
}

const EARTH_R = 1
const MARKER_R = 1.004

const CAM_Z = 3.6
const CAM_FOV = 42
/** Half the frame height in world units at the sphere's depth. */
const FRAME_H = CAM_Z * Math.tan(MathUtils.degToRad(CAM_FOV / 2))

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
const CROP_ENTRY = {
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
const CROP_ENTRY_NARROW = { r: 0.75, x: 0.698, y: -0.892 }

/*
  Where the scroll takes it. A whole ball, right of centre, with the left of the
  frame free for the callouts. The radius is in frame half heights, so 0.6 is a
  sphere filling 60% of the frame height.

  Peak texture magnification happens at the entry crop and falls away to here,
  which is why the day map only needs 6144.
*/
const CROP_FULL = { r: 0.6, x: 0.3, y: 0.02 }
/* Ball in the bottom half, centred, with the caption in the top half. */
const CROP_FULL_NARROW = { r: 0.42, x: 0, y: -0.45 }

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
function pathLat(spin: number): number {
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
const ENTRY = { lat: -10, spin: 151 }

/*
  In the cinematic entry the vantage sits this far below the path, so the
  visible cap shows the path's neighbourhood rather than centring it. The scroll
  settle blends this offset away: in the full ball view the vantage rides the
  path exactly, which is what centres each market as it passes.
*/
const ENTRY_DROP = ENTRY.lat - pathLat(MathUtils.degToRad(ENTRY.spin))

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
const SHOWCASE = { spin: 315 }
/** Seek speed cap, radians per second, for the after-drag settle. */
const SEEK_MAX = 1.4
/** Exponential approach constant: the remaining error decays to this fraction
    per second, giving a short settle tail. */
const SEEK_RATE = 0.002

function shortestAngle(a: number): number {
  return MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI
}

/*
  The water noise, precomputed.

  This used to be two octaves of procedural value noise in the fragment shader:
  eight sin() calls and a dozen mixes per fragment, across every fragment of a
  planet that fills most of the frame. As a 256 square tiling texture it is two
  cached reads. Same character, deterministic seed so every visitor sees the
  same water, mipmapped so the ball view does not shimmer.
*/
function makeNoiseTexture(): DataTexture {
  const GRID = 32
  const SIZE = 256
  let seed = 987654321
  const rand = () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const grid = new Float32Array(GRID * GRID)
  for (let i = 0; i < grid.length; i++) grid[i] = rand()

  const smooth = (t: number) => t * t * (3 - 2 * t)
  const data = new Uint8Array(SIZE * SIZE)
  for (let y = 0; y < SIZE; y++) {
    const gy = (y / SIZE) * GRID
    const y0 = Math.floor(gy)
    const fy = smooth(gy - y0)
    for (let x = 0; x < SIZE; x++) {
      const gx = (x / SIZE) * GRID
      const x0 = Math.floor(gx)
      const fx = smooth(gx - x0)
      const a = grid[(y0 % GRID) * GRID + (x0 % GRID)]
      const b = grid[(y0 % GRID) * GRID + ((x0 + 1) % GRID)]
      const c = grid[((y0 + 1) % GRID) * GRID + (x0 % GRID)]
      const d = grid[((y0 + 1) % GRID) * GRID + ((x0 + 1) % GRID)]
      const top = a + (b - a) * fx
      data[y * SIZE + x] = Math.round((top + (c + (d - c) * fx - top) * fy) * 255)
    }
  }

  const tex = new DataTexture(data, SIZE, SIZE, RedFormat)
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.magFilter = LinearFilter
  tex.minFilter = LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

/*
  Texture loading, rebuilt around two facts.

  First, this may run in a worker, where TextureLoader's Image element does not
  exist. fetch and createImageBitmap exist everywhere this code can run.

  Second, every one of these maps is a single signal: the land mask is packed
  into one channel by design, the borders are greyscale, and the shader only
  ever reads the lights' luminance. Uploading them as RGBA spent four bytes a
  texel on one byte of information. Extracted to single channel R8, the three
  maps drop from about 140 MB of GPU memory with mipmaps to about 35 MB, and
  every sample moves a quarter of the bytes. That is most of what a compressed
  texture pipeline would have bought, with no transcoder wasm, no build tool
  and zero quality change, since the bytes are identical to the source channel.

  Streaming progress feeds the loading screen through onLoad.
*/
async function fetchBitmap(url: string, report: (fraction: number) => void): Promise<ImageBitmap> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  const total = Number(res.headers.get('Content-Length')) || 0
  let blob: Blob
  if (res.body && total > 0) {
    const reader = res.body.getReader()
    const chunks: BlobPart[] = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.byteLength
      report(Math.min(1, received / total))
    }
    blob = new Blob(chunks)
  } else {
    blob = await res.blob()
  }
  report(1)
  return createImageBitmap(blob)
}

/** Draw the bitmap once, keep one channel, flip to GL row order. */
function extractChannel(bitmap: ImageBitmap, mode: 'r' | 'max'): DataTexture {
  const { width, height } = bitmap
  const cnv =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement('canvas'), { width, height })
  const ctx = cnv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  ctx.drawImage(bitmap, 0, 0)
  const src = ctx.getImageData(0, 0, width, height).data
  bitmap.close()

  const out = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    const from = y * width
    const to = (height - 1 - y) * width
    for (let x = 0; x < width; x++) {
      const i = (from + x) * 4
      out[to + x] = mode === 'r' ? src[i] : Math.max(src[i], src[i + 1], src[i + 2])
    }
  }

  const tex = new DataTexture(out, width, height, RedFormat)
  tex.magFilter = LinearFilter
  tex.minFilter = LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
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

function vantageDip(spin: number): number {
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
const SUN = new Vector3(0.3, 0.72, -0.3).normalize()

/*
  The palette. There is no albedo texture, so these colours are the planet.

  The realistic blue earth, after the brand pivot away from the green planet:
  the brand colour is now the gold of the city lights, and the planet itself
  returns to the reference's blue. Luminance structure carries over from the
  green palette unchanged, only the hue moves: ocean brighter and more
  saturated than land, which is the right way round at a grazing sun angle.
*/
const OCEAN = new Vector3(0.02, 0.1, 0.26)
/* Same blue family as the ocean, darker and more muted, never grey: the
   first blue pass used a blue to green ratio of 1.5 against the ocean's 2.6
   and the continents read as slate. */
const LAND = new Vector3(0.03, 0.056, 0.125)
/** Specular off water where the sun clears the limb. Cool white. */
const GLINT = new Vector3(0.72, 0.86, 1.0)
/** City lights. Warm sodium gold, which is now also the brand accent, so the
    planet wears the brand at night. The channel ratios matter more than the
    values: gains above roughly 1.6 clip all three channels and turn the
    cores white. */
const CITY = new Vector3(1.0, 0.8, 0.5)

/** Atmosphere. One colour for the surface scattering and the halo, so the band
    that sits on the planet and the band that sits outside it are continuous. */
const ATMO = new Color(0x5fb0ff)

/** Radians per second. A full customer tour takes about two and a half minutes. */
const TOUR_SPIN = 0.042
const RESUME_AFTER = 3.5

function toVector(lon: number, lat: number, radius: number): Vector3 {
  const phi = MathUtils.degToRad(90 - lat)
  const theta = MathUtils.degToRad(lon + 180)
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

export class EarthScene {
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera: PerspectiveCamera
  private root = new Group()
  private tilt = new Group()
  private world = new Group()
  private arcs: { mesh: Mesh; total: number }[] = []
  private markers: { id: string; position: Vector3 }[] = []

  /** The one rotation angle. Auto rotation, drag and the seeks all write to it. */
  private spin: number
  private velocity = 0
  private idleFor = 0
  private dragging = false
  /** A drag ended; return to the mode's resting spot once the idle delay runs out. */
  private pendingReturn = false
  /** Actively easing back to the hero default before the tour may resume. */
  private returning = false
  /** Drag displacement on top of the blended angle in the showcase state.
      Scaled by the settle when rendering, so scrolling up scrubs it away. */
  private dragOff = 0
  /** Which end of the blend the current drag is moving. */
  private dragInShowcase = false
  private earthMat: ShaderMaterial | null = null

  /*
    Dynamic resolution. Full pixel ratio when the picture is calm, dropped to 1
    while it is moving fast, because motion masks resolution completely and a
    whipped drag at DPR 1.5 is where the frame budget went. Hysteresis on both
    edges so it never oscillates: the drop is immediate, the restore waits for
    half a second of calm, and switches are at least 250 ms apart.
  */
  private dprHigh: number
  private dprLow: number
  private dprCurrent: number
  private calmFor = 1
  private lastRendered = 0
  private lastDprSwitch = 0
  private prevP = 0

  /*
    The closed loop. The motion heuristic above is open loop: it knows what
    is moving, not whether the device is keeping up. This measures achieved
    frame time as an exponential average and steps the calm resolution down,
    2 to 1.5 to 1.25, when a full second sustains over ~19 ms at the high
    tier. Weak GPUs converge to what they can actually hold; strong ones
    never trigger it. Sticky for the session: thrash serves nobody.
  */
  private frameEma = 16
  private slowFor = 0

  /*
    Idle skip. Once the showcase has settled nothing on screen changes, but the
    loop kept re-rendering identical frames at the display rate. Now a frame is
    only rendered when the picture would differ: the loop itself keeps running,
    which costs microseconds, and wakes the GPU the instant anything moves.
  */
  private needsDraw = true
  private lastDrawnSpin = Infinity
  private lastDrawnProgress = -1
  private lastPointerX = 0
  private lastTime = 0
  private arcProgress = 0
  private settled = false
  private aspect = 1
  private lastProgress = -1
  /** 0 at the entry vantage, 1 once tilted up to the tour latitude. */
  private settle = 0

  private opts: EarthOptions
  private disposed = false
  private projected = new Vector3()
  private rel = new Vector3()
  private centreWorld = new Vector3()
  private size = new Vector2(1, 1)
  /** Reused every frame. Allocating six objects and an array per frame is
      pointless GC pressure in a loop that runs at the display rate. */
  private frameBuf: MarkerFrame[] = []

  constructor(opts: EarthOptions) {
    this.opts = opts
    /*
      Native resolution while calm, capped at 2. The dynamic resolution drops
      to 1 during motion and the idle skip renders a calm frame exactly once,
      so full crispness is paid for once per view, not per frame.
    */
    this.dprHigh = Math.min(opts.dpr, 2)
    this.dprLow = Math.min(opts.dpr, 1)
    this.dprCurrent = this.dprHigh

    this.renderer = new WebGLRenderer({
      canvas: opts.canvas,
      alpha: true,
      /*
        MSAA only where the buffer is not already supersampled. On a retina
        display the calm buffer runs at native 2x, and multisampling on top of
        that pays twice for one smoothness: the scene's only hard geometric
        edge is the limb, and the halo ring sits directly on it. At 1x there
        is no supersampling to lean on, so MSAA stays.
      */
      antialias: opts.dpr < 2,
      /* Nothing here uses the stencil buffer; not allocating it saves memory
         bandwidth on every raster op. */
      stencil: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(this.dprHigh)

    /*
      A shader that fails to compile does not throw. The mesh silently stops
      drawing and whatever is behind it becomes the render, which reads as an
      art direction problem rather than a build error. That cost a full review
      cycle once, so it now says so loudly.
    */
    this.renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
      const log = (s: WebGLShader) => gl.getShaderInfoLog(s)?.trim()
      console.error(
        '[earth-scene] shader failed to compile. The globe will not render.\n' +
          `vertex: ${log(vertex) || 'ok'}\nfragment: ${log(fragment) || 'ok'}\n` +
          `program: ${gl.getProgramInfoLog(program)?.trim() || ''}`,
      )
    }

    /*
      Context loss recovery. A driver timeout, a GPU switch on a dual GPU
      laptop or the OS reclaiming memory kills the WebGL context; three
      prevents default and reinitialises on restore, and every texture here is
      a DataTexture whose CPU-side bytes are retained, so re-upload is
      automatic. The one gap is ours: the idle skip would sit on a restored
      but never redrawn context forever. Waking the loop and invalidating the
      last drawn state closes it.
    */
    ;(opts.canvas as unknown as EventTarget).addEventListener(
      'webglcontextrestored',
      this.onContextRestored,
    )

    this.camera = new PerspectiveCamera(CAM_FOV, 1, 0.1, 200)
    this.camera.position.set(0, 0, CAM_Z)

    this.spin = MathUtils.degToRad(ENTRY.spin)
    this.world.rotation.y = this.spin
    this.applyVantage(this.spin)

    this.tilt.add(this.world)
    this.root.add(this.tilt)
    this.applyProgress(0, true)
    this.scene.add(this.root)

    this.addGlow()
    void this.load()
  }

  /*
    The scroll sequence, in one place.

      0.00 to 0.50   the crop pulls back from the cinematic close up to a ball
      0.45 to 0.78   the entry drop blends away, so the vantage climbs from the
                     cinematic offset onto the tour path itself
      past 0.78      held, while the callouts fade in over the top

    The two ranges overlap on purpose. The globe starts turning toward its final
    orientation before it has finished shrinking, so the two read as one move
    rather than two.
  */
  private applyProgress(progress: number, force = false) {
    if (!force && Math.abs(progress - this.lastProgress) < 0.0004) return
    this.lastProgress = progress

    const narrow = this.aspect < 1.1
    const from = narrow ? CROP_ENTRY_NARROW : CROP_ENTRY
    const to = narrow ? CROP_FULL_NARROW : CROP_FULL

    const zoom = ease(progress / 0.5)
    const r = MathUtils.lerp(from.r, to.r, zoom)
    const cx = MathUtils.lerp(from.x, to.x, zoom) * FRAME_H * this.aspect
    const cy = MathUtils.lerp(from.y, to.y, zoom) * FRAME_H

    this.root.position.set(cx, cy, 0)
    this.root.scale.setScalar(r * FRAME_H)
    this.centreWorld.set(cx, cy, 0)

    /*
      The only thing the settle does now is fade the entry drop out, handing the
      vantage over from the cinematic composition to the tour path. The tilt
      itself is applied in applyVantage, every frame, because it also depends on
      the spin.
    */
    this.settle = ease((progress - 0.45) / 0.33)
  }

  /*
    Ease the spin toward an angle by the shortest path. Rate capped, so a return
    from the far side of the globe is a calm turn rather than a snap, with an
    exponential tail on approach. Returns true once arrived.

    Under reduced motion it jumps straight to the target: the defined states
    still hold, without the animated travel.
  */
  private seek(target: number, dt: number): boolean {
    const delta = shortestAngle(target - this.spin)
    if (!this.opts.motion) {
      this.spin = target
      return true
    }
    const step = delta * (1 - Math.pow(SEEK_RATE, dt))
    const cap = SEEK_MAX * dt
    this.spin += MathUtils.clamp(step, -cap, cap)
    return Math.abs(delta) < 0.004
  }

  /*
    The vantage rides the customer circle. Where on that circle depends on the
    spin, so this runs every frame, after the spin has advanced. The planet's
    own rotation is never touched: `tilt` pitches the whole assembly toward the
    camera, which changes the viewing latitude and nothing else. North stays up.
  */
  private applyVantage(angle: number) {
    const entry = (ENTRY_DROP + vantageDip(angle)) * (1 - this.settle)
    this.tilt.rotation.x = MathUtils.degToRad(pathLat(angle) + entry)
  }

  /* -------------------------------------------------------------- glow */

  private addGlow() {
    /*
      Atmosphere halo, outside the limb.

      Two earlier attempts were wrong and are worth recording. A back faced
      fresnel shell is brightest at its own silhouette, which draws a hard
      circle. A plane with depthTest off painted over the planet, because the
      Earth is opaque and therefore renders in the opaque pass, which always
      comes before every transparent object regardless of render order.

      This plane sits just behind the limb ring with depth testing on, so every
      fragment inside the silhouette fails against the sphere and only the halo
      survives. The band is deliberately tight and very bright, with a wider
      soft bloom behind it, matching the reference where the rim is a thin hard
      line of light rather than a broad haze.
    */
    const half = 1.34
    const glow = new Mesh(
      new PlaneGeometry(half * 2, half * 2),
      new ShaderMaterial({
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        uniforms: {
          uColor: { value: ATMO.clone() },
          /* The sun's direction in screen space. The camera never moves, so
             this is a constant. */
          uSunDir: { value: new Vector2(SUN.x, SUN.y).normalize() },
        },
        vertexShader: `
          varying vec2 vPos;
          void main() {
            vPos = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform vec2 uSunDir;
          varying vec2 vPos;
          void main() {
            float d = length(vPos);
            /* Past the bloom and the flare tails nothing survives, but the
               quad's corners still reach d 1.9. Dropping them here skips the
               blend stage for roughly a third of the quad's area. */
            if (d > 1.32) discard;
            vec2 nd = normalize(vPos + vec2(1e-5));

            /*
              Three layers, matching the reference frame.

              A thin crisp line hugging the limb. The sphere occludes this plane
              inside the silhouette, so only the sliver just outside d = 1
              survives, which is exactly the hard bright edge in the source.
            */
            float ring = smoothstep(1.03, 1.0, d);
            /* A soft bloom past it, tight rather than a wide fog. */
            float bloom = smoothstep(1.22, 0.995, d);
            float a = ring * 1.6 + pow(bloom, 3.0) * 0.30;

            /*
              Brightest on the side the sun is on, fading round the limb, rather
              than an even ring. A backlit planet does not glow equally all the
              way round, and an even ring is the giveaway that it is a shader.
            */
            float side = dot(nd, uSunDir) * 0.5 + 0.5;
            a *= mix(0.2, 1.0, pow(side, 1.6));

            /*
              The sunrise. A compact flare pinned to the limb where the sun
              clears it: about ten degrees of arc along the edge, bleeding
              outward with an exponential tail. Added after the side weighting
              so it stays at full strength.
            */
            float along = pow(max(dot(nd, uSunDir), 0.0), 40.0);
            float spot = along * exp(-abs(d - 1.0) * 10.0);
            a += spot * 2.2;

            /*
              The scattering gradient. Real limb atmosphere is not one colour:
              the shell is optically thickest right at the limb, deep and
              saturated, and thins outward toward pale cyan white. Three stops
              by distance replace the flat colour, which is most of the
              difference between a glow effect and an atmosphere.
            */
            vec3 deepBlue = uColor * vec3(0.52, 0.72, 1.0);
            vec3 paleEdge = mix(uColor, vec3(1.0), 0.55);
            vec3 atmoCol = mix(deepBlue, paleEdge, smoothstep(1.0, 1.2, d));

            /* The line whitens toward the sun and the flare is nearly white,
               like the source. */
            vec3 col = mix(atmoCol, vec3(1.0),
              clamp(spot * 1.4 + ring * 0.3 * pow(side, 3.0), 0.0, 0.8));

            /*
              Dither. A smooth dark green gradient over this much screen bands
              visibly on 8 bit displays, and additive blending makes it worse.
              Half a step of screen anchored noise breaks the contours up at an
              amplitude well below anything the eye can see as noise.
            */
            float dn = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
            a += (dn - 0.5) * 0.012;

            gl_FragColor = vec4(col, clamp(a, 0.0, 2.0));
          }
        `,
      }),
    )
    glow.position.z = -0.06
    this.root.add(glow)
  }

  /* ------------------------------------------------------------- build */

  private async load() {
    /*
      No sky here. The deep space plate is a CSS background on .hero-base, under
      this canvas, which is why the renderer clears to transparent. Rendering it
      would cost a full screen texture pass for something that never moves; a
      background image costs nothing and the browser composites it once.

      Weights are rough file size shares, so the loading bar moves honestly.
    */
    const parts = { lights: 0, land: 0, borders: 0 }
    const push = () =>
      this.opts.onLoad?.(parts.lights * 0.5 + parts.land * 0.2 + parts.borders * 0.3)
    const [lightsBm, landBm, borderBm] = await Promise.all([
      fetchBitmap('/textures/lights.webp', (f) => {
        parts.lights = f
        push()
      }),
      fetchBitmap('/textures/land.webp', (f) => {
        parts.land = f
        push()
      }),
      fetchBitmap('/textures/borders.webp', (f) => {
        parts.borders = f
        push()
      }),
    ])
    if (this.disposed) return

    /* The lights ship as colour but the shader only ever used the luminance,
       so the maximum channel is folded in during extraction. It arrives sRGB
       encoded; the shader linearises with a pow, which is what the sRGB
       texture flag used to do for free. */
    const lightsMap = extractChannel(lightsBm, 'max')
    const landMap = extractChannel(landBm, 'r')
    const borderMap = extractChannel(borderBm, 'r')

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy()
    /*
      The surface is seen at a glancing angle across most of the visible cap,
      which is exactly where anisotropic filtering earns its keep, and also
      exactly where its cost explodes: the sample count scales with the level.
      Level 8 costs roughly half of 16 in the worst case, and 16 only ever
      differs from 8 past an 8 to 1 texel footprint, a compression this view
      barely reaches at its most oblique visible pixels.
    */
    lightsMap.anisotropy = Math.min(maxAniso, 8)
    landMap.anisotropy = Math.min(maxAniso, 8)
    borderMap.anisotropy = Math.min(maxAniso, 8)

    const earthMat = new ShaderMaterial({
        uniforms: {
          uLights: { value: lightsMap },
          uLand: { value: landMap },
          uBorders: { value: borderMap },
          uSun: { value: SUN.clone() },
          uOcean: { value: OCEAN.clone() },
          uLandCol: { value: LAND.clone() },
          uAtmo: { value: new Vector3(ATMO.r, ATMO.g, ATMO.b) },
          uGlint: { value: GLINT.clone() },
          uCity: { value: CITY.clone() },
          /* Bright shallow water, the top of the depth ramp. */
          uShallow: { value: new Vector3(0.05, 0.18, 0.34) },
          uLandTexel: { value: new Vector2(1 / 5120, 1 / 2560) },
          /*
            0 in the hero, 1 once settled into the section under it, riding the
            scroll settle. The cinematic entry wants a readable night side; the
            section view was too well lit in shadow, so the dark floor deepens
            as the ball arrives.
          */
          uDark: { value: 0 },
          uNoise: { value: makeNoiseTexture() },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform sampler2D uLights;
          uniform sampler2D uLand;
          uniform sampler2D uBorders;
          uniform vec3 uSun;
          uniform vec3 uOcean;
          uniform vec3 uLandCol;
          uniform vec3 uAtmo;
          uniform vec3 uGlint;
          uniform vec3 uCity;
          uniform float uDark;
          uniform sampler2D uNoise;
          uniform vec3 uShallow;
          uniform vec2 uLandTexel;
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;

          /*
            Bicubic sampling for the land channel only. Bilinear magnification
            is what made the coastline mushy at the entry crop: a B spline
            cubic reconstructs a smooth curve through the same texels, four
            bilinear fetches doing the work of sixteen taps. No data changed,
            no alignment risk, just better reconstruction.
          */
          vec4 cubicWeights(float t) {
            vec4 e = vec4(1.0, 2.0, 3.0, 4.0) - t;
            vec4 e3 = e * e * e;
            float wa = e3.x;
            float wb = e3.y - 4.0 * e3.x;
            float wc = e3.z - 4.0 * e3.y + 6.0 * e3.x;
            return vec4(wa, wb, wc, 6.0 - wa - wb - wc) * (1.0 / 6.0);
          }

          float landBicubic(vec2 uv) {
            vec2 tsz = 1.0 / uLandTexel;
            vec2 crd = uv * tsz - 0.5;
            vec2 fxy = fract(crd);
            crd -= fxy;
            vec4 wx = cubicWeights(fxy.x);
            vec4 wy = cubicWeights(fxy.y);
            vec4 corner = crd.xxyy + vec2(-0.5, 1.5).xyxy;
            vec4 sums = vec4(wx.xz + wx.yw, wy.xz + wy.yw);
            vec4 off = (corner + vec4(wx.yw, wy.yw) / sums) * uLandTexel.xxyy;
            float t00 = texture2D(uLand, off.xz).r;
            float t10 = texture2D(uLand, off.yz).r;
            float t01 = texture2D(uLand, off.xw).r;
            float t11 = texture2D(uLand, off.yw).r;
            float fx = sums.x / (sums.x + sums.y);
            float fy = sums.z / (sums.z + sums.w);
            return mix(mix(t11, t01, fx), mix(t10, t00, fx), fy);
          }

          void main() {
            vec3 n = normalize(vWorldNormal);
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float sunDot = dot(n, uSun);
            float fres = 1.0 - clamp(dot(n, viewDir), 0.0, 1.0);

            /* Wide, soft terminator. A hard one reads as a lighting bug. */
            float daylight = smoothstep(-0.18, 0.42, sunDot);

            /*
              One channel, two signals. Ocean depth occupies the bottom half of
              the range and land brightness the top, split back apart here. The
              split is continuous across the coastline, so there is no seam.
            */
            float surf = landBicubic(vUv);
            float land = clamp((surf - 0.5) * 2.0, 0.0, 1.0);
            float shelf = clamp(surf * 2.0, 0.0, 1.0);
            float lights = texture2D(uLights, vUv).r;

            /*
              The planet's colour is generated, not sampled. There is no albedo
              map: the texture only says land or water and how deep, and the
              shading does the rest. That is the whole reason this version is a
              fifth of the size of the photographic one.

              The water is not a flat fill. Real bathymetry rides on it, so
              continental shelves sit lighter than abyssal plain and the mid
              ocean ridges show.
            */
            /*
              Sea state. Two octaves from the precomputed tiling noise texture,
              scaled 2:1 to stay isotropic on the equirectangular map. Anchored
              to the surface through vUv, so the pattern turns with the globe
              and reads as water rather than as screen grain. Kept low
              amplitude: the water should vary, not pattern.
            */
            float wave = 0.65 * texture2D(uNoise, vUv * vec2(9.375, 4.6875)).r
                       + 0.35 * texture2D(uNoise, vUv * vec2(28.125, 14.0625)).r;

            /*
              A faint bright water line hugging the coasts, straight from the
              depth channel: surf approaches 0.5 at the shoreline from below.
              Sharpens every continent silhouette for free.
            */
            float shore = smoothstep(0.30, 0.485, surf) * (1.0 - land);

            /*
              The depth story. shelf is the contrast curved GEBCO depth, near
              one on the continental shelf and low over the abyss, so the water
              ramps from bright shallow turquoise hugging every coast down into
              deep open blue. The curve lives in the texture bake; the ramp
              exponent here shapes how quickly the shallows fall away.
            */
            vec3 water = mix(uOcean * 0.5, uShallow, pow(shelf, 1.3)) * (0.92 + 0.16 * wave);
            water += uOcean * shore * 0.55;
            vec3 base = mix(water, uLandCol, smoothstep(0.04, 0.42, land));

            /*
              High gain, because the sun only grazes: peak sunDot across the
              visible cap is about 0.49, so a gain near 1 leaves the whole
              planet dark. This brings the lit top right up to roughly half
              brightness and lets the bottom fall to near black.
            */
            /* The dark floor deepens with uDark: the settled section view sat
               too well lit in shadow at the hero's ambient level. */
            vec3 lit = base * (mix(0.035, 0.016, uDark) + 7.0 * pow(clamp(sunDot, 0.0, 1.0), 1.25));

            /*
              The night hemisphere was near flat black, which amputates the
              sphere. A trace of atmosphere green in the dark ocean keeps the
              ball readable without competing with the city lights.
            */
            lit += uAtmo * (1.0 - daylight) * mix(0.018, 0.008, uDark) * (0.4 + 0.6 * shelf) * (1.0 - land);
            lit += uAtmo * shore * 0.05 * (1.0 - 0.5 * uDark) * (1.0 - daylight);

            /* Limb darkening: photographed planets dim toward the edge even
               in daylight, as the light path through atmosphere lengthens.
               Squared so the middle of the face is untouched. */
            lit *= 1.0 - 0.22 * fres * fres;

            /*
              City lights are emissive: added, never lit, because they do not
              get darker for being in shadow. On land only.

              Only the luminance is taken, then recoloured. Black Marble carries
              a dim blue grey wash across unlit land as well as the lights
              themselves, and using its colour directly turned every dark
              continent purple. The threshold drops that wash to nothing and
              leaves the conurbations.

              The map is single channel and sRGB encoded; the pow linearises
              it, which the sRGB texture flag used to do before the maps moved
              to R8.
            */
            float glow = pow(lights, 2.2);
            glow = smoothstep(0.05, 0.45, glow);
            /* Gain 1.5, not 2.3: above roughly 1.6 the warm colour clips to
               white in every channel and the lights lose their gold. */
            vec3 city = uCity * glow * 1.5 * (1.0 - daylight) * smoothstep(0.02, 0.18, land);

            /*
              Bloom for free. Sampling the lights map with an explicit mip
              bias reads a pre-blurred copy straight out of the existing
              mipmap chain: no post-processing pass, one instruction, and the
              big conurbations haze softly the way a camera sees them.
            */
            float cityHaze = pow(texture2D(uLights, vUv, 4.0).r, 2.2);
            city += uCity * smoothstep(0.02, 0.5, cityHaze) * 0.35
                  * (1.0 - daylight) * smoothstep(0.02, 0.18, land);

            vec3 color = lit + city;

            /*
              Country outlines, in the same colour as the city lights so they
              read as part of the same layer rather than as an overlay.

              The mask carries its own weighting: coastlines and internal
              borders are dim, Bangladesh is brighter and thicker, so one
              texture read gives both. Kept faint on the lit side, where the
              surface is bright enough to swallow them anyway, and allowed to
              come up on the night side where they do the work.
            */
            float border = texture2D(uBorders, vUv).r;
            color += uCity * border * (0.30 - 0.15 * daylight);

            /*
              Sun glint off water. The bright bloom where the sun clears the
              limb in the reference.

              Note the variable name. This was called "half", which is a
              RESERVED KEYWORD in GLSL ES. The shader failed to compile, the
              Earth mesh silently did not draw at all, and what was left on
              screen was the atmosphere plane on its own: a flat disc with a
              conical gradient, because that plane's alpha varies with the angle
              around its centre. It reads exactly like a lighting bug and is not
              one.
            */
            vec3 halfway = normalize(uSun + viewDir);
            /* fres is declared at the top of main; the limb darkening needed
               it before the lighting terms. */

            /*
              Broad, and pushed to the limb.

              At exponent 110 this was a pinpoint sitting wherever the half
              vector happened to line up. In the source it is a wide bloom that
              sits on the edge of the disc and washes along it. So the lobe is
              far wider, and it is weighted by the same fresnel term the
              atmosphere uses, which concentrates it where the surface turns
              away.
            */
            /*
              Tighter than it was. At exponent 22 with a broad base term the
              glint washed across the whole upper cap as a big soft sheen. The
              reference concentrates the light bleed near the limb below the
              sunrise spot, so the lobe is narrower and nearly all of its
              weight now comes through the fresnel term.
            */
            /*
              The glitter lane. Satellite sun glitter is not a round highlight:
              it stretches along the sun's azimuth. Penalising deviation
              perpendicular to the sun-view plane elongates the lobe into the
              lane, and the sea state noise then reads as waves inside it.
            */
            float across = dot(n, normalize(cross(uSun, viewDir) + vec3(1e-5)));
            float spec = pow(max(dot(n, halfway), 0.0), 26.0)
                       * exp(-45.0 * across * across)
                       * (1.0 - land * 0.8);
            /* The sea state breaks the glint up. A perfectly smooth ocean
               reflects a clean oval, which is the tell that it is a shader. */
            spec *= 0.75 + 0.5 * wave;
            /* Shallow water catches more of it than open ocean, which gives the
               glint some structure instead of a clean oval. */
            color += uGlint * spec * (0.10 + 2.4 * pow(fres, 2.5)) * (0.8 + 0.5 * shelf) * 1.4;

            /*
              No twilight band. One was tried here, a warm strip along the
              terminator, and at this grazing sun angle the terminator crosses
              the whole visible cap, so it rendered as a broad dust coloured
              ring around the planet. Rejected on sight.
            */

            /*
              Atmospheric scattering on the surface, hugging the limb.

              The exponent here is the whole difference between a planet and a
              blue blob. A cropped globe shows almost nothing but the region
              near the limb, so the fresnel term is large across the entire
              visible cap, not just at its edge. Measured at the top of the cap:

                pow(fres, 3.2) = 0.18     floods the planet
                pow(fres, 9.0) = 0.006    confined to the edge

              So it is split. A tight, bright rim that only exists within a few
              percent of the silhouette, plus a broad haze at low enough
              amplitude to tint the surface rather than drown it.
            */
            /* fres is declared above, with the glint. */
            float sunSide = 0.18 + 1.5 * smoothstep(-0.7, 0.35, sunDot);
            float rim = pow(fres, 9.0) * 1.6;
            float haze = pow(fres, 2.5) * 0.06;
            /* The rim whitens where the sun grazes it, so the inside edge of
               the limb agrees with the hot line the halo draws outside it. */
            vec3 rimCol = mix(uAtmo, vec3(1.0), 0.35 * smoothstep(0.1, 0.6, sunDot));
            color += rimCol * (rim + haze) * sunSide;

            gl_FragColor = vec4(color, 1.0);
            #include <colorspace_fragment>
          }
        `,
      })
    this.earthMat = earthMat

    const earth = new Mesh(new SphereGeometry(EARTH_R, 128, 96), earthMat)
    this.world.add(earth)

    this.buildMarkersAndArcs()

    /*
      Warm the shaders off the critical path. Without this the first rendered
      frame stalls on a synchronous compile and link of every program, which
      lands exactly on the globe's entrance. compileAsync uses parallel
      compilation where the driver offers it and resolves when everything is
      ready to draw at full speed.
    */
    try {
      await this.renderer.compileAsync(this.scene, this.camera)
    } catch {
      /* A compile error surfaces through onShaderError; keep going so the
         report is visible rather than hanging the loader. */
    }
    if (this.disposed) return

    /* Draw one complete frame before declaring ready, so a loading screen
       never lifts on an empty canvas. */
    this.needsDraw = true
    this.renderer.render(this.scene, this.camera)
    this.reportMarkers()
    this.opts.onReady()
  }

  private buildMarkersAndArcs() {
    const origin = this.opts.places.find((p) => p.id === this.opts.originId)
    if (!origin) return
    const originVec = toVector(origin.lon, origin.lat, EARTH_R)

    for (const place of this.opts.places) {
      const at = toVector(place.lon, place.lat, MARKER_R)
      this.markers.push({ id: place.id, position: at })
      this.frameBuf.push({ id: place.id, x: 0, y: 0, visible: false })

      const isOrigin = place.id === this.opts.originId
      const dot = new Mesh(
        new SphereGeometry(isOrigin ? 0.009 : 0.006, 12, 10),
        new MeshBasicMaterial({ color: 0xfff3e0 }),
      )
      dot.position.copy(at)
      this.world.add(dot)

      if (isOrigin) continue

      const to = toVector(place.lon, place.lat, EARTH_R)
      const angle = originVec.angleTo(to)
      /* Low and long rather than high and tight. The arcs used to bow so far
         off the surface they read as orbits rather than routes. */
      const lift = 0.05 + angle * 0.035
      const points: Vector3[] = []
      const steps = 72
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const p = new Vector3().copy(originVec).lerp(to, t).normalize()
        points.push(p.multiplyScalar(EARTH_R + lift * Math.sin(Math.PI * t)))
      }

      const tube = new TubeGeometry(new CatmullRomCurve3(points), 96, 0.0016, 6, false)
      const mesh = new Mesh(
        tube,
        new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
      )
      const total = tube.index ? tube.index.count : 0
      tube.setDrawRange(0, this.opts.motion ? 0 : total)
      this.arcs.push({ mesh, total })
      this.world.add(mesh)
    }

    if (!this.opts.motion) this.arcProgress = 1
  }

  private onContextRestored = () => {
    this.needsDraw = true
    this.lastDrawnSpin = Infinity
    this.lastDrawnProgress = -1
    this.settled = false
    this.start()
  }

  /* ----------------------------------------------------------- pointer */

  /*
    Public, DOM free. The component owning the real canvas element binds the
    pointer events, handles capture and calls these, either directly or across
    a worker boundary. Only the x coordinate matters: the drag is a spin.
  */

  pointerDown(x: number) {
    this.dragging = true
    this.settled = false
    this.returning = false
    this.pendingReturn = false
    this.dragInShowcase = this.settle > 0.5
    this.lastPointerX = x
    this.idleFor = 0
    this.start()
  }

  pointerMove(x: number) {
    if (!this.dragging) return
    const dx = x - this.lastPointerX
    this.lastPointerX = x
    if (this.dragInShowcase) this.dragOff += dx * 0.004
    else this.spin += dx * 0.004
    this.velocity = dx * 0.04
  }

  pointerUp() {
    if (!this.dragging) return
    this.dragging = false
    this.idleFor = 0
    this.pendingReturn = true
  }

  /* ------------------------------------------------------------- frame */

  private frame = (time: number) => {
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.05) : 0.016
    this.lastTime = time

    const progress = MathUtils.clamp(this.opts.getProgress(), 0, 1)
    this.applyProgress(progress)
    const scrollSpeed = Math.abs(progress - this.prevP) / dt
    this.prevP = progress

    if (!this.dragging) {
      this.velocity *= Math.pow(0.02, dt)
      this.idleFor += dt

      /* A finished drag settles back to the resting spot after the delay. */
      if (this.pendingReturn && this.idleFor > RESUME_AFTER) {
        this.pendingReturn = false
        this.returning = true
      }

      if (this.dragInShowcase) {
        /* Drag inertia, then the offset decays home. The blend underneath is
           scroll driven and needs no help. */
        this.dragOff += this.velocity * dt
        if (this.returning) {
          if (!this.opts.motion) this.dragOff = 0
          this.dragOff *= Math.pow(SEEK_RATE, dt)
          if (Math.abs(this.dragOff) < 0.002) {
            this.dragOff = 0
            this.dragInShowcase = false
            /* If the drag interrupted the hero end's parking, finish the job
               once control passes back to the hero branch. */
            this.returning =
              Math.abs(shortestAngle(MathUtils.degToRad(ENTRY.spin) - this.spin)) > 0.004
          }
        }
      } else {
        this.spin += this.velocity * dt

        /*
          Whenever the page has scrolled into the blend at all, the hero end
          quietly parks itself at the default. The showcase end dominates the
          render, so this is invisible, and it is why scrolling back up lands
          on Bangladesh instead of on wherever the tour had got to.
        */
        if (this.settle > 0) this.returning = true

        if (this.returning) {
          if (this.seek(MathUtils.degToRad(ENTRY.spin), dt) && this.settle === 0) {
            this.returning = false
            /* Fade the tour back in from zero rather than jumping to speed. */
            this.idleFor = RESUME_AFTER
          }
        } else if (this.opts.motion && !this.pendingReturn && this.settle === 0) {
          this.spin += TOUR_SPIN * MathUtils.clamp((this.idleFor - RESUME_AFTER) / 1.5, 0, 1) * dt
        }
      }
    }

    /*
      The rendered angle. The scroll scrubs the turn between the two states
      directly: settle 0 renders the hero angle, settle 1 renders the showcase
      spot, and the drag offset rides on top, scaled by the same settle so it
      too scrubs away on the way up.
    */
    const swing = shortestAngle(MathUtils.degToRad(SHOWCASE.spin) - this.spin)
    const rendered = this.spin + swing * this.settle + this.dragOff * this.settle
    this.world.rotation.y = rendered
    this.applyVantage(rendered)
    if (this.earthMat) this.earthMat.uniforms.uDark.value = this.settle

    /*
      Frame time feedback: see the field block. Sampled only while running at
      the high tier, since the low tier during motion is supposed to be the
      cheap one. dt arrives already clamped, so a background tab's resumed
      first frame cannot poison the average.
    */
    if (this.dprCurrent === this.dprHigh && this.dprHigh > 1.25) {
      this.frameEma += (dt * 1000 - this.frameEma) * 0.05
      if (this.frameEma > 19) {
        this.slowFor += dt
        if (this.slowFor > 1) {
          this.dprHigh = Math.max(1.25, this.dprHigh - 0.375)
          this.frameEma = 16
          this.slowFor = 0
          this.lastDprSwitch = time
          this.dprCurrent = this.dprHigh
          this.renderer.setPixelRatio(this.dprHigh)
          this.renderer.setSize(this.size.x, this.size.y, false)
          this.needsDraw = true
        }
      } else if (this.slowFor > 0) {
        this.slowFor = 0
      }
    }

    /* Dynamic resolution: see the field block. Angular speed of the rendered
       globe or a fast scroll both count as motion. */
    if (this.dprLow < this.dprHigh) {
      const angular = Math.abs(shortestAngle(rendered - this.lastRendered)) / dt
      const busy = this.dragging || angular > 0.35 || scrollSpeed > 0.3
      this.calmFor = busy ? 0 : this.calmFor + dt
      const want = busy ? this.dprLow : this.calmFor > 0.5 ? this.dprHigh : this.dprCurrent
      if (want !== this.dprCurrent && time - this.lastDprSwitch > 250) {
        this.dprCurrent = want
        this.lastDprSwitch = time
        this.renderer.setPixelRatio(want)
        this.renderer.setSize(this.size.x, this.size.y, false)
        this.needsDraw = true
      }
    }
    this.lastRendered = rendered

    if (this.arcProgress < 1) {
      this.arcProgress = Math.min(1, this.arcProgress + dt / 1.5)
      const eased = 1 - Math.pow(1 - this.arcProgress, 3)
      this.arcs.forEach((arc, i) => {
        const staggered = MathUtils.clamp(eased * 1.5 - i * 0.12, 0, 1)
        arc.mesh.geometry.setDrawRange(0, Math.floor(arc.total * staggered))
      })
      this.needsDraw = true
    }

    /* Idle skip: see the field block. Anything that would change the picture
       sets one of these apart; a settled globe renders nothing at all. */
    const dirty =
      this.needsDraw ||
      Math.abs(shortestAngle(rendered - this.lastDrawnSpin)) > 0.00002 ||
      Math.abs(this.lastProgress - this.lastDrawnProgress) > 0.0002
    if (dirty) {
      this.needsDraw = false
      this.lastDrawnSpin = rendered
      this.lastDrawnProgress = this.lastProgress
      this.renderer.render(this.scene, this.camera)
      this.reportMarkers()
    }

    if (
      !this.opts.motion &&
      !this.dragging &&
      this.arcProgress >= 1 &&
      !this.returning &&
      !this.pendingReturn
    ) {
      if (Math.abs(this.velocity) < 0.001) {
        this.settled = true
        this.stop()
      }
    }
  }

  private reportMarkers() {
    if (!this.markers.length) return

    for (let i = 0; i < this.markers.length; i++) {
      const m = this.markers[i]
      const frame = this.frameBuf[i]
      this.projected.copy(m.position)
      this.world.localToWorld(this.projected)
      /* Facing test is against the sphere's own centre, which the crop moves
         a long way from the origin. */
      const front = this.rel.copy(this.projected).sub(this.centreWorld).normalize().z > 0.06
      this.projected.project(this.camera)
      const x = (this.projected.x + 1) / 2
      const y = (-this.projected.y + 1) / 2
      frame.x = x * this.size.x
      frame.y = y * this.size.y
      frame.visible = front && x > 0.01 && x < 0.99 && y > 0.01 && y < 0.99
    }

    this.opts.onMarkers(this.frameBuf)
  }

  /* ------------------------------------------------------------ public */

  setSize(width: number, height: number) {
    if (width === 0 || height === 0) return
    this.size.set(width, height)
    this.needsDraw = true
    this.aspect = width / height
    this.camera.aspect = this.aspect
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
    this.applyProgress(MathUtils.clamp(this.opts.getProgress(), 0, 1), true)
    /*
      Repaint in the same task, always. Resizing the drawing buffer erases it,
      and waiting for the next animation frame leaves at least one presented
      frame of empty canvas, a visible blink. If the loop happens to be
      stopped, the blink would hold until something else wakes it. Once there
      is anything to draw, a resize is never allowed to reach the compositor
      unpainted.
    */
    if (this.earthMat) {
      this.renderer.render(this.scene, this.camera)
      this.reportMarkers()
    }
  }

  start() {
    this.lastTime = 0
    this.renderer.setAnimationLoop(this.frame)
  }

  stop() {
    this.renderer.setAnimationLoop(null)
  }

  dispose() {
    this.disposed = true
    this.stop()
    ;(this.opts.canvas as unknown as EventTarget).removeEventListener(
      'webglcontextrestored',
      this.onContextRestored,
    )

    this.scene.traverse((obj) => {
      const mesh = obj as Mesh
      mesh.geometry?.dispose?.()
      const material = mesh.material
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material?.dispose?.()
    })
    this.renderer.dispose()
  }
}
