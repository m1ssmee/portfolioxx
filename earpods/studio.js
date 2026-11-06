// A photo studio for the reflections: a grey room with big soft light panels.
// Glossy white plastic shows little but its surroundings, so this is what draws the earphones:
// long, bright highlights from the strip lights, soft grey where they face the room.
import * as THREE from 'three'

export function studioEnvironment(renderer) {
  const env = new THREE.Scene()
  const geos = []
  const mats = []

  // the room: lighter above, darker towards the floor
  const roomGeo = new THREE.SphereGeometry(50, 64, 32)
  const colors = []
  const pos = roomGeo.attributes.position
  const c = new THREE.Color()
  const lo = new THREE.Color(0.2, 0.205, 0.215)
  const hi = new THREE.Color(0.74, 0.75, 0.77)
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) / 50 + 1) / 2, 0, 1)
    c.copy(lo).lerp(hi, Math.pow(t, 1.25))
    colors.push(c.r, c.g, c.b)
  }
  roomGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const roomMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })
  env.add(new THREE.Mesh(roomGeo, roomMat))
  geos.push(roomGeo)
  mats.push(roomMat)

  // light panels: width, height, position, brightness
  const panel = (w, h, p, k, look = [0, 0, 0]) => {
    const g = new THREE.PlaneGeometry(w, h)
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    m.color.setScalar(k)
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(...p)
    mesh.lookAt(...look)
    env.add(mesh)
    geos.push(g)
    mats.push(m)
  }
  panel(26, 18, [0, 36, 8], 4.2) // the big overhead softbox
  panel(7, 34, [-34, 8, 16], 5.5) // key strip, front left
  panel(5, 30, [31, 6, -12], 4.0) // rim strip, back right
  panel(5, 26, [24, 4, 26], 2.2) // a narrower strip, front right
  panel(30, 8, [0, -8, 34], 0.9) // low fill bounced off the floor in front

  const pmrem = new THREE.PMREMGenerator(renderer)
  const tex = pmrem.fromScene(env, 0.02).texture
  pmrem.dispose()
  for (const g of geos) g.dispose()
  for (const m of mats) m.dispose()
  return tex
}
