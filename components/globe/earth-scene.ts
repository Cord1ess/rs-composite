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
  BufferAttribute,
  CatmullRomCurve3,
  type Color,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import {
  ATMO,
  CAM_FOV,
  CAM_Z,
  CLOUDS,
  CROP_ENTRY,
  CROP_ENTRY_NARROW,
  CROP_FULL,
  CROP_FULL_NARROW,
  EARTH_R,
  ENTRY,
  ENTRY_DROP,
  FRAME_H,
  MARKER_R,
  pathLat,
  SEEK_MAX,
  SEEK_RATE,
  SHOWCASE,
  shortestAngle,
  toVector,
  vantageDip,
} from './config'
import { extractChannel, fetchBitmap, makeNoiseTexture } from './textures'
import { cloudShader, earthShader, haloShader } from './shaders'
import { TUNE } from './tune'

/* Uniform builders over the tuning schema: every former shader literal is
   initialised from tune.ts, so the dev panel, the shipped values and the
   shaders can never disagree. */
const TF = (key: string) => ({ value: TUNE[key] as number })
const TV = (key: string) => {
  const v = TUNE[key] as [number, number, number]
  return { value: new Vector3(v[0], v[1], v[2]) }
}

export type ScenePlace = { id: string; lon: number; lat: number }

export type MarkerFrame = {
  id: string
  x: number
  y: number
  visible: boolean
  /** 0 to 1 across the last degrees before the limb, so markers fade out
      instead of switching off. */
  fade: number
}

export type EarthOptions = {
  canvas: HTMLCanvasElement | OffscreenCanvas
  places: ScenePlace[]
  originId: string
  /** False renders once, settles and holds still. Production always passes
      true now (see GlobeField's probe): Windows performance mode reports
      prefers-reduced-motion and froze the centrepiece. */
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

export class EarthScene {
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera: PerspectiveCamera
  private root = new Group()
  private tilt = new Group()
  private world = new Group()
  private arcs: { mesh: Mesh; total: number; curve: CatmullRomCurve3 }[] = []
  private pulses: { mesh: Mesh; curve: CatmullRomCurve3; phase: number }[] = []
  private pulsePos = new Vector3()
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
  private cloudMat: ShaderMaterial | null = null
  private haloMat: ShaderMaterial | null = null
  private glowMesh: Mesh | null = null
  private running = false

  /* Live-tunable scene parameters, seeded from tune.ts. sunRaw keeps the
     panel's unnormalised slider values; sun is what the shaders see. */
  private sunRaw = new Vector3(
    TUNE.$sunX as number,
    TUNE.$sunY as number,
    TUNE.$sunZ as number,
  )
  private sun = this.sunRaw.clone().normalize()
  private tourSpin = TUNE.$tourSpin as number
  private cloudLag = TUNE.$cloudLag as number
  private resumeAfter = TUNE.$resumeAfter as number

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
        Always on. The audit trialled MSAA-off on retina displays, reasoning
        that a 2x buffer is already supersampled, and the headless check at a
        steady 2x agreed. Real hardware disagreed: dynamic resolution and the
        frame time governor spend much of their life below 2x, and there the
        limb renders as a raw staircase. The trial is closed; smoothness wins.
      */
      antialias: true,
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
    /*
      2.5 planet radii, not 1.34. The spark's inverse-square bleed needs
      room: with the old quad the glow was forcibly faded to zero a third
      of a radius past the limb, and zoomed out that fade rendered as a
      visible arc around the light, the hollow-ring artifact. At 2.5 the
      fade lives where the tail is already below perception. The extra
      fragments are a dozen ALU ops and one blend each, no texture taps.
    */
    const half = 2.5
    this.haloMat = new ShaderMaterial({
      transparent: true,
      /* Normal alpha blending, deliberately not additive: additive blue
         over the backdrop's warm nebula regions can only sum to violet,
         which was the purple halo, unfixable by hue tuning. Painting the
         air's own colour over the backdrop cannot. */
      depthWrite: false,
      depthTest: true,
      uniforms: {
        uColor: { value: ATMO.clone() },
        /* The sun's direction in screen space. The camera never moves, so
           this only changes when the panel retunes the sun. */
        uSunDir: { value: new Vector2(this.sun.x, this.sun.y).normalize() },
        uShellStr: TF('uShellStr'),
        uShellFall: TF('uShellFall'),
        uLitLo: TF('uLitLo'),
        uLitHi: TF('uLitHi'),
        uSideExp: TF('uSideExp'),
        uRingEdge: TF('uRingEdge'),
        uRingBase: TF('uRingBase'),
        uRingGain: TF('uRingGain'),
        uBandFall: TF('uBandFall'),
        uBandBase: TF('uBandBase'),
        uBandGain: TF('uBandGain'),
        uSparkPos: TF('uSparkPos'),
        uHeartAmp: TF('uHeartAmp'),
        uHeartTang: TF('uHeartTang'),
        uHeartRad: TF('uHeartRad'),
        uBleedAmp: TF('uBleedAmp'),
        uBleedK: TF('uBleedK'),
        uWinLo: TF('uWinLo'),
        uWinHi: TF('uWinHi'),
        uCompress: TF('uCompress'),
        uWhiteCurve: TF('uWhiteCurve'),
        uHaloDeep: TV('uHaloDeep'),
        uHaloPale: TV('uHaloPale'),
        uPaleMix: TF('uPaleMix'),
      },
      vertexShader: haloShader.vertexShader,
      fragmentShader: haloShader.fragmentShader,
    })
    const glow = new Mesh(new PlaneGeometry(half * 2, half * 2), this.haloMat)
    /*
      Close behind the limb, not far behind. The sphere occludes this plane
      past the silhouette by an overhang that grows with both the z gap and
      the view's obliquity; at -0.06 the entry crop's oblique framing pushed
      that overhang past d 1.04 and swallowed the sun point whole. At -0.02
      the overhang stays under about d 1.01 in every framing, the depth cut
      inside the silhouette still holds (the sphere's surface sits well in
      front near the limb), and the sun point crests the edge in the hero
      exactly as it does in the showcase.
    */
    glow.position.z = TUNE.$haloZ as number
    this.glowMesh = glow
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
    const parts = { lights: 0, land: 0, borders: 0, clouds: CLOUDS ? 0 : 1 }
    const push = () =>
      this.opts.onLoad?.(
        parts.lights * 0.4 + parts.land * 0.25 + parts.borders * 0.15 + parts.clouds * 0.2,
      )
    const [lightsBm, landBm, borderBm, cloudBm] = await Promise.all([
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
      CLOUDS
        ? fetchBitmap('/textures/clouds.webp', (f) => {
            parts.clouds = f
            push()
          })
        : Promise.resolve(null),
    ])
    if (this.disposed) return

    /* The lights ship as colour but the shader only ever used the luminance,
       so the maximum channel is folded in during extraction. It arrives sRGB
       encoded; the shader linearises with a pow, which is what the sRGB
       texture flag used to do for free. */
    const lightsMap = extractChannel(lightsBm, 'max')
    const landMap = extractChannel(landBm, 'r')
    const borderMap = extractChannel(borderBm, 'r')
    const cloudMap = cloudBm ? extractChannel(cloudBm, 'r') : null
    if (cloudMap) cloudMap.wrapS = RepeatWrapping

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
    /* The shell carries the clouds now, seen at the same glancing angles as
       the rest of the surface, so it earns the same level. */
    if (cloudMap) cloudMap.anisotropy = Math.min(maxAniso, 8)

    /* One noise tile serves both materials: the earth's sea state and the
       shell's edge grain. It is generated, so two copies would be identical
       bytes in memory twice. */
    const noiseTex = makeNoiseTexture()

    const earthMat = new ShaderMaterial({
        uniforms: {
          uLights: { value: lightsMap },
          uLand: { value: landMap },
          uBorders: { value: borderMap },
          uSun: { value: this.sun.clone() },
          uOcean: TV('uOcean'),
          uLandCol: TV('uLandCol'),
          uAtmo: TV('uAtmo'),
          uGlint: TV('uGlint'),
          uCity: TV('uCity'),
          /* Bright shallow water, the top of the depth ramp. */
          uShallow: TV('uShallow'),
          uLandTexel: { value: new Vector2(1 / 5120, 1 / 2560) },
          uTermLo: TF('uTermLo'),
          uTermHi: TF('uTermHi'),
          uSunGain: TF('uSunGain'),
          uSunExp: TF('uSunExp'),
          uAmbHero: TF('uAmbHero'),
          uAmbDark: TF('uAmbDark'),
          uDuskTint: TV('uDuskTint'),
          uNightFloor: TF('uNightFloor'),
          uNightFloorDark: TF('uNightFloorDark'),
          uShoreNight: TF('uShoreNight'),
          uLimbDark: TF('uLimbDark'),
          uShelfExp: TF('uShelfExp'),
          uDeepMul: TF('uDeepMul'),
          uWaveBase: TF('uWaveBase'),
          uWaveAmp: TF('uWaveAmp'),
          uShoreGlow: TF('uShoreGlow'),
          uCityGain: TF('uCityGain'),
          uCityThLo: TF('uCityThLo'),
          uCityThHi: TF('uCityThHi'),
          uHazeGain: TF('uHazeGain'),
          uBorderLit: TF('uBorderLit'),
          uBorderDay: TF('uBorderDay'),
          uGlintExp: TF('uGlintExp'),
          uLaneTight: TF('uLaneTight'),
          uGlintFresW: TF('uGlintFresW'),
          uGlintBase: TF('uGlintBase'),
          uGlintGain: TF('uGlintGain'),
          uGlintShelf: TF('uGlintShelf'),
          uRimPow: TF('uRimPow'),
          uRimGain: TF('uRimGain'),
          uHazePow: TF('uHazePow'),
          uHazeAmt: TF('uHazeAmt'),
          uRimSunLo: TF('uRimSunLo'),
          uRimSunGain: TF('uRimSunGain'),
          uRimWhite: TF('uRimWhite'),
          uShOffX: TF('uShOffX'),
          uShOffY: TF('uShOffY'),
          uShMip: TF('uShMip'),
          uShLo: TF('uShLo'),
          uShHi: TF('uShHi'),
          uShStr: TF('uShStr'),
          uShCity: TF('uShCity'),
          uShGlint: TF('uShGlint'),
          /*
            0 in the hero, 1 once settled into the section under it, riding the
            scroll settle. The cinematic entry wants a readable night side; the
            section view was too well lit in shadow, so the dark floor deepens
            as the ball arrives.
          */
          uDark: { value: 0 },
          uNoise: { value: noiseTex },
          uClouds: { value: cloudMap ?? noiseTex },
          uCloudAmt: { value: cloudMap ? (TUNE.uCloudAmt as number) : 0 },
          uCloudShift: { value: 0 },
        },
        vertexShader: earthShader.vertexShader,
        fragmentShader: earthShader.fragmentShader,
      })
    this.earthMat = earthMat

    const earth = new Mesh(new SphereGeometry(EARTH_R, 128, 96), earthMat)
    this.world.add(earth)

    if (cloudMap) {
      /*
        The cloud deck: see cloudShader for why it is a separate sphere. The
        0.6% lift is real altitude, about 40 km at earth scale, exaggerated
        just enough to buy visible parallax at the limb without opening a gap
        between a cloud and the shadow it casts. No depth write: the deck is
        translucent and everything above it (arcs, pulses) sorts explicitly.
      */
      this.cloudMat = new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uClouds: { value: cloudMap },
          uNoise: { value: noiseTex },
          uSun: { value: this.sun.clone() },
          uCloudShift: { value: 0 },
          uCloudAmt: TF('uCloudAmt'),
          uTermLo: TF('uTermLo'),
          uTermHi: TF('uTermHi'),
          uDeckLo: TF('uDeckLo'),
          uDeckGrain: TF('uDeckGrain'),
          uDeckHi: TF('uDeckHi'),
          uCoreLo: TF('uCoreLo'),
          uCoreHi: TF('uCoreHi'),
          uVeilLo: TF('uVeilLo'),
          uVeilHi: TF('uVeilHi'),
          uVeilEnvLo: TF('uVeilEnvLo'),
          uVeilEnvHi: TF('uVeilEnvHi'),
          uVeilAlpha: TF('uVeilAlpha'),
          uVeilSupp: TF('uVeilSupp'),
          uVeilColMix: TF('uVeilColMix'),
          uToneBase: TF('uToneBase'),
          uToneDeck: TF('uToneDeck'),
          uToneCore: TF('uToneCore'),
          uCloudWhite: TV('uCloudWhite'),
          uCloudGain: TF('uCloudGain'),
          uCloudExp: TF('uCloudExp'),
          uTopBase: TF('uTopBase'),
          uTopGain: TF('uTopGain'),
          uShadeGain: TF('uShadeGain'),
          uShadeBase: TF('uShadeBase'),
          uShadeCore: TF('uShadeCore'),
          uCShOffX: TF('uCShOffX'),
          uCShOffY: TF('uCShOffY'),
          uCloudAmb: TV('uCloudAmb'),
          uCAmbBase: TF('uCAmbBase'),
          uCAmbNight: TF('uCAmbNight'),
          uVeilCol: TV('uVeilCol'),
          uVeilColBase: TF('uVeilColBase'),
          uVeilColGain: TF('uVeilColGain'),
          uCFresLo: TF('uCFresLo'),
          uCFresHi: TF('uCFresHi'),
          uCNightAlpha: TF('uCNightAlpha'),
          uParDeck: TF('uParDeck'),
          uParVeil: TF('uParVeil'),
          uCLimbDark: TF('uCLimbDark'),
        },
        vertexShader: cloudShader.vertexShader,
        fragmentShader: cloudShader.fragmentShader,
      })
      /* Fewer segments than the earth: the fresnel fade hides the shell's
         silhouette, which is the only place tessellation would show. */
      const shell = new Mesh(new SphereGeometry(EARTH_R * 1.006, 96, 72), this.cloudMat)
      /* After the halo (0), before the arcs and pulses: routes fly above
         the weather. Explicit, because all four share a sort depth. */
      shell.renderOrder = 1
      this.world.add(shell)
    }

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
      this.frameBuf.push({ id: place.id, x: 0, y: 0, visible: false, fade: 0 })

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

      const curve = new CatmullRomCurve3(points)
      const tube = new TubeGeometry(curve, 96, 0.0016, 6, false)

      /*
        The taper. Vertex alpha runs from near solid at the origin to a
        third at the destination, so every route visibly leaves Bangladesh
        rather than connecting two equal points. Free at render time: it is
        four bytes a vertex, baked once.
      */
      const vCount = tube.attributes.position.count
      const colors = new Float32Array(vCount * 4)
      for (let v = 0; v < vCount; v++) {
        const t = Math.floor(v / 7) / 96
        colors[v * 4] = 1
        colors[v * 4 + 1] = 1
        colors[v * 4 + 2] = 1
        colors[v * 4 + 3] = 0.92 - 0.6 * t
      }
      tube.setAttribute('color', new BufferAttribute(colors, 4))

      const mesh = new Mesh(
        tube,
        new MeshBasicMaterial({ vertexColors: true, transparent: true }),
      )
      /* Above the cloud shell (renderOrder 1): routes fly over the weather. */
      mesh.renderOrder = 2
      const total = tube.index ? tube.index.count : 0
      tube.setDrawRange(0, this.opts.motion ? 0 : total)
      this.arcs.push({ mesh, total, curve })
      this.world.add(mesh)

      /*
        The pulse: a small bright bead travelling the route, implying
        direction. Hero phase only, where the tour already keeps the loop
        rendering, so the beads cost no extra frames; the showcase stays
        still and keeps its idle skip.
      */
      const pulse = new Mesh(
        new SphereGeometry(0.0075, 10, 8),
        new MeshBasicMaterial({
          color: 0xfff3e0,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      )
      pulse.renderOrder = 3
      this.pulses.push({ mesh: pulse, curve, phase: this.pulses.length * 0.23 })
      this.world.add(pulse)
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
      if (this.pendingReturn && this.idleFor > this.resumeAfter) {
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
            this.idleFor = this.resumeAfter
          }
        } else if (this.opts.motion && !this.pendingReturn && this.settle === 0) {
          this.spin +=
            this.tourSpin * MathUtils.clamp((this.idleFor - this.resumeAfter) / 1.5, 0, 1) * dt
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
    if (this.earthMat) {
      this.earthMat.uniforms.uDark.value = this.settle
      /*
        Cloud drift. The shell is a child of `world`, so the deck already
        rotates WITH the planet everywhere; the shift is a slip on top of
        that, moving the clouds against the spin (a feature's azimuth is
        rendered + spin - 2 pi shift). The LAG fraction below is the whole
        model: during the tour the deck's absolute rotation is (1 - LAG)
        times the planet's, riding with it just a little slower, and over a
        parked planet (the showcase, the pre-tour hold) the same slip is
        all that moves, a calm sign of life. The rates tried before this
        model spun the deck at up to twice tour speed backwards, which read
        as two unrelated shells.

        The ramp is the exact ramp the tour itself fades in with, so the
        clouds and the planet start moving together at the entrance: the
        drift used to run from the first frame while the tour waited out
        RESUME_AFTER, and clouds rolling under a parked planet for three
        seconds read as a glitch. Away from the resting hero state (drag,
        seeks, the showcase) the slip runs at full strength, which keeps
        the settled section alive; that retires the idle skip there, a
        deliberate trade. One shift into both materials, so the deck and
        the shadow it casts can never slide apart, and the frame is marked
        dirty so the drift can never freeze and snap.
      */
      if (this.opts.motion) {
        const resting =
          !this.dragging && !this.pendingReturn && !this.returning && this.settle === 0
        const ramp = resting
          ? MathUtils.clamp((this.idleFor - this.resumeAfter) / 1.5, 0, 1)
          : 1
        const shift =
          this.earthMat.uniforms.uCloudShift.value +
          dt * ramp * ((this.tourSpin * this.cloudLag) / (2 * Math.PI))
        this.earthMat.uniforms.uCloudShift.value = shift
        if (this.cloudMat) this.cloudMat.uniforms.uCloudShift.value = shift
        this.needsDraw = true
      }
    }

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

    /*
      Route pulses, hero phase only: the tour keeps the loop rendering there
      anyway, so the beads ride along free. They fade out with the settle so
      the showcase stays still and keeps its idle skip.
    */
    if (this.opts.motion && this.arcProgress >= 1 && this.settle < 0.999) {
      const strength = 1 - this.settle
      for (const pulse of this.pulses) {
        const t = MathUtils.euclideanModulo(time / 4200 + pulse.phase, 1)
        pulse.curve.getPoint(t, this.pulsePos)
        pulse.mesh.position.copy(this.pulsePos)
        /* Bright through the middle of the journey, soft at both ends. */
        const along = Math.sin(Math.PI * t)
        ;(pulse.mesh.material as MeshBasicMaterial).opacity = 0.85 * along * strength
      }
      this.needsDraw = true
    } else if (this.settle >= 0.999) {
      for (const pulse of this.pulses) {
        ;(pulse.mesh.material as MeshBasicMaterial).opacity = 0
      }
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
      const relZ = this.rel.copy(this.projected).sub(this.centreWorld).normalize().z
      this.projected.project(this.camera)
      const x = (this.projected.x + 1) / 2
      const y = (-this.projected.y + 1) / 2
      frame.x = x * this.size.x
      frame.y = y * this.size.y
      /* Fade across the last degrees before the limb instead of switching. */
      frame.fade =
        x > 0.01 && x < 0.99 && y > 0.01 && y < 0.99
          ? MathUtils.clamp((relZ - 0.04) / 0.12, 0, 1)
          : 0
      frame.visible = frame.fade > 0.01
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
    this.running = true
    this.renderer.setAnimationLoop(this.frame)
  }

  stop() {
    this.running = false
    this.renderer.setAnimationLoop(null)
  }

  /*
    The live tuning channel. Values come from the dev panel (tune.ts holds
    the schema and the shipped defaults), keyed by uniform name and applied
    to whichever of the three materials declares that uniform; $-keys are
    scene-level. Renders immediately when the loop is parked, so a slider
    is realtime even under reduced motion or before the reveal.
  */
  setTune(values: Record<string, number | [number, number, number]>) {
    const mats = [this.earthMat, this.cloudMat, this.haloMat]
    for (const [key, val] of Object.entries(values)) {
      if (key.startsWith('$')) {
        if (key === '$haloZ' && this.glowMesh) this.glowMesh.position.z = val as number
        else if (key === '$tourSpin') this.tourSpin = val as number
        else if (key === '$cloudLag') this.cloudLag = val as number
        else if (key === '$resumeAfter') this.resumeAfter = val as number
        else if (key === '$sunX' || key === '$sunY' || key === '$sunZ') {
          if (key === '$sunX') this.sunRaw.x = val as number
          else if (key === '$sunY') this.sunRaw.y = val as number
          else this.sunRaw.z = val as number
          this.sun.copy(this.sunRaw).normalize()
          for (const mat of [this.earthMat, this.cloudMat]) {
            const u = mat?.uniforms.uSun
            if (u) (u.value as Vector3).copy(this.sun)
          }
          const dir = this.haloMat?.uniforms.uSunDir
          if (dir) (dir.value as Vector2).set(this.sun.x, this.sun.y).normalize()
        }
        continue
      }
      for (const mat of mats) {
        const u = mat?.uniforms[key]
        if (!u) continue
        if (Array.isArray(val)) {
          const t = u.value as {
            isVector3?: boolean
            set: (x: number, y: number, z: number) => unknown
            setRGB?: (r: number, g: number, b: number) => unknown
          }
          if (t.isVector3) t.set(val[0], val[1], val[2])
          else t.setRGB?.(val[0], val[1], val[2])
        } else {
          u.value = val
        }
      }
      /* The halo names the atmosphere colour uColor; keep it in sync with
         the earth's uAtmo so one slider moves both. */
      if (key === 'uAtmo' && this.haloMat && Array.isArray(val)) {
        ;(this.haloMat.uniforms.uColor.value as Color).setRGB(val[0], val[1], val[2])
      }
    }
    this.needsDraw = true
    if (!this.running && this.earthMat) {
      this.renderer.render(this.scene, this.camera)
      this.reportMarkers()
    }
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

