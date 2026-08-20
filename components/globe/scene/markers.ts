/**
 * Marker projection with change detection at the source, and the route
 * picker that answers "which line is under the pointer".
 *
 * Both live here because they are the same concern: taking scene geometry
 * into screen space, which only the side that owns the camera can do.
 */

import { MathUtils, Vector2, Vector3 } from 'three'
import type { Camera, Object3D } from 'three'

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

export class MarkerProjector {
  private markers: { id: string; position: Vector3 }[] = []
  private frameBuf: MarkerFrame[] = []
  private lastSent: { x: number; y: number; fade: number; visible: boolean }[] | null = null
  private projected = new Vector3()
  private rel = new Vector3()

  get empty(): boolean {
    return this.markers.length === 0
  }

  add(id: string, position: Vector3) {
    this.markers.push({ id, position })
    this.frameBuf.push({ id, x: 0, y: 0, visible: false, fade: 0 })
  }

  /**
   * Project every marker into screen space. Returns the frame buffer when
   * anything moved past the thresholds (0.5 px, 2% fade), null otherwise.
   * The returned array is reused: consume it synchronously.
   */
  project(
    world: Object3D,
    camera: Camera,
    centreWorld: Vector3,
    size: Vector2,
  ): MarkerFrame[] | null {
    if (!this.markers.length) return null

    for (let i = 0; i < this.markers.length; i++) {
      const m = this.markers[i]
      const frame = this.frameBuf[i]
      this.projected.copy(m.position)
      world.localToWorld(this.projected)
      /* Facing test is against the sphere's own centre, which the crop
         moves a long way from the origin. */
      const relZ = this.rel.copy(this.projected).sub(centreWorld).normalize().z
      this.projected.project(camera)
      const x = (this.projected.x + 1) / 2
      const y = (-this.projected.y + 1) / 2
      frame.x = x * size.x
      frame.y = y * size.y
      /* Fade across the last degrees before the limb instead of switching. */
      frame.fade =
        x > 0.01 && x < 0.99 && y > 0.01 && y < 0.99
          ? MathUtils.clamp((relZ - 0.04) / 0.12, 0, 1)
          : 0
      frame.visible = frame.fade > 0.01
    }

    if (!this.lastSent) {
      /* Allocated once; fade -1 guarantees the first frame always posts. */
      this.lastSent = this.frameBuf.map(() => ({ x: 0, y: 0, fade: -1, visible: false }))
    } else {
      let changed = false
      for (let i = 0; i < this.frameBuf.length; i++) {
        const f = this.frameBuf[i]
        const s = this.lastSent[i]
        if (
          f.visible !== s.visible ||
          Math.abs(f.x - s.x) > 0.5 ||
          Math.abs(f.y - s.y) > 0.5 ||
          Math.abs(f.fade - s.fade) > 0.02
        ) {
          changed = true
          break
        }
      }
      if (!changed) return null
    }

    for (let i = 0; i < this.frameBuf.length; i++) {
      const f = this.frameBuf[i]
      const s = this.lastSent[i]
      s.x = f.x
      s.y = f.y
      s.fade = f.fade
      s.visible = f.visible
    }
    return this.frameBuf
  }
}

/**
 * Which route lies under the pointer.
 *
 * Screen space, not a raycast. The tubes are a thousandth of a radius thick,
 * so a ray through the actual geometry would demand pixel-perfect aim; and a
 * fattened invisible hit tube would cost a second set of geometry and still
 * give a tolerance that changes with zoom. Projecting each route's polyline
 * and measuring the pointer's distance to it gives a hit area of a fixed
 * number of screen pixels at every distance, which is what a pointer
 * actually wants.
 */
export class RoutePicker {
  private routes: { id: string; pts: Vector3[] }[] = []
  private world = new Vector3()
  private rel = new Vector3()
  /** Projected samples, reused: [x, y] pairs, NaN where the sample faces
      away from the camera and must not join a segment. */
  private flat: number[] = []

  add(id: string, points: Vector3[]) {
    this.routes.push({ id, pts: points })
    if (points.length * 2 > this.flat.length) this.flat.length = points.length * 2
  }

  /**
   * The nearest route within `tolerance` screen pixels of (px, py), or null.
   * Samples on the far side of the globe are excluded, so a line visible
   * only through the planet can never be picked.
   */
  pick(
    world: Object3D,
    camera: Camera,
    centreWorld: Vector3,
    size: Vector2,
    px: number,
    py: number,
    tolerance: number,
  ): string | null {
    let bestId: string | null = null
    let bestDist = tolerance

    for (const route of this.routes) {
      const pts = route.pts
      for (let i = 0; i < pts.length; i++) {
        this.world.copy(pts[i])
        world.localToWorld(this.world)
        /* Facing test against the sphere's own centre, which the crop moves
           a long way from the origin. */
        const relZ = this.rel.copy(this.world).sub(centreWorld).normalize().z
        if (relZ < -0.02) {
          this.flat[i * 2] = NaN
          continue
        }
        this.world.project(camera)
        this.flat[i * 2] = ((this.world.x + 1) / 2) * size.x
        this.flat[i * 2 + 1] = ((-this.world.y + 1) / 2) * size.y
      }

      /* Distance to each visible segment, not just to the samples: at this
         sampling density the gaps between samples are tens of pixels wide
         and would otherwise be dead zones. */
      for (let i = 0; i < pts.length - 1; i++) {
        const ax = this.flat[i * 2]
        const bx = this.flat[i * 2 + 2]
        if (Number.isNaN(ax) || Number.isNaN(bx)) continue
        const ay = this.flat[i * 2 + 1]
        const by = this.flat[i * 2 + 3]
        const dx = bx - ax
        const dy = by - ay
        const lenSq = dx * dx + dy * dy
        let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0
        t = t < 0 ? 0 : t > 1 ? 1 : t
        const ex = px - (ax + t * dx)
        const ey = py - (ay + t * dy)
        const dist = Math.hypot(ex, ey)
        if (dist < bestDist) {
          bestDist = dist
          bestId = route.id
        }
      }
    }
    return bestId
  }
}
