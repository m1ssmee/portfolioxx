// Two plush toys on the desk: a round purple ghost with a wide grin, and a yellow duck holding its
// head. Their shapes are meshed from distance fields (objects/plushGeo.js, in the worker); here
// they get their cloth (a short-pile fabric: matt, a soft sheen at grazing angles, a fine speckle
// of pile in its colour), their embroidered faces (drawn on a canvas and laid on from the front),
// the duck's three strands of hair, and a soft shade where they sit. A poke squashes one and it
// wobbles back (update).
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { PLUSH } from './plushGeo.js'

const PX = 8 // (the faces' canvases: pixels a millimetre)

/** A canvas over a face's rectangle, drawn in millimetres, y up, x from the toy's middle. */
function faceCanvas([x0, y0, w, h], draw) {
  const c = document.createElement('canvas')
  c.width = Math.round(w * PX)
  c.height = Math.round(h * PX)
  const g = c.getContext('2d')
  g.setTransform(PX, 0, 0, -PX, -x0 * PX, (y0 + h) * PX)
  g.lineJoin = g.lineCap = 'round'
  draw(g)
  return c
}

/** The ghost's face: two slanted red eyes and a wide grin of teeth, satin-stitched. */
function ghostFace(g) {
  const thread = '#1d1626'
  for (const s of [-1, 1]) {
    g.save()
    g.scale(s, 1)
    // the eye: its top edge slanting down to the middle, its lower edge round
    g.beginPath()
    g.moveTo(8.5, 64)
    g.lineTo(40, 82.5)
    g.quadraticCurveTo(44.5, 62, 25, 57.5)
    g.quadraticCurveTo(14, 57.5, 8.5, 64)
    g.closePath()
    g.fillStyle = '#d42a3c'
    g.fill()
    g.lineWidth = 1.5
    g.strokeStyle = thread
    g.stroke()
    // the pupil, and a stitch of light in it
    g.fillStyle = thread
    g.beginPath()
    g.ellipse(23.5, 66.5, 2.5, 4.2, 0.35, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#fbf6ee'
    g.beginPath()
    g.arc(29, 72.5, 1.5, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  // the grin: a crescent of teeth, corner to corner
  const grin = () => {
    g.beginPath()
    g.moveTo(-37, 51)
    g.quadraticCurveTo(0, 43.5, 37, 51)
    g.quadraticCurveTo(0, 20, -37, 51)
    g.closePath()
  }
  grin()
  g.fillStyle = '#f4f0e6'
  g.fill()
  g.save()
  grin()
  g.clip()
  g.strokeStyle = thread
  g.lineWidth = 0.9
  for (const x of [-25, -12.5, 0, 12.5, 25]) {
    g.beginPath()
    g.moveTo(x, 20)
    g.lineTo(x, 56)
    g.stroke()
  }
  g.restore()
  grin()
  g.lineWidth = 1.5
  g.strokeStyle = thread
  g.stroke()
}

/** The duck's face: two round white eyes, a dot in each. */
function duckFace(g) {
  for (const s of [-1, 1]) {
    g.beginPath()
    g.ellipse(s * 17, 96, 8.2, 8.8, 0, 0, Math.PI * 2)
    g.fillStyle = '#fbf8f0'
    g.fill()
    g.lineWidth = 1.1
    g.strokeStyle = '#2a2420'
    g.stroke()
    g.fillStyle = '#17130f'
    g.beginPath()
    g.arc(s * 17, 96, 1.7, 0, Math.PI * 2)
    g.fill()
  }
}

const FACES = { ghost: ghostFace, duck: duckFace }
const CLOTH = {
  ghost: { body: [0x6a50a8, 0xb9a4ee] },
  duck: { body: [0xf3c33a, 0xffe9a0], bill: [0xf2e2b4, 0xfff6dc], feet: [0xf2e2b4, 0xfff6dc] },
}

/** A short-pile cloth in a colour; with `face` ({ map, rect }), embroidery laid on from the front. */
function cloth(color, sheen, face) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.94, metalness: 0, sheen: 1, sheenRoughness: 0.42, sheenColor: new THREE.Color(sheen).multiplyScalar(0.55), vertexColors: true, envMapIntensity: 0.8 })
  const u = { tFace: { value: face ? face.map : null }, uFace: { value: new THREE.Vector4(...(face ? face.rect : [0, 0, 1, 1])) } }
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPlushP;\nvarying float vPlushFront;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPlushP = position;\nvPlushFront = normal.z;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vPlushP;
        varying float vPlushFront;
        uniform sampler2D tFace;
        uniform vec4 uFace;
        float plushHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float plushPile(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(plushHash(i), plushHash(i + vec3(1, 0, 0)), f.x), mix(plushHash(i + vec3(0, 1, 0)), plushHash(i + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(plushHash(i + vec3(0, 0, 1)), plushHash(i + vec3(1, 0, 1)), f.x), mix(plushHash(i + vec3(0, 1, 1)), plushHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
        }`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          // the pile: a fine speckle, gone where it would be smaller than a pixel
          float pw = length(fwidth(vPlushP));
          float pile = mix(plushPile(vPlushP * 2.6), 0.5, clamp(pw * 2.6 - 0.25, 0.0, 1.0));
          diffuseColor.rgb *= 0.9 + 0.2 * pile;
          ${face ? `vec2 fuv = (vPlushP.xy - uFace.xy) / uFace.zw;
          if (fuv.x > 0.0 && fuv.x < 1.0 && fuv.y > 0.0 && fuv.y < 1.0) {
            vec4 fc = texture2D(tFace, fuv);
            // (thread: a touch brighter along its lie than the pile round it)
            diffuseColor.rgb = mix(diffuseColor.rgb, fc.rgb * (0.94 + 0.12 * pile), fc.a * smoothstep(0.02, 0.2, vPlushFront));
          }` : ''}
        }`,
      )
  }
  m.customProgramCacheKey = () => (face ? 'plush.face' : 'plush.cloth')
  return m
}

let contactTex = null
function contactTexture() {
  if (contactTex) return contactTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  // (black, its opacity falling away smoothly: darkest under the toy, nothing at the rim)
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    r.addColorStop(t, `rgba(0,0,0,${(Math.pow(1 - t, 1.9) * (t < 0.3 ? 1 : 1)).toFixed(3)})`)
  }
  g.fillStyle = r
  g.fillRect(0, 0, 128, 128)
  contactTex = new THREE.CanvasTexture(c)
  return contactTex
}

/**
 * One toy. which: 'ghost' | 'duck'; parts: its meshed pieces (plushGeo.js's plushMeshes, from the
 * worker); at: where it sits (world, on the desk); yaw: the way it faces (about y, from +z).
 * Returns { group, meshes, materials, center(out), radius, poke(), update(dt) -> still moving, dispose() }.
 */
export function createPlush({ which, parts, at, yaw = 0, anisotropy = 4 }) {
  const P = PLUSH[which]
  const group = new THREE.Group()
  group.name = `plush.${which}`
  group.position.copy(at)
  group.rotation.y = yaw
  const soft = new THREE.Group() // (what squashes: everything but its shade on the desk)
  group.add(soft)
  const geometries = []
  const materials = []
  const meshes = []
  const faceMap = new THREE.CanvasTexture(faceCanvas(P.face, FACES[which]))
  faceMap.colorSpace = THREE.SRGBColorSpace
  faceMap.anisotropy = anisotropy
  for (const p of parts) {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p.positions, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(p.normals, 3))
    // (the creases between its pieces a little darker: the mesher's own occlusion)
    const col = new Float32Array(p.ao.length * 3)
    for (let i = 0; i < p.ao.length; i++) col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0.5 + 0.5 * p.ao[i]
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.setIndex(new THREE.BufferAttribute(p.indices, 1))
    g.computeBoundingSphere()
    geometries.push(g)
    const [color, sheen] = CLOTH[which][p.name]
    const m = cloth(color, sheen, p.name === 'body' ? { map: faceMap, rect: P.face } : null)
    materials.push(m)
    const mesh = new THREE.Mesh(g, m)
    mesh.name = `plush.${which}.${p.name}`
    mesh.castShadow = true
    meshes.push(mesh)
    soft.add(mesh)
  }
  if (which === 'duck') {
    // three strands of hair: black felt, the middle one up, the others leaning out
    const strand = (pts) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 10, 1.35, 6, false)
    const strands = [
      strand([[0, 119, 0], [0.4, 133, -1], [1.6, 146, -3.5]]),
      strand([[-3, 119, 0], [-9, 130, -1], [-18, 138, -2.5]]),
      strand([[3, 119, 0], [9.5, 130, -1], [17, 139, -2.5]]),
    ]
    const g = mergeGeometries(strands)
    for (const s of strands) s.dispose()
    geometries.push(g)
    const felt = new THREE.MeshStandardMaterial({ color: 0x1b1917, roughness: 0.95 })
    felt.customProgramCacheKey = () => 'plush.felt'
    materials.push(felt)
    const hair = new THREE.Mesh(g, felt)
    hair.name = 'plush.duck.hair'
    hair.castShadow = true
    meshes.push(hair)
    soft.add(hair)
  }
  // its shade on the desk: soft, darkest under it
  const shadeGeo = new THREE.PlaneGeometry(P.r * 3, P.r * 3)
  shadeGeo.rotateX(-Math.PI / 2)
  geometries.push(shadeGeo)
  const shadeMat = new THREE.MeshBasicMaterial({ color: 0x000000, map: contactTexture(), transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -2 })
  const shade = new THREE.Mesh(shadeGeo, shadeMat)
  shade.name = `plush.${which}.contact`
  shade.position.y = 0.25
  group.add(shade)
  group.updateMatrixWorld(true)

  // the squash: a spring, under-damped (x: how far it is pressed down, as a share of its height)
  let x = 0
  let v = 0
  let lean = 1
  const place = () => {
    soft.scale.set(1 - 0.55 * x, 1 + x, 1 - 0.55 * x)
    soft.rotation.z = 0.35 * x * lean
    soft.updateMatrixWorld(true)
  }
  return {
    group,
    meshes,
    materials,
    radius: P.r,
    top: P.top,
    center: (out) => out.set(0, P.top * 0.5, 0).applyMatrix4(group.matrixWorld),
    /** Pressed and let go (k: how hard, about 1). */
    poke(k = 1) {
      v = -7.5 * k
      lean = -lean
    },
    get moving() {
      return x !== 0 || v !== 0
    },
    update(dt) {
      if (x === 0 && v === 0) return false
      const steps = Math.max(1, Math.ceil(dt / 0.004))
      const h = Math.min(dt, 0.05) / steps
      for (let i = 0; i < steps; i++) {
        v += (-210 * x - 7.5 * v) * h
        x += v * h
      }
      x = Math.max(-0.3, Math.min(0.2, x))
      if (Math.abs(x) < 0.0015 && Math.abs(v) < 0.02) x = v = 0
      place()
      return true
    },
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      shadeMat.dispose()
      faceMap.dispose()
    },
  }
}
