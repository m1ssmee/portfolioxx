// What this device's graphics can take.
//
// 'high' gets the full look: real refracting glass, contact-hardening soft shadows and multisampled
// edges. 'low' keeps the same scene with cheaper versions of those, which is what most office
// laptops (built-in Intel or AMD graphics), phones and software renderers need. A device that turns
// out to struggle is moved down to 'low' for the rest of the visit.

export type Tier = 'high' | 'low'

export type Gpu = {
  webgl2: boolean // three.js needs WebGL 2
  webgl1: boolean // only checked when WebGL 2 is missing, to tell "old browser" from "3D switched off"
  renderer: string
  tier: Tier
  forced: boolean // set with ?gpu=high or ?gpu=low; then it stays put
}

const KEY = 'pod-gpu'

export function checkGpu(): Gpu {
  let webgl2 = false
  let webgl1 = false
  let renderer = ''
  try {
    const gl = document.createElement('canvas').getContext('webgl2', { powerPreference: 'high-performance' })
    if (gl) {
      webgl2 = true
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '')
      gl.getExtension('WEBGL_lose_context')?.loseContext() // don't keep a context alive just for the test
    } else {
      const g1 = document.createElement('canvas').getContext('webgl')
      webgl1 = !!g1
      g1?.getExtension('WEBGL_lose_context')?.loseContext()
    }
  } catch {
    /* no WebGL at all */
  }
  const forced = new URLSearchParams(window.location.search).get('gpu')
  if (forced === 'high' || forced === 'low') return { webgl2, webgl1, renderer, tier: forced, forced: true }
  return { webgl2, webgl1, renderer, tier: pickTier(renderer), forced: false }
}

function pickTier(renderer: string): Tier {
  try {
    if (sessionStorage.getItem(KEY) === 'low') return 'low'
  } catch {
    /* storage blocked: decide from the hardware */
  }
  if (window.matchMedia('(pointer: coarse)').matches) return 'low' // phones and tablets
  const r = renderer.toLowerCase()
  if (/swiftshader|llvmpipe|softpipe|software|basic render/.test(r)) return 'low'
  if (/intel/.test(r) && !/\barc\b/.test(r)) return 'low' // built-in Intel graphics (Arc cards are discrete)
  if (/radeon\(tm\) graphics|radeon graphics|vega \d+ graphics|radeon r[2-7] graphics/.test(r)) return 'low' // AMD laptop chips
  if (/mali|adreno|powervr|videocore/.test(r)) return 'low'
  return 'high'
}

/** Start light on the next load too, for the rest of this visit. */
export function rememberLowTier() {
  try {
    sessionStorage.setItem(KEY, 'low')
  } catch {
    /* fine: the in-memory switch still happens */
  }
}

export function forgetLowTier() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* nothing to forget */
  }
}
