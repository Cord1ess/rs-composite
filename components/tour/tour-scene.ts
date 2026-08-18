/**
 * The facility tour: a 360 panorama viewer. Plain three.js, one sphere seen
 * from inside, following the same rules as the globe scene: dynamic import
 * only, animations on a single loop, frames rendered only when the picture
 * would change, DOM input arriving through public methods.
 *
 * The panorama itself is swappable: pass `src` for a real equirectangular
 * photo, omit it for the generated placeholder hall.
 */

import {
  CanvasTexture,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { TourSpot } from '@/content/tour'

export type SpotFrame = { id: string; x: number; y: number; visible: boolean }

export type TourOptions = {
  canvas: HTMLCanvasElement
  spots: TourSpot[]
  /** False under prefers-reduced-motion: no auto look-around. */
  motion: boolean
  /** Equirectangular panorama URL. Omitted: the placeholder hall. */
  src?: string
  onFrames: (frames: SpotFrame[]) => void
  onReady: () => void
}

const FOV = 72
/** Radians per second of idle look-around. */
const AUTO_SPIN = 0.035
const RESUME_AFTER = 4
const PITCH_LIMIT = MathUtils.degToRad(55)

function toDirection(yawDeg: number, pitchDeg: number, out: Vector3): Vector3 {
  const yaw = MathUtils.degToRad(yawDeg)
  const pitch = MathUtils.degToRad(pitchDeg)
  return out.set(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  )
}

/*
  The placeholder: a stylized factory hall drawn straight onto a canvas.
  Columns, a window band, machine masses on the floor line and a faint accent
  horizon, watermarked so nobody mistakes it for the real shoot. Costs nothing
  to download because it never is downloaded.
*/
function placeholderPanorama(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 2048
  c.height = 1024
  const ctx = c.getContext('2d')!

  const sky = ctx.createLinearGradient(0, 0, 0, 1024)
  sky.addColorStop(0, '#060908')
  sky.addColorStop(0.4, '#0d1611')
  sky.addColorStop(0.5, '#152219')
  sky.addColorStop(0.6, '#0c130f')
  sky.addColorStop(1, '#050807')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 2048, 1024)

  /* Accent horizon, very faint. */
  const horizon = ctx.createLinearGradient(0, 492, 0, 540)
  horizon.addColorStop(0, 'rgba(240, 184, 73, 0)')
  horizon.addColorStop(0.5, 'rgba(240, 184, 73, 0.14)')
  horizon.addColorStop(1, 'rgba(240, 184, 73, 0)')
  ctx.fillStyle = horizon
  ctx.fillRect(0, 492, 2048, 48)

  /* Window band up near the ceiling. */
  for (let i = 0; i < 16; i++) {
    const x = i * 128 + 22
    ctx.fillStyle = i % 2 ? 'rgba(190, 235, 210, 0.10)' : 'rgba(190, 235, 210, 0.16)'
    ctx.fillRect(x, 236, 84, 58)
  }

  /* Columns. */
  for (let i = 0; i < 12; i++) {
    const x = Math.round(i * 170.7)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)'
    ctx.fillRect(x, 296, 20, 400)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.fillRect(x + 20, 296, 3, 400)
  }

  /* Machine masses along the floor line, deterministic pseudo-random. */
  let seed = 42
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let x = 0; x < 2048; x += 90) {
    const h = 40 + rand() * 70
    const w = 50 + rand() * 34
    ctx.fillStyle = `rgba(${18 + rand() * 14}, ${26 + rand() * 16}, ${22 + rand() * 12}, 0.9)`
    ctx.fillRect(x + rand() * 20, 560 - h * 0.2, w, h)
  }

  /* Floor sheen lines. */
  ctx.fillStyle = 'rgba(255, 255, 255, 0.045)'
  for (const y of [700, 780, 872, 960]) ctx.fillRect(0, y, 2048, 1.5)

  /* The honesty stamp, four times around the horizon. */
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.textAlign = 'center'
  for (let i = 0; i < 4; i++) {
    ctx.fillText('PLACEHOLDER 360 PANORAMA', 256 + i * 512, 470)
  }

  return c
}

export class TourScene {
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera: PerspectiveCamera

  private yaw = 0
  private pitch = 0
  private yawVelocity = 0
  private idleFor = 0
  private dragging = false
  private paused = false
  private lastX = 0
  private lastY = 0
  private lastTime = 0

  private lastDrawnYaw = Infinity
  private lastDrawnPitch = Infinity
  private needsDraw = true

  private spotDirs: { id: string; dir: Vector3 }[]
  private frameBuf: SpotFrame[]
  private lookTarget = new Vector3()
  private projected = new Vector3()
  private width = 1
  private height = 1

  private opts: TourOptions
  private disposed = false

  constructor(opts: TourOptions) {
    this.opts = opts

    this.renderer = new WebGLRenderer({
      canvas: opts.canvas,
      antialias: true,
      stencil: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))

    this.camera = new PerspectiveCamera(FOV, 1, 0.1, 120)

    this.spotDirs = opts.spots.map((s) => ({
      id: s.id,
      dir: toDirection(s.yaw, s.pitch, new Vector3()).multiplyScalar(46),
    }))
    this.frameBuf = opts.spots.map((s) => ({ id: s.id, x: 0, y: 0, visible: false }))

    void this.load()
  }

  private async load() {
    const material = new MeshBasicMaterial()
    if (this.opts.src) {
      const tex = await new TextureLoader().loadAsync(this.opts.src)
      if (this.disposed) return
      tex.colorSpace = SRGBColorSpace
      tex.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 4)
      material.map = tex
    } else {
      const tex = new CanvasTexture(placeholderPanorama())
      tex.colorSpace = SRGBColorSpace
      tex.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 4)
      material.map = tex
    }

    /* Inverted sphere: the texture faces inward. */
    const geometry = new SphereGeometry(50, 64, 40)
    geometry.scale(-1, 1, 1)
    this.scene.add(new Mesh(geometry, material))

    try {
      await this.renderer.compileAsync(this.scene, this.camera)
    } catch {
      /* onShaderError reports; keep the section alive. */
    }
    if (this.disposed) return
    this.needsDraw = true
    this.opts.onReady()
  }

  /* ----------------------------------------------------------- pointer */

  pointerDown(x: number, y: number) {
    this.dragging = true
    this.lastX = x
    this.lastY = y
    this.idleFor = 0
    this.start()
  }

  pointerMove(x: number, y: number) {
    if (!this.dragging) return
    const dx = x - this.lastX
    const dy = y - this.lastY
    this.lastX = x
    this.lastY = y
    this.yaw -= dx * 0.14
    this.pitch = MathUtils.clamp(
      this.pitch + dy * 0.12,
      -MathUtils.radToDeg(PITCH_LIMIT),
      MathUtils.radToDeg(PITCH_LIMIT),
    )
    this.yawVelocity = -dx * 1.6
  }

  pointerUp() {
    this.dragging = false
    this.idleFor = 0
  }

  /** An open popup holds the view still. */
  setPaused(paused: boolean) {
    this.paused = paused
    this.idleFor = 0
  }

  /* ------------------------------------------------------------- frame */

  private frame = (time: number) => {
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.05) : 0.016
    this.lastTime = time

    if (!this.dragging) {
      this.yawVelocity *= Math.pow(0.02, dt)
      this.yaw += this.yawVelocity * dt
      this.idleFor += dt
      if (this.opts.motion && !this.paused) {
        this.yaw +=
          MathUtils.radToDeg(AUTO_SPIN) *
          MathUtils.clamp((this.idleFor - RESUME_AFTER) / 2, 0, 1) *
          dt
      }
    }

    const dirty =
      this.needsDraw ||
      Math.abs(this.yaw - this.lastDrawnYaw) > 0.002 ||
      Math.abs(this.pitch - this.lastDrawnPitch) > 0.002
    if (dirty) {
      this.needsDraw = false
      this.lastDrawnYaw = this.yaw
      this.lastDrawnPitch = this.pitch
      toDirection(this.yaw, this.pitch, this.lookTarget)
      this.camera.lookAt(this.lookTarget)
      this.renderer.render(this.scene, this.camera)
      this.reportSpots()
    }
  }

  private reportSpots() {
    for (let i = 0; i < this.spotDirs.length; i++) {
      const spot = this.spotDirs[i]
      const frame = this.frameBuf[i]
      this.projected.copy(spot.dir).project(this.camera)
      const x = (this.projected.x + 1) / 2
      const y = (-this.projected.y + 1) / 2
      /* project() puts points behind the camera at |z| > 1. */
      const inFront = this.projected.z < 1
      frame.x = x * this.width
      frame.y = y * this.height
      frame.visible = inFront && x > 0.03 && x < 0.97 && y > 0.05 && y < 0.95
    }
    this.opts.onFrames(this.frameBuf)
  }

  /* ------------------------------------------------------------ public */

  setSize(width: number, height: number) {
    if (width === 0 || height === 0) return
    this.width = width
    this.height = height
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
    this.needsDraw = true
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
    this.scene.traverse((obj) => {
      const mesh = obj as Mesh
      mesh.geometry?.dispose?.()
      const material = mesh.material as MeshBasicMaterial | undefined
      material?.map?.dispose?.()
      material?.dispose?.()
    })
    this.renderer.dispose()
  }
}
