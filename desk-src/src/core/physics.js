// One fixed-timestep scheduler for every simulation in the scene: the earbud cable, the rigid bodies
// (the dropped lighter, the dropped cigarette), the ash flakes. Each system is stepped at 120 Hz
// with the others, in the same order every step; a sleeping system costs nothing. A frame's time is
// clamped (a paused tab, a slow frame: nothing jumps, nothing explodes), and a frame never runs
// more than a few steps to catch up.
//   system: { awake(): boolean, step(h: seconds) }
export const STEP = 1 / 120

export function createPhysics({ step = STEP, maxSteps = 6 } = {}) {
  const systems = []
  let acc = 0
  let steps = 0 // (this frame's, for the overlay)
  const api = {
    add(sys) {
      systems.push(sys)
      return sys
    },
    /** Is anything simulating? (The frame is drawn whole while it is.) */
    get active() {
      for (let i = 0; i < systems.length; i++) if (systems[i].awake()) return true
      return false
    },
    get steps() {
      return steps
    },
    /** How far into the next step the frame's time has gone (0..1): what is drawn is blended
     * between the last two steps by this much, so motion is even at any frame rate. */
    get alpha() {
      return acc / step
    },
    /** Advance by a frame's time (seconds). Returns true while anything moved. */
    update(dt) {
      steps = 0
      if (!api.active) {
        acc = 0
        return false
      }
      acc += Math.min(dt, 0.05)
      while (acc >= step && steps < maxSteps) {
        for (let i = 0; i < systems.length; i++) if (systems[i].awake()) systems[i].step(step)
        acc -= step
        steps++
      }
      if (steps === maxSteps) acc = 0
      return true
    },
    /** Forget the time carried over (after a pause). */
    reset() {
      acc = 0
    },
  }
  return api
}
