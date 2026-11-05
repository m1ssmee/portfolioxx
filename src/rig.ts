// Shared mutable state between React and the render loop.
// React writes to it from event handlers; the 3D scene reads it every frame.

export type Zone = 'menu' | 'next' | 'play' | 'prev'

export const rig = {
  panelEl: null as HTMLElement | null, // projector panel, when open
  beamEl: null as SVGPolygonElement | null,

  /** pointer: normalised 0..1 position, client px, and frames since it last moved */
  pointer: { x: 0.5, y: 0.5, cx: -1, cy: -1, moved: 0 },
  reducedMotion: false,

  // impulses for the pod's spring (consumed by the scene each frame)
  kickYaw: 0,
  kickPitch: 0,
  kickY: 0,
  // impulse for the earphone cable
  gust: 0,

  /** a pointer is down on the click wheel or an earbud, so touch swipes must not scroll */
  busy: false,
  /** which part of the wheel looks pressed, for the press animation */
  pressed: null as Zone | 'center' | null,
  /** 0..1: the port glows while a loose plug hovers near it */
  portGlow: 0,

  /** Called on every scroll detent. dir is +1 / -1. */
  kick(dir: number, strength = 1) {
    const s = (this.reducedMotion ? 0.3 : 1) * strength * Math.sign(dir)
    this.kickPitch += 0.011 * s
    this.kickYaw += 0.008 * s
    this.kickY -= 0.0035 * s
    this.gust += s
  },

  /** Button press: a small push into the screen. */
  bump() {
    this.kickPitch -= this.reducedMotion ? 0.002 : 0.006
  },
}
