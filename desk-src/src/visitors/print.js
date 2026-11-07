// A visitor's thumbprint, drawn from a number (its seed): not anyone's real finger, but one of a
// kind, as a print is. A whorl, a loop or an arch of ridges with their breaks and ends, inside the
// pad of a thumb, the ink heavier at the middle and fading at the edge; `press` (0.5..1) how hard it
// was pressed. Returns SVG markup (viewBox 60 x 76, the pad's centre at the middle).
export const INKS = [
  { name: 'Indigo', color: '#2c3170' },
  { name: 'Oxblood', color: '#7b2233' },
  { name: 'Forest', color: '#1f5a49' },
  { name: 'Graphite', color: '#3b3d42' },
  { name: 'Violet', color: '#5b2fc9' },
]

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let uid = 0
export function printSvg(seed, ink = 0, press = 0.8) {
  const r = rng(seed)
  const color = (INKS[ink] || INKS[0]).color
  const kind = Math.floor(r() * 3) // 0 whorl, 1 loop, 2 arch
  const tilt = (r() - 0.5) * 0.5
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28]
  const cx = (r() - 0.5) * 6
  const cy = (r() - 0.5) * 8 - 3
  // the pad: an egg, a little narrower at the tip
  const inPad = (x, y) => {
    const ry = y < 0 ? 33 : 30
    const rx = 23 * (y < 0 ? 0.92 + 0.08 * (1 + y / 33) : 1)
    return (x * x) / (rx * rx) + (y * y) / (ry * ry) < 1
  }
  const paths = []
  const ridges = 17
  for (let k = 0; k < ridges; k++) {
    const a = 1.6 + k * 1.9
    let d = ''
    let open = false
    // (each ridge breaks once or twice: where, and how long)
    const gaps = [[r() * 6.28, 0.12 + r() * 0.25], [r() * 6.28, r() < 0.5 ? 0.1 + r() * 0.2 : 0]]
    const steps = 90
    for (let i = 0; i <= steps; i++) {
      const th = (i / steps) * Math.PI * 2
      if (gaps.some(([g, len]) => Math.abs(((th - g + 9.42) % 6.28) - 3.14) < len)) {
        open = false
        continue
      }
      const wob = 1 + 0.07 * Math.sin(2 * th + ph[0]) + 0.04 * Math.sin(3 * th + ph[1]) + 0.025 * Math.sin(5 * th + ph[2] + k * 0.3)
      let x = Math.cos(th) * a * wob
      let y = Math.sin(th) * a * 1.25 * wob
      if (kind === 1) {
        // a loop: the ridges open downwards and to one side, the core high
        x += k * 0.55
        if (y > 0) y *= 0.55 + 0.02 * k
      } else if (kind === 2) {
        // an arch: the ridges flattened into waves across the pad
        y = y * 0.35 - k * 1.1 + 10 + Math.sin(x * 0.18 + ph[0]) * 1.5
      }
      // turned a little, moved to the core
      const xr = x * Math.cos(tilt) - y * Math.sin(tilt) + cx
      const yr = x * Math.sin(tilt) + y * Math.cos(tilt) + cy
      if (!inPad(xr, yr)) {
        open = false
        continue
      }
      d += `${open ? 'L' : 'M'}${xr.toFixed(2)} ${yr.toFixed(2)}`
      open = true
    }
    if (d) paths.push(`<path d="${d}" stroke-opacity="${(0.62 + r() * 0.3).toFixed(2)}"/>`)
  }
  const id = `pf${++uid}`
  const core = (0.55 + 0.45 * press).toFixed(2)
  return `<svg viewBox="-30 -38 60 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="${id}g" cx="0" cy="-2" r="34" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="${core}"/><stop offset="0.72" stop-color="#fff" stop-opacity="${(core * 0.75).toFixed(2)}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="${id}m"><rect x="-30" y="-38" width="60" height="76" fill="url(#${id}g)"/></mask></defs><g mask="url(#${id}m)" fill="none" stroke="${color}" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">${paths.join('')}</g></svg>`
}
