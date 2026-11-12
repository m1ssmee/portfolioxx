// The scene's one worker: every procedural bake, off the page's thread (no three.js here): the
// textures and the curl-noise volume, the SDF meshes (the ashtray, the lighter's body, the earbud
// and its remote) and the earbuds' collision shapes for their physics.
import { meshSDF } from './sdf.js'
import { decimate } from './decimate.js'
import { ashtrayMesh } from '../objects/ashtray.js'
import { lighterMesh } from '../objects/lighterGeo.js'
import { earbudsMeshJobs } from '../objects/earbudsGeom.js'
import { earbudsTextures, earbudsTextureTransfer } from '../objects/earbudsTex.js'
import { collisionData } from '../objects/earbudsRig.js'
import { bakeAll, curlVolume } from './bake.js'

// (each mesh made lighter, core/decimate.js: only where that moves its surface by less than three
// thousandths of a millimetre, under a tenth of a pixel in the closest view, and leaves every
// normal it interpolates within a sixth of a degree of the true one: a highlight cannot tell)
const lighten = (r) => decimate(r, { tol: 0.003, maxAngle: 0.2, aoTol: 0.03, fit: { angle: 0.003 } })
const meshTransfer = (r) => [r.positions.buffer, r.normals.buffer, r.ao.buffer, r.indices.buffer, ...(r.zone ? [r.zone.buffer] : [])]

self.onmessage = (e) => {
  const m = e.data
  if (m.type === 'tray') {
    const r = lighten(ashtrayMesh(meshSDF, m.h))
    self.postMessage({ id: m.id, mesh: r }, meshTransfer(r))
  } else if (m.type === 'lighter') {
    const r = lighten(lighterMesh(meshSDF, m.h))
    self.postMessage({ id: m.id, mesh: r }, meshTransfer(r))
  } else if (m.type === 'earbud') {
    // (one of the earbuds' moulded parts: 'bud' or 'remote')
    const r = lighten(
      earbudsMeshJobs()
        .find((j) => j.name === m.name)
        .run(meshSDF),
    )
    self.postMessage({ id: m.id, mesh: r }, meshTransfer(r))
  } else if (m.type === 'earbudsTex') {
    const t = earbudsTextures()
    self.postMessage({ id: m.id, tex: t }, earbudsTextureTransfer(t))
  } else if (m.type === 'collision') {
    const c = collisionData()
    const transfer = []
    for (const v of Object.values(c)) transfer.push(v.grid.data.buffer, v.points.buffer)
    self.postMessage({ id: m.id, collision: c }, transfer)
  } else if (m.type === 'curl') {
    const v = curlVolume(64, 8)
    self.postMessage({ id: m.id, curl: v }, [v.data.buffer])
  } else if (m.type === 'bake') {
    const t = bakeAll()
    const transfer = []
    for (const v of Object.values(t)) for (const k of ['px', 'nrm', 'rough']) if (v[k]) transfer.push(v[k].buffer)
    self.postMessage({ id: m.id, tex: t }, transfer)
  }
}
