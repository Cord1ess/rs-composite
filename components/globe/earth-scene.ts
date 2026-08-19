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
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import {
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
import { makeNoiseTexture } from './textures'
import { TUNE } from './tune'
import { SkyState } from './scene/sky-state'
import { buildCloudMaterial, buildEarthMaterial, buildHaloMaterial } from './scene/materials'
import { loadEarthMaps } from './scene/assets'
import { MarkerProjector } from './scene/markers'

export type { MarkerFrame, ScenePlace } from './scene/markers'

import type { MarkerFrame, ScenePlace } from './scene/markers'

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
  /** Terminal failure: assets unreachable after retry, or a shader refused
      to compile. The owner swaps in the static fallback. */
  onError?: (reason: string) => void
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

  /** The shared uniform table and runtime sky uniforms: see scene/sky-state. */
  private sky = new SkyState()
  /** Marker projection with source-side change detection: scene/markers. */
  private projector = new MarkerProjector()
  /** Cancels in-flight texture fetches when the scene dies mid-load. */
  private aborter = new AbortController()

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
  private glowMesh: Mesh | null = null
  private running = false

  /* Live-tunable motion parameters, seeded from tune.ts. */
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
  /* Time since the last presented frame while only the drift is alive; the
     deck moves ~2 px/s parked, so it repaints at 8 Hz, not display rate. */
  private driftAccum = 0
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
  private errored = false
  private centreWorld = new Vector3()
  private size = new Vector2(1, 1)

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
      /* Loud is not enough: a missing planet is a broken hero. Route the
         failure to the owner so the static fallback takes over. */
      this.fail('shader-compile')
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
    /*
      A failed load used to vanish into a void'd rejection: no ready, no
      error, and after the loader's timeout the page revealed a black hero.
      Now it lands on the owner, who swaps in the static fallback.
    */
    this.load().catch((err) => {
      console.error('[earth-scene] asset load failed; handing over to the fallback.', err)
      this.fail('assets')
    })
  }

  /** Terminal failure funnel: fires the owner's onError exactly once. */
  private fail(reason: string) {
    if (this.disposed || this.errored) return
    this.errored = true
    this.opts.onError?.(reason)
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
    const glow = new Mesh(new PlaneGeometry(half * 2, half * 2), buildHaloMaterial(this.sky))
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
    const maps = await loadEarthMaps({
      clouds: CLOUDS,
      renderer: this.renderer,
      signal: this.aborter.signal,
      onProgress: this.opts.onLoad,
    })
    if (this.disposed) return
    const { lightsMap, landMap, borderMap, cloudMap } = maps

    /* One noise tile serves both materials: the earth's sea state and the
       shell's edge grain. It is generated, so two copies would be identical
       bytes in memory twice. */
    const noiseTex = makeNoiseTexture()

    /* No clouds baked or fetched: the shared amount gates the earth's
       shadow tap to zero as well. */
    if (!cloudMap) this.sky.apply({ uCloudAmt: 0 }, () => undefined)

    const earthMat = buildEarthMaterial(this.sky, { lightsMap, landMap, borderMap, cloudMap, noiseTex })
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
      /* Fewer segments than the earth: the fresnel fade hides the shell's
         silhouette, which is the only place tessellation would show. */
      const shell = new Mesh(
        new SphereGeometry(EARTH_R * 1.006, 96, 72),
        buildCloudMaterial(this.sky, cloudMap, noiseTex),
      )
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
      this.projector.add(place.id, at)

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
      this.sky.dark.value = this.settle
      /*
        Cloud drift. The shell is a child of `world`, so the deck already
        rotates WITH the planet everywhere; the shift is a slip on top of
        that, moving the clouds against the spin (a feature's azimuth is
        rendered + spin - 2 pi shift). The LAG fraction below is the whole
        model: during the tour the deck's absolute rotation is (1 - LAG)
        times the planet's, riding with it just a little slower, and over a
        parked planet (the showcase, the pre-tour hold) the same slip is
        all that moves, a calm sign of life.

        The ramp is the exact ramp the tour itself fades in with, so the
        clouds and the planet start moving together at the entrance. The
        shift is one shared uniform object (sky-state), so this single
        write moves the deck and the shadow it casts together, always.
      */
      if (this.opts.motion) {
        const resting =
          !this.dragging && !this.pendingReturn && !this.returning && this.settle === 0
        const ramp = resting
          ? MathUtils.clamp((this.idleFor - this.resumeAfter) / 1.5, 0, 1)
          : 1
        this.sky.cloudShift.value += dt * ramp * ((this.tourSpin * this.cloudLag) / (2 * Math.PI))
        /*
          The cadence, not a dirty flag. Marking every frame dirty here was
          the bug that silently retired the idle skip: the GPU repainted at
          display rate forever to show a deck that moves two pixels a
          second in the parked showcase. When drift is the only thing
          alive, a repaint every 125 ms is visually identical; any real
          motion (tour, drag, seeks, scroll, pulses) still marks the frame
          dirty itself and renders at full rate.
        */
        this.driftAccum += dt
        if (this.driftAccum >= 0.125) this.needsDraw = true
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
      this.driftAccum = 0
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
    if (this.projector.empty) return
    const frames = this.projector.project(this.world, this.camera, this.centreWorld, this.size)
    if (frames) this.opts.onMarkers(frames)
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
    The live tuning channel. Uniform-keyed values land in the shared table
    (sky-state), which every material reads by reference; $-keys are scene
    level. Renders immediately when the loop is parked, so a slider is
    realtime even before the reveal.
  */
  setTune(values: Record<string, number | [number, number, number]>) {
    this.sky.apply(values, (key, value) => {
      if (key === '$haloZ' && this.glowMesh) this.glowMesh.position.z = value
      else if (key === '$tourSpin') this.tourSpin = value
      else if (key === '$cloudLag') this.cloudLag = value
      else if (key === '$resumeAfter') this.resumeAfter = value
    })
    this.needsDraw = true
    if (!this.running && this.earthMat) {
      this.renderer.render(this.scene, this.camera)
      this.reportMarkers()
    }
  }

  dispose() {
    this.disposed = true
    this.aborter.abort()
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

