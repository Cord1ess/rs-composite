/**
 * GLSL lint for inline shaders. A shader that fails to compile does not
 * throw: the mesh silently stops drawing, which presents as an art problem
 * rather than a build error. This catches the classes of mistake that have
 * actually happened in this project before they reach a GPU:
 *
 *   - GLSL ES reserved words used as identifiers ("half" and "packed" both
 *     shipped once and rendered as a blank planet)
 *   - duplicate declarations in one shader
 *   - uniforms or varyings used but never declared (a star field shader was
 *     silently black for weeks from exactly this)
 *
 * Scans every TypeScript file under components/ for vertexShader and
 * fragmentShader template literals. Runs in prebuild and npm run lint.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const RESERVED = [
  'half', 'packed', 'input', 'output', 'filter', 'sizeof', 'cast', 'namespace',
  'using', 'this', 'goto', 'inline', 'noinline', 'common', 'partition',
  'active', 'asm', 'class', 'union', 'enum', 'typedef', 'template', 'superp',
]

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (/\.(ts|tsx)$/.test(name)) yield full
  }
}

let failures = 0
let shaderCount = 0

for (const file of walk(join(root, 'components'))) {
  const src = readFileSync(file, 'utf8')
  const shaders = [...src.matchAll(/(vertexShader|fragmentShader):\s*`([\s\S]*?)`/g)]
  for (const [, kind, body] of shaders) {
    shaderCount++
    const where = `${file.replace(root, '.').replaceAll('\\', '/')} ${kind}`
    const clean = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')

    for (const word of RESERVED) {
      if (new RegExp(`\\b${word}\\b`).test(clean)) {
        console.error(`RESERVED WORD "${word}" in ${where}`)
        failures++
      }
    }

    const seen = new Set()
    for (const [, name] of clean.matchAll(/\b(?:float|vec[234]|mat[34])\s+([a-zA-Z_]\w*)\s*=/g)) {
      if (seen.has(name)) {
        console.error(`DUPLICATE DECLARATION "${name}" in ${where}`)
        failures++
      }
      seen.add(name)
    }

    const declared = new Set(
      [...clean.matchAll(/\b(?:uniform|varying)\s+\w+\s+(\w+)/g)].map((m) => m[1]),
    )
    for (const name of new Set([...clean.matchAll(/\b([uv][A-Z]\w*)\b/g)].map((m) => m[1]))) {
      if (!declared.has(name)) {
        console.error(`UNDECLARED "${name}" in ${where}`)
        failures++
      }
    }
  }
}

if (failures > 0) {
  console.error(`\nshader lint: ${failures} problem(s) across ${shaderCount} shaders`)
  process.exit(1)
}
console.log(`shader lint: ${shaderCount} shaders clean`)
