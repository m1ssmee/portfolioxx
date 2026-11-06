// A photo studio for the reflections: a grey room with big soft light panels.
// Glossy white plastic shows almost nothing but its surroundings, so this is what draws the
// earphones: bright, broad highlights from the panels, and soft grey where they face the room.
import * as THREE from 'three'

export function studioEnvironment(renderer) {
  const env = new THREE.Scene()
  const geos = []
  const mats = []

  // the room: lighter above, darker towards the floor
  const roomGeo = new THREE.SphereGeometry(50, 48, 24)
  const colors = []
  const pos = roomGeo.attributes.position
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) / 50 + 1) / 2, 0, 1)
    c.setRGB(0.32, 0.33, 0.35).lerp(new THREE.Color(0.8, 0.81, 0.83), Math.pow(t, 1.4))
    colors.push(c.r, c.g, c.b)
  }
  roomGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const roomMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })
  env.add(new THREE.Mesh(roomGeo, roomMat))
  geos.push(roomGeo)
  mats.push(roomMat)

  // softboxes: [width, height, position, intensity]
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
  panel(30, 22, [0, 34, 6], 3.2) // overhead
  panel(10, 34, [-34, 6, 14], 2.6) // key strip, left
  panel(7, 30, [32, 4, 4], 1.8) // rim strip, right
  panel(26, 10, [0, -6, 36], 0.9) // soft fill from the front

  const pmrem = new THREE.PMREMGenerator(renderer)
  const tex = pmrem.fromScene(env, 0.035).texture
  pmrem.dispose()
  for (const g of geos) g.dispose()
  for (const m of mats) m.dispose()
  return tex
}
