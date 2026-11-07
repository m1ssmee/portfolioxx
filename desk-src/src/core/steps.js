// A construction written as a generator (it yields between its heavier parts) run to its end: at
// once, or a part per task, so no single task holds the main thread long while the page loads.
/** Runs every step now; returns what the generator returns. */
export function runSteps(it) {
  for (;;) {
    const r = it.next()
    if (r.done) return r.value
  }
}
/** Runs one step per task: `tick` (a promise) between them. */
export async function runStepsAsync(it, tick) {
  for (;;) {
    const r = it.next()
    if (r.done) return r.value
    await tick()
  }
}
