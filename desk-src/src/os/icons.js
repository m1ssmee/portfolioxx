// Pod OS's icons: one family, drawn on one 24-unit grid with 1.5 px round-capped strokes and no
// fills, so every glyph has the same weight. Each is a list of SVG path strings: the same data
// makes the inline sprite (the DOM) and Path2D shapes (the screen texture).
const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`

export const ICONS = {
  back: ['M14.5 6l-6 6 6 6'],
  copy: ['M9 9.5A1.5 1.5 0 0 1 10.5 8h7A1.5 1.5 0 0 1 19 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 9 17.5z', 'M15 5.5A1.5 1.5 0 0 0 13.5 4h-7A1.5 1.5 0 0 0 5 5.5v8A1.5 1.5 0 0 0 6.5 15'],
  out: ['M13 5h6v6', 'M19 5l-8 8', 'M17 14v3.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 5 17.5v-9A1.5 1.5 0 0 1 6.5 7H10'],
  // (the status bar's: music playing, earbuds plugged in)
  bars: ['M8 10v4', 'M12 7.5v9', 'M16 9.5v5'],
  buds: [circle(8, 9, 2.75), circle(16, 9, 2.75), 'M8 11.75V18', 'M16 11.75V18'],
}

/** The sprite: one inline <svg> of <symbol>s, used with <svg><use href="#pos-i-NAME"/></svg>. */
export function iconSprite() {
  const syms = Object.entries(ICONS)
    .map(([k, ds]) => `<symbol id="pos-i-${k}" viewBox="0 0 24 24">${ds.map((d) => `<path d="${d}"/>`).join('')}</symbol>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${syms}</svg>`
}

/** One icon as an inline <svg> (stroke 1.5 px whatever its size). */
export function icon(name, size = 24, cls = '') {
  return `<svg class="pos-ic ${cls}" data-ic="${name}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#pos-i-${name}"/></svg>`
}

const paths = new Map()
/** The icon's shapes as Path2D (made once). */
export function iconPaths(name) {
  let p = paths.get(name)
  if (!p) {
    p = (ICONS[name] || []).map((d) => new Path2D(d))
    paths.set(name, p)
  }
  return p
}
