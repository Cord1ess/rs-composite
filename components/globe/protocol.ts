/**
 * The message protocol between Earth3D on the main thread and the render
 * worker. One definition, imported by both sides, so protocol drift is a
 * compile error instead of a runtime mystery.
 */

import type { ScenePlace, MarkerFrame } from './earth-scene'
import type { EarthBitmaps } from './scene/assets'

export type ToWorker =
  | {
      type: 'init'
      canvas: OffscreenCanvas
      places: ScenePlace[]
      originId: string
      motion: boolean
      dpr: number
      width: number
      height: number
      progress: number
      /* Applied before the first frame; see EarthOptions.tune. */
      tune?: Record<string, number | [number, number, number]>
    }
  | { type: 'progress'; value: number }
  | { type: 'size'; width: number; height: number }
  | { type: 'pointer'; phase: 'down' | 'move' | 'up'; x: number }
  /* Hover hit testing for the route lines. Canvas-relative CSS pixels,
     the same space the marker frames come back in. */
  | { type: 'hover'; x: number; y: number }
  | { type: 'hoverEnd' }
  /* Which place the owner considers active, merged from the DOM markers
     and the scene's own route picks. Lights the marker and its route. */
  | { type: 'active'; id: string | null }
  | { type: 'run'; running: boolean }
  | { type: 'tune'; values: Record<string, number | [number, number, number]> }
  /* The texture bitmaps, fetched on the main thread (where the preload
     cache lives) and transferred in with zero copies. Exactly once. */
  | ({ type: 'assets' } & EarthBitmaps)
  | { type: 'dispose' }

export type FromWorker =
  | { type: 'markers'; frames: MarkerFrame[] }
  /* The route under the pointer changed, null when it left one. */
  | { type: 'route'; id: string | null }
  | { type: 'ready' }
  /* Terminal failure (assets unreachable, shader refused to compile). The
     main thread swaps in the static fallback and releases the loader. */
  | { type: 'error'; reason: string }
