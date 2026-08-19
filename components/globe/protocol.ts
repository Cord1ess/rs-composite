/**
 * The message protocol between Earth3D on the main thread and the render
 * worker. One definition, imported by both sides, so protocol drift is a
 * compile error instead of a runtime mystery.
 */

import type { ScenePlace, MarkerFrame } from './earth-scene'

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
    }
  | { type: 'progress'; value: number }
  | { type: 'size'; width: number; height: number }
  | { type: 'pointer'; phase: 'down' | 'move' | 'up'; x: number }
  | { type: 'run'; running: boolean }
  | { type: 'tune'; values: Record<string, number | [number, number, number]> }
  | { type: 'dispose' }

export type FromWorker =
  | { type: 'markers'; frames: MarkerFrame[] }
  | { type: 'load'; value: number }
  | { type: 'ready' }
