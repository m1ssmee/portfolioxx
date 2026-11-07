// A construction written as a generator (it yields between its heavier parts) run to its end a
// part per task, so no single task holds the main thread long while the page loads.
/** Runs one step per task: `tick` (a promise) between them. */
export async function runStepsAsync(it, tick) {
  for (;;) {
    const r = it.next()
    if (r.done) return r.value
    await tick()
  }
}
