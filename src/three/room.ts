import * as THREE from 'three'
import { HOME, type Ambience } from './ambience'

const tmp = new THREE.Color()

/** Linear-space colours that ease towards the current ambience; the backdrop shader reads these. */
export const room = {
  base: new THREE.Color(HOME.base),
  a: new THREE.Color(HOME.a),
  b: new THREE.Color(HOME.b),
  ink: new THREE.Color(HOME.ink),
  target: HOME as Ambience,
  step(k: number) {
    this.base.lerp(tmp.set(this.target.base), k)
    this.a.lerp(tmp.set(this.target.a), k)
    this.b.lerp(tmp.set(this.target.b), k)
    this.ink.lerp(tmp.set(this.target.ink), k)
  },
}
