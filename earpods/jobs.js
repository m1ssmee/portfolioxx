// Which shape becomes which mesh, and at what resolution (cell size in cm).
import { meshSDF } from './sdf.js'
import * as S from './shapes.js'

const cap = (k, sunk) => [S.remoteCap(...S.REMOTE.caps[k], sunk), S.CAP_BOUNDS(...S.REMOTE.caps[k]), 0.011]

export const MESH_JOBS = {
  earbud: [S.earbud, S.EARBUD_BOUNDS, 0.019],
  remote: [S.remote, S.REMOTE_BOUNDS, 0.015],
  plus: cap('plus', false),
  centre: cap('centre', true),
  minus: cap('minus', false),
  splitter: [S.splitter, S.SPLITTER_BOUNDS, 0.013],
  plug: [S.plugHousing, S.PLUG_BOUNDS, 0.013],
}

// the earbud takes about as long as everything else together, so it gets a thread of its own
const GROUPS = [['earbud'], ['remote', 'plus', 'centre', 'minus'], ['splitter', 'plug']]

/** Mesh everything, in background threads where the browser allows. */
export function meshAll() {
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
  return Promise.all(GROUPS.map((g) => inWorker(g).catch(() => here(g)))).then((parts) => Object.assign({}, ...parts))
}
