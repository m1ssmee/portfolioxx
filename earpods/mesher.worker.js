// Builds the parts' meshes off the main thread, so the page stays responsive while loading.
import { meshSDF } from './sdf.js'
import { MESH_JOBS } from './jobs.js'

self.onmessage = (e) => {
  const out = {}
  const transfer = []
  for (const name of e.data) {
    const [sdf, bounds, h] = MESH_JOBS[name]
    const m = meshSDF(sdf, bounds, h)
    out[name] = m
    transfer.push(m.positions.buffer, m.normals.buffer, m.ao.buffer, m.indices.buffer)
  }
  self.postMessage(out, transfer)
}
