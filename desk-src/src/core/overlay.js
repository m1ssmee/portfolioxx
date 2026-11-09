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
  // (GPU time, a query per stage of the frame: begin() opens 'scene', the frame pipeline marks the
  // others; the results come back a few frames later and are shown by stage)
  const pending = [] // { q, label, frame }
  let open = null
  let openLabel = ''
  let frameId = 0
  let gpu = null
  let stages = null // (the latest frame's ms by stage)
  const byFrame = new Map()
  const startQ = (label) => {
    open = gl.createQuery()
    openLabel = label
    gl.beginQuery(tq.TIME_ELAPSED_EXT, open)
  }
  const endQ = () => {
    gl.endQuery(tq.TIME_ELAPSED_EXT)
    pending.push({ q: open, label: openLabel, frame: frameId })
    open = null
  }
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
      frameId++
      if (tq && !open && pending.length < 40) startQ('scene')
    },
    /** The frame pipeline: the stage that begins now ('dof', 'smoke', 'bloom', 'comp', 'present', 'bake'). */
    mark(label) {
      if (!open) return
      endQ()
      startQ(label)
    },
    end(ms, p) {
      if (open) endQ()
      while (pending.length && gl.getQueryParameter(pending[0].q, gl.QUERY_RESULT_AVAILABLE)) {
        const { q, label, frame } = pending.shift()
        if (!gl.getParameter(tq.GPU_DISJOINT_EXT)) {
          const t = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6
          let f = byFrame.get(frame)
          if (!f) byFrame.set(frame, (f = { total: 0, by: {} }))
          f.total += t
          f.by[label] = (f.by[label] || 0) + t
          // (a frame is complete once a later frame's result has come)
          for (const [k, v] of byFrame) if (k < frame) {
            gpu = v.total
            stages = v.by
            byFrame.delete(k)
          }
        }
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
          `gpu ms     ${gpu === null ? (tq ? '…' : 'n/a') : gpu.toFixed(2)}${stages ? '  (' + Object.entries(stages).map(([k, v]) => `${k} ${v.toFixed(1)}`).join('  ') + ')' : ''}\n` +
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
