// Shared state between React and the animation loop (earphones + device motion).
// React writes to it; the loop in earphones.ts reads it every frame.

export const rig = {
  frameEl: null as HTMLElement | null, // untransformed box the pod sits in
  deviceEl: null as HTMLElement | null, // the pod itself, receives the transform
  screenEl: null as HTMLElement | null,
  panelEl: null as HTMLElement | null, // projector panel, when open
  beamEl: null as SVGPolygonElement | null,

  pointer: { x: 0.5, y: 0.5, px: -9999, py: -9999, moved: 0 },
  reducedMotion: false,

  // device spring (px, px, degrees)
  ox: 0,
  oy: 0,
  rot: 0,
  vox: 0,
  voy: 0,
  vrot: 0,

  // impulses waiting to be applied to the cable
  gust: 0,

  /** Called on every scroll detent. dir is +1 / -1. */
  kick(dir: number, strength = 1) {
    const s = this.reducedMotion ? 0.3 : strength
    this.voy += 1.6 * s * Math.sign(dir)
    this.vrot += 0.22 * s * Math.sign(dir)
    this.gust += dir * s
  },

  /** Button press: a small downward bump. */
  bump() {
    this.voy += this.reducedMotion ? 0.4 : 1.4
  },
}
