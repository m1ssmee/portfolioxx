// roundRect on 2D canvases and paths arrived in Safari 16 and Firefox 112. The pod's screen,
// wheel print and covers all use it, so older browsers get this small stand-in instead of an
// exception that would take the whole page down.

type Rounded = {
  moveTo(x: number, y: number): void
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void
  closePath(): void
}

function roundRect(this: Rounded, x: number, y: number, w: number, h: number, radii?: number | DOMPointInit | (number | DOMPointInit)[]) {
  const first = Array.isArray(radii) ? radii[0] : radii
  const r0 = typeof first === 'number' ? first : (first?.x ?? 0)
  const r = Math.max(0, Math.min(r0, Math.abs(w) / 2, Math.abs(h) / 2))
  this.moveTo(x + r, y)
  this.arcTo(x + w, y, x + w, y + h, r)
  this.arcTo(x + w, y + h, x, y + h, r)
  this.arcTo(x, y + h, x, y, r)
  this.arcTo(x, y, x + w, y, r)
  this.closePath()
}

for (const proto of [
  globalThis.CanvasRenderingContext2D?.prototype,
  globalThis.Path2D?.prototype,
  globalThis.OffscreenCanvasRenderingContext2D?.prototype,
]) {
  if (proto && !('roundRect' in proto)) Object.defineProperty(proto, 'roundRect', { value: roundRect, configurable: true, writable: true })
}

export {}
