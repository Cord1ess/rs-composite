/**
 * The render worker. Owns the EarthScene against an OffscreenCanvas, so all
 * WebGL work happens off the main thread and page scrolling can never contend
 * with rendering.
 *
 * The protocol mirrors the EarthScene surface one to one:
 *
 *   in   init      canvas (transferred), places, originId, motion, dpr,
 *                  width, height, progress
 *   in   progress  the hero scroll value, pushed on change
 *   in   size      resize
 *   in   pointer   down | move | up, with the x coordinate
 *   in   run       start or stop the loop, from the IntersectionObserver
 *   in   dispose   tear down and close the worker
 *   out  load      asset progress 0..1, for the loading screen
 *   out  ready     first complete frame has been drawn
 *   out  markers   screen positions for the DOM markers, each drawn frame
 */

import { EarthScene } from './earth-scene'
import type { ToWorker } from './protocol'

/* Window's postMessage signature demands a targetOrigin; the worker scope's
   does not. One cast at the boundary keeps the rest typed. */
const ctx = self as unknown as {
  postMessage: (message: unknown) => void
  close: () => void
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null
}

let scene: EarthScene | null = null
const progress = { value: 0 }

ctx.onmessage = (event) => {
  const msg = event.data
  switch (msg.type) {
    case 'init':
      progress.value = msg.progress
      scene = new EarthScene({
        canvas: msg.canvas,
        places: msg.places,
        originId: msg.originId,
        motion: msg.motion,
        dpr: msg.dpr,
        getProgress: () => progress.value,
        onMarkers: (frames) => ctx.postMessage({ type: 'markers', frames }),
        onReady: () => ctx.postMessage({ type: 'ready' }),
        onLoad: (value) => ctx.postMessage({ type: 'load', value }),
      })
      /*
        No start() here. Loading, compiling and the single ready frame all
        happen without the loop; the main thread starts the loop at the moment
        the loading screen reveals the canvas. Rendering behind an opaque
        curtain would burn GPU exactly while the page is hydrating, and it
        would also play the arc draw in where nobody can see it.
      */
      scene.setSize(msg.width, msg.height)
      break
    case 'progress':
      progress.value = msg.value
      break
    case 'size':
      scene?.setSize(msg.width, msg.height)
      break
    case 'pointer':
      if (!scene) break
      if (msg.phase === 'down') scene.pointerDown(msg.x)
      else if (msg.phase === 'move') scene.pointerMove(msg.x)
      else scene.pointerUp()
      break
    case 'run':
      if (msg.running) scene?.start()
      else scene?.stop()
      break
    case 'dispose':
      scene?.dispose()
      scene = null
      ctx.close()
      break
  }
}
