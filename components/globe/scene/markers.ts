/**
 * Marker projection with change detection at the source. The projector owns
 * the reusable frame buffer and the last-posted snapshot; an unchanged
 * frame returns null and costs the message channel nothing.
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
