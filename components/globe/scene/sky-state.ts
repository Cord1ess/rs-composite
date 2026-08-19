/**
 * The shared uniform table: one `{ value }` object per parameter, built from
 * tune.ts. Every material that declares a name receives the SAME object, so
 * a single write updates every consumer by construction — the class of bug
 * where two materials drift apart (the cloud deck versus the shadow it
 * casts, the sun versus the halo's screen-space sun) cannot exist here.
 *
 * Runtime state that is not a tunable but is shared the same way lives on
 * named fields: the sun vector, its screen-space direction for the halo,
 * the cloud drift phase and the section-darkening factor.
 *
 * Worker-safe: three math types only.
 */

import { Color, Vector2, Vector3 } from 'three'
import { TUNE } from '../tune'

export type TuneValues = Record<string, number | [number, number, number]>

export class SkyState {
  private table = new Map<string, { value: unknown }>()

  /** Unnormalised sun as the tuning panel sees it. */
  readonly sunRaw: Vector3
  /** uSun for the earth and the cloud shell. */
  readonly sun = { value: new Vector3() }
  /** uSunDir for the halo: the sun in screen space. */
  readonly sunDir = { value: new Vector2() }
  /** uCloudShift for the earth and the cloud shell: one write moves the
      deck and the shadow it casts together, always. */
  readonly cloudShift = { value: 0 }
  /** uDark: the section-view darkening, riding the scroll settle. */
  readonly dark = { value: 0 }

  constructor() {
    for (const [key, v] of Object.entries(TUNE)) {
      if (key.startsWith('$')) continue
      this.table.set(key, {
        value: Array.isArray(v) ? new Vector3(v[0], v[1], v[2]) : v,
      })
    }
    this.sunRaw = new Vector3(
      TUNE.$sunX as number,
      TUNE.$sunY as number,
      TUNE.$sunZ as number,
    )
    this.syncSun()
  }

  private syncSun() {
    const s = this.sun.value
    s.copy(this.sunRaw).normalize()
    this.sunDir.value.set(s.x, s.y).normalize()
  }

  /** The shared uniform object for a tunable, by name. Throws on an unknown
      name: a shader declaring a tunable that tune.ts does not know is a
      wiring bug and must fail loudly at build time, not sample garbage. */
  share(name: string): { value: unknown } {
    const u = this.table.get(name)
    if (!u) throw new Error(`sky-state: no tunable named ${name}`)
    return u
  }

  has(name: string): boolean {
    return this.table.has(name)
  }

  /**
   * Apply live tuning values. Sun keys are resolved here (they fan out into
   * uSun and uSunDir); other scene-level $keys are handed back to the owner.
   */
  apply(values: TuneValues, onSceneKey: (key: string, value: number) => void) {
    for (const [key, val] of Object.entries(values)) {
      if (key === '$sunX' || key === '$sunY' || key === '$sunZ') {
        if (key === '$sunX') this.sunRaw.x = val as number
        else if (key === '$sunY') this.sunRaw.y = val as number
        else this.sunRaw.z = val as number
        this.syncSun()
        continue
      }
      if (key.startsWith('$')) {
        onSceneKey(key, val as number)
        continue
      }
      const u = this.table.get(key)
      if (!u) continue
      if (Array.isArray(val)) {
        const t = u.value as Vector3 | Color
        if ((t as Vector3).isVector3) (t as Vector3).set(val[0], val[1], val[2])
        else (t as Color).setRGB(val[0], val[1], val[2])
      } else {
        u.value = val
      }
    }
  }
}
