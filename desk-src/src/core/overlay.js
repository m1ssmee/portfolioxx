// ?debug: the numbers, on the canvas and in the console. Loaded only when asked for.
//   fps, CPU ms (the frame's JavaScript), GPU ms (EXT_disjoint_timer_query_webgl2 where there is
//   one), draw calls, triangles, geometries, textures, render targets, JS heap, canvas backing vs CSS x DPR, the display's refresh rate,
//   which path drew the frame (cached or full) and how many bakes so far.
//   Logged: each init step's duration, main-thread long tasks over 50 ms, total JS downloaded,
//   time to the poster and to the first live frame.
export function createOverlay(root, renderer, extra, initSteps) {
  const el = document.createElement('pre')
  el.style.cssText = 'position:absolute;left:8px;top:8px;margin:0;padding:8px 10px;z-index:9;pointer-events:none;font:11px/1.45 ui-monospace,Menlo,monospace;color:#ddd;background:rgba(0,0,0,.6);border-radius:8px'
  root.appendChild(el)
  renderer.info.autoReset = false
  const gl = renderer.getContext()
  const tq = gl.getExtension('EXT_disjoint_timer_query_webgl2')
  const pending = []
  let open = null
  let gpu = null
  let n = 0
  let acc = 0
  let lastT = performance.now()
  let fps = 0
  let cpu = 0
  let path = ''
  const stats = { samples: [], firstFrameAt: null, longTasks: [], init: initSteps || [] }
  // long tasks on the main thread
  let po = null
  try {
    po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        stats.longTasks.push({ at: Math.round(e.startTime), ms: Math.round(e.duration) })
        console.warn(`[desk] long task ${Math.round(e.duration)} ms at ${Math.round(e.startTime)} ms`)
      }
    })
    po.observe({ type: 'longtask', buffered: true })
  } catch {
    po = null
  }
  const o = {
    stats,
    bakes: 0,
    begin() {
      renderer.info.reset()
      if (tq && !open && pending.length < 4) {
        open = gl.createQuery()
        gl.beginQuery(tq.TIME_ELAPSED_EXT, open)
      }
    },
    end(ms, p) {
      if (open) {
        gl.endQuery(tq.TIME_ELAPSED_EXT)
        pending.push(open)
        open = null
      }
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) {
        const q = pending.shift()
        if (!gl.getParameter(tq.GPU_DISJOINT_EXT)) gpu = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6
        gl.deleteQuery(q)
      }
      path = p || path
      n++
      acc += ms
      const now = performance.now()
      if (stats.firstFrameAt === null) {
        stats.firstFrameAt = now
        o.report()
      }
      stats.samples.push({ t: now, cpu: ms, gpu, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, path })
      if (stats.samples.length > 4000) stats.samples.splice(0, 2000)
      if (now - lastT > 500) {
        fps = (n * 1000) / (now - lastT)
        cpu = acc / n
        n = acc = 0
        lastT = now
        const x = extra()
        const m = renderer.info.memory
        el.textContent =
          `fps        ${fps.toFixed(0)}\n` +
          `cpu ms     ${cpu.toFixed(2)}\n` +
          `gpu ms     ${gpu === null ? (tq ? '…' : 'n/a') : gpu.toFixed(2)}\n` +
          `calls      ${renderer.info.render.calls}\n` +
          `triangles  ${renderer.info.render.triangles.toLocaleString('en')}\n` +
          `geometries ${m.geometries}\n` +
          `textures   ${m.textures}\n` +
          `targets    ${x.targets}\n` +
          `heap MB    ${performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) : 'n/a'}\n` +
          `canvas     ${x.backing} (css ${x.css} x ${x.dpr}) ${x.sharp ? 'full res' : 'MISMATCH'}\n` +
          `refresh    ${x.refresh ? x.refresh.toFixed(0) + ' Hz' : 'n/a'}\n` +
          `path       ${path}\n` +
          `bakes      ${o.bakes}`
      }
    },
    /** The load in the console: init steps, JS downloaded, poster and first frame. */
    report() {
      const res = performance.getEntriesByType('resource')
      const js = res.filter((r) => r.initiatorType === 'script' || /\.m?js(\?|$)/.test(r.name))
      const kb = js.reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0) / 1024
      console.groupCollapsed?.('[desk] load')
      console.table?.(stats.init.map((s) => ({ step: s.step, ms: Math.round(s.ms) })))
      console.log(`JS downloaded ${kb.toFixed(1)} KB (${js.length} files) · poster at ${window.__posterAt ? Math.round(window.__posterAt) + ' ms' : 'n/a'} · first live frame at ${Math.round(stats.firstFrameAt)} ms`)
      console.groupEnd?.()
      stats.jsKB = kb
    },
    dispose() {
      po?.disconnect()
      for (const q of pending) gl.deleteQuery(q)
      if (open) {
        gl.endQuery(tq.TIME_ELAPSED_EXT)
        gl.deleteQuery(open)
      }
      el.remove()
    },
  }
  return o
}
