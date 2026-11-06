// Which shape becomes which mesh, and at what resolution (cell size in cm).
import { meshSDF } from './sdf.js'
import * as S from './shapes.js'

export const MESH_JOBS = {
  earbud: [S.earbud, S.EARBUD_BOUNDS, 0.022],
  remote: [S.remote, S.REMOTE_BOUNDS, 0.016],
  splitter: [S.splitter, S.SPLITTER_BOUNDS, 0.016],
  plug: [S.plugHousing, S.PLUG_BOUNDS, 0.014],
}

/** Mesh everything, in two background threads where the browser allows. */
export function meshAll() {
  const groups = [['earbud'], ['remote', 'splitter', 'plug']]
  const inWorker = (names) =>
    new Promise((resolve, reject) => {
      const w = new Worker(new URL('./mesher.worker.js', import.meta.url), { type: 'module' })
      w.onmessage = (e) => {
        resolve(e.data)
        w.terminate()
      }
      w.onerror = (e) => {
        w.terminate()
        reject(e)
      }
      w.postMessage(names)
    })
  const here = (names) => Object.fromEntries(names.map((n) => [n, meshSDF(...MESH_JOBS[n])]))
  return Promise.all(groups.map((g) => inWorker(g).catch(() => here(g)))).then((parts) => Object.assign({}, ...parts))
}
