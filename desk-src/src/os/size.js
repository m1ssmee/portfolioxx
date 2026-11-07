// Pod OS's sizes, shared by the OS and the scene (which builds the texture before the OS boots).
// The logical screen is the player's glass (59.1 x 62.9 mm), 360 px wide; the texture is 800 px wide
// (13.5 px per mm). The glass in the design's units (objects/player.js: 0.1 mm each): x 36..627,
// y 36..665; its camera at (106, 106).
export const OS_W = 360
export const OS_H = 383
export const TEX_W = 800
export const TEX_H = Math.round((TEX_W * OS_H) / OS_W)
export const GLASS = { x0: 36, y0: 36, w: 591, h: 629 }
/** The glass's corner radius (logical px): os.css's .pos border-radius. */
export const GLASS_R = 43
/** The display's black border inside the glass (logical px). */
export const BEZEL = 5
