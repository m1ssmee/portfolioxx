// Scene layout in world units. The pod is 1 unit tall and 0.6 wide.
// The camera moves back or forward so the pod keeps the same share of the screen at any size.

export const FOV = 25 // vertical field of view: a long lens, like a product shot
export const FLOOR = -0.64
export const WALL = -1.05
export const SWEEP_R = 0.75 // radius of the curve where the floor meets the wall
export const POD_Y = -0.02
export const CAM_Y = -0.17

const T = Math.tan((FOV * Math.PI) / 360)

/** Distance from camera to the pod's plane so the pod fills about 64% of the height (78% of the width on tall screens). */
export function cameraDistance(aspect: number) {
  const byHeight = 1 / 0.64 / (2 * T)
  const byWidth = 0.6 / 0.78 / (2 * T * aspect)
  return Math.max(byHeight, byWidth)
}

/** Half the visible width at depth z, for a camera at distance d. */
export function halfWidth(d: number, aspect: number, z = 0) {
  return (d - z) * T * aspect
}

export type Layout = {
  d: number
  split: boolean // projects open on a wide screen: the camera pans so the pod sits left and the albums right
  panX: number // camera offset; the pod itself never moves, so the cable isn't dragged around
  albumsX: number // world x of the album in front
  halfW: number
}

export function layoutFor(aspect: number, wantSplit: boolean): Layout {
  const d = cameraDistance(aspect)
  const halfW = halfWidth(d, aspect)
  const split = wantSplit && aspect > 1.15
  const panX = split ? halfW * 0.52 : 0
  return { d, split, panX, albumsX: panX + halfW * 0.36, halfW }
}
