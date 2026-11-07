// Smoke, entirely on the GPU. Two layers:
//  - ribbon strands: every vertex finds where the smoke it carries has got to by integrating its
//    own path from the moment it left the ember (its birth time) through a drifting curl-noise
//    field: laminar near the ember (no noise), turbulent higher up (noise grows with age);
//  - haze: stateless soft points (position = f(birth time, seed, time)) for the diffuse haze above.
// The emitter's position and the pointer's past (position, velocity, strength) are kept in a small
// history texture, so smoke that has left stays where it went, and a stir leaves eddies that last.
import * as THREE from 'three'
import { glsl } from '../core/glsl.js'
import NOISE from '../shaders/smokeNoise.glsl'
import smokeFlowGlsl from '../shaders/smokeFlow.glsl'
import SHADE from '../shaders/smokeLight.glsl'
import DEPTHFADE from '../shaders/depthFade.glsl'
import smokeVert from '../shaders/smoke.vert'
import smokeFrag from '../shaders/smoke.frag'
import hazeVert from '../shaders/haze.vert'
import hazeFrag from '../shaders/haze.frag'

export const HISTORY = 512 // samples, at 30 Hz: 17 s of the past (longer than any smoke lives)
export const HZ = 30

const FLOW = glsl(smokeFlowGlsl, { smokeNoise: NOISE, HZ: HZ.toFixed(1), HISTORY: HISTORY.toFixed(1) })

/** The ribbon strands: (strands) x (segments) quads, each vertex its height along the strand. */
function ribbonGeometry(strands, segs) {
  const n = strands * (segs + 1) * 2
  const s = new Float32Array(n)
  const side = new Float32Array(n)
  const seed = new Float32Array(n)
  const idx = []
  let o = 0
  for (let k = 0; k < strands; k++) {
    const sd = k / strands + 0.37 * Math.sin(k * 12.9898)
    for (let i = 0; i <= segs; i++) {
      for (const sg of [-1, 1]) {
        s[o] = i / segs
        side[o] = sg
        seed[o] = sd
        o++
      }
      if (i < segs) {
        const a = (k * (segs + 1) + i) * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('aS', new THREE.BufferAttribute(s, 1))
  g.setAttribute('aSide', new THREE.BufferAttribute(side, 1))
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  // (a position attribute three.js can count; the shader makes the real ones)
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
  g.setIndex(idx)
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5)
  return g
}

function hazeGeometry(count) {
  const seed = new Float32Array(count * 4)
  let r = 7
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < count * 4; i++) seed[i] = rnd()
  const g = new THREE.BufferGeometry()
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4))
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5)
  return g
}

/** The smoke: its ribbons and its haze. q: the strands, segments, steps and haze count to use. */
export function createSmoke(q, uniformsShared) {
  const U = uniformsShared
  const blend = {
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  }
  const ribbonMat = new THREE.ShaderMaterial({
    defines: { STEPS: q.smokeSteps, STRANDS: q.strands.toFixed(1), SEGMENTS: q.segments.toFixed(1) },
    uniforms: U,
    vertexShader: glsl(smokeVert, { smokeFlow: FLOW, smokeLight: SHADE }),
    fragmentShader: glsl(smokeFrag, { depthFade: DEPTHFADE }),
    side: THREE.DoubleSide,
    ...blend,
  })
  const ribbons = new THREE.Mesh(ribbonGeometry(q.strands, q.segments), ribbonMat)
  ribbons.frustumCulled = false

  const hazeMat = new THREE.ShaderMaterial({
    defines: { STEPS: Math.max(4, q.smokeSteps - 4), HAZE_K: (900 / q.haze).toFixed(3) },
    uniforms: U,
    vertexShader: glsl(hazeVert, { smokeFlow: FLOW, smokeLight: SHADE }),
    fragmentShader: glsl(hazeFrag, { depthFade: DEPTHFADE }),
    ...blend,
  })
  const haze = new THREE.Points(hazeGeometry(q.haze), hazeMat)
  haze.frustumCulled = false
  return { ribbons, haze, dispose: () => [ribbons.geometry, haze.geometry, ribbonMat, hazeMat].forEach((x) => x.dispose()) }
}

/**
 * The history: a ring of samples written at 30 Hz (emitter position and whether it burns; the
 * pointer's position and strength; its velocity). Allocation-free after construction.
 */
export class SmokeHistory {
  constructor() {
    // (half floats: linear filtering of them works everywhere, unlike full floats)
    this.data = new Uint16Array(HISTORY * 3 * 4)
    this.tex = new THREE.DataTexture(this.data, HISTORY, 3, THREE.RGBAFormat, THREE.HalfFloatType)
    this.tex.wrapS = THREE.RepeatWrapping
    this.tex.wrapT = THREE.ClampToEdgeWrapping
    this.tex.magFilter = this.tex.minFilter = THREE.LinearFilter
    this.tex.needsUpdate = true
    this.slot = 0
    this.t = 0
  }
  /** Fill every slot (at start, or after a long pause). */
  fill(src, alive) {
    for (let i = 0; i < HISTORY; i++) this.write(i, src, alive, null, 0, null)
    this.tex.needsUpdate = true
  }
  write(i, src, alive, ptr, strength, vel, puff = 0) {
    const d = this.data
    const h = THREE.DataUtils.toHalfFloat
    let o = i * 4
    d[o] = h(src[0])
    d[o + 1] = h(src[1])
    d[o + 2] = h(src[2])
    d[o + 3] = h(alive)
    o = (HISTORY + i) * 4
    if (ptr) {
      d[o] = h(ptr[0])
      d[o + 1] = h(ptr[1])
      d[o + 2] = h(ptr[2])
    }
    d[o + 3] = h(strength)
    o = (2 * HISTORY + i) * 4
    d[o] = h(vel ? vel[0] : 0)
    d[o + 1] = h(vel ? vel[1] : 0)
    d[o + 2] = h(vel ? vel[2] : 0)
    d[o + 3] = h(puff)
  }
  /** Advance by dt (s): new samples every 1/30 s. Returns the fractional head for the shader. */
  advance(dt, src, alive, ptr, strength, vel, puff = 0) {
    this.t += dt * HZ
    let wrote = false
    while (this.t >= 1) {
      this.t -= 1
      this.slot = (this.slot + 1) % HISTORY
      this.write(this.slot, src, alive, ptr, strength, vel, puff)
      wrote = true
    }
    // (the current slot always holds the newest state)
    this.write(this.slot, src, alive, ptr, strength, vel, puff)
    if (wrote || strength > 0 || puff > 0) this.tex.needsUpdate = true
    // (the newest sample is at the head; older ones behind it: never read across the head)
    return this.slot
  }
  dispose() {
    this.tex.dispose()
  }
}
