// Two plush toys on the desk: a round purple ghost with a wide grin, and a yellow duck holding its
// head. Their shapes are meshed from distance fields (objects/plushGeo.js, in the worker). Here:
//   - their cloth: a short pile, drawn as a few shells of the same mesh pushed out along its
//     normals, each keeping fewer of the pile's strands than the one under it (dark at the roots,
//     light at the tips), so the toy has a soft, fuzzy edge and no hard highlight; a seam sunk
//     down the middle of its back;
//   - their faces: embroidery, drawn on a canvas and laid on from the front, lying in the pile;
//   - the duck's three strands of hair, and a soft shade under each toy;
//   - what they do: picked up and carried (they hang upright from the hand), thrown (they keep
//     the hand's speed, tumble, land without a bounce and squash), poked (they squash and wobble
//     back). One that falls off the desk drops back onto its place a moment later.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createBody } from '../core/body.js'
import { PLUSH } from './plushGeo.js'

const PX = 8 // (the faces' canvases: pixels a millimetre)
const SHELLS = 5 // (the pile: this many layers, the first the cloth itself)
const PILE = 2.8 // (mm, the pile's length)
const HOLD = 150 // (mm: how high over the desk a carried toy's middle hangs)

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

/** The ghost's face: two red eyes under heavy slanting brows, a wide grin of square teeth, satin-stitched. */
function ghostFace(g) {
  const thread = '#17121d'
  for (const s of [-1, 1]) {
    g.save()
    g.scale(s, 1)
    // the eye: flat along its slanting brow, round below
    g.beginPath()
    g.moveTo(9, 104)
    g.lineTo(45, 123)
    g.quadraticCurveTo(52, 104, 34, 97)
    g.quadraticCurveTo(18, 95, 9, 104)
    g.closePath()
    g.fillStyle = '#e23a2e'
    g.fill()
    g.lineWidth = 1.8
    g.strokeStyle = thread
    g.stroke()
    // the brow: a heavy line over it, down to the middle
    g.lineWidth = 4.2
    g.beginPath()
    g.moveTo(6.5, 102.5)
    g.lineTo(48, 125)
    g.stroke()
    // the pupil, and a stitch of light beside it
    g.fillStyle = thread
    g.beginPath()
    g.ellipse(24, 105.5, 2.6, 5, 0.3, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#fbf6ee'
    g.beginPath()
    g.ellipse(29.5, 108, 1.5, 2.4, 0.3, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  // the grin: its top edge nearly straight and turned up at the corners, its lower a deep curve
  const grin = () => {
    g.beginPath()
    g.moveTo(-50, 88)
    g.quadraticCurveTo(0, 76, 50, 88)
    g.quadraticCurveTo(46, 60, 0, 56)
    g.quadraticCurveTo(-46, 60, -50, 88)
    g.closePath()
  }
  grin()
  g.fillStyle = '#f6f3ec'
  g.fill()
  g.save()
  grin()
  g.clip()
  g.strokeStyle = thread
  g.lineWidth = 1.5
  for (const x of [-35, -21, -7, 7, 21, 35]) {
    g.beginPath()
    g.moveTo(x, 50)
    g.lineTo(x, 92)
    g.stroke()
  }
  g.restore()
  grin()
  g.lineWidth = 2.6
  g.strokeStyle = thread
  g.stroke()
}

/** The duck's face: two big round white eyes set wide, a small dot in each. */
function duckFace(g) {
  for (const s of [-1, 1]) {
    g.beginPath()
    g.ellipse(s * 36, 124, 15.5, 16.5, 0, 0, Math.PI * 2)
    g.fillStyle = '#f7f6f9'
    g.fill()
    g.lineWidth = 1.2
    g.strokeStyle = '#b9bccb'
    g.stroke()
    g.fillStyle = '#17130f'
    g.beginPath()
    g.arc(s * 33.5, 123, 2.5, 0, Math.PI * 2)
    g.fill()
  }
}
/** On its bill: two short slanting nostrils. */
function duckBillFace(g) {
  g.strokeStyle = '#2a2420'
  g.lineWidth = 1.6
  for (const s of [-1, 1]) {
    g.beginPath()
    g.moveTo(s * 9, 107.5)
    g.lineTo(s * 14, 106)
    g.stroke()
  }
}

const FACES = { ghost: ghostFace, duck: duckFace }
const CLOTH = {
  ghost: { body: [0x8469cf, 0xd6c8fa] },
  duck: { body: [0xffcf1f, 0xfff0a8], bill: [0xf7ecc4, 0xfffbe8], feet: [0xf7ecc4, 0xfffbe8] },
}

/**
 * The cloth in a colour, drawn as shells (the instanced attribute aShell: 0 the cloth, 1 the pile's
 * tips). face: { map, rect }, embroidery laid on from the front; seam: a seam down the back.
 */
function cloth(color, sheen, face, seam) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 1, metalness: 0, specularIntensity: 0.15, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(sheen).multiplyScalar(0.5), vertexColors: true, envMapIntensity: 0.75 })
  const u = { tFace: { value: face ? face.map : null }, uFace: { value: new THREE.Vector4(...(face ? face.rect : [0, 0, 1, 1])) }, uPile: { value: PILE } }
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aShell;\nuniform float uPile;\nvarying vec3 vPlushP;\nvarying float vPlushFront;\nvarying float vShell;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPlushP = position;\nvPlushFront = normal.z;\nvShell = aShell;\ntransformed += normal * (aShell * uPile);')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vPlushP;
        varying float vPlushFront;
        varying float vShell;
        uniform sampler2D tFace;
        uniform vec4 uFace;
        float plushHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          const float DENS = 2.3; // (strands a millimetre)
          vec3 pp = vPlushP * DENS;
          float strand = plushHash(floor(pp));
          vec3 pf = fract(pp) - 0.5;
          // (how small the strands are on screen: 1 once smaller than a pixel)
          float fine = clamp(length(fwidth(vPlushP)) * DENS * 0.9 - 0.2, 0.0, 1.0);
          float thread = 0.0;
          vec3 threadCol = vec3(0.0);
          ${face ? `vec2 fuv = (vPlushP.xy - uFace.xy) / uFace.zw;
          if (fuv.x > 0.0 && fuv.x < 1.0 && fuv.y > 0.0 && fuv.y < 1.0) {
            vec4 fc = texture2D(tFace, fuv);
            thread = fc.a * smoothstep(0.02, 0.2, vPlushFront);
            threadCol = fc.rgb;
          }` : ''}
          float seam = ${seam ? '(1.0 - smoothstep(0.3, 1.0, abs(vPlushP.x))) * (1.0 - thread)' : '0.0'};
          if (vShell > 0.01) {
            // a strand lives up to its own height, thinner towards its tip; embroidery and seams
            // lie low in the pile; too small to see, the lower layers are simply whole
            float keep = step(vShell * 0.92, strand) * step(dot(pf, pf), 0.3 - 0.18 * vShell);
            keep = mix(keep, step(vShell, 0.55), fine);
            if (thread > 0.5 && vShell > 0.3) keep = 0.0;
            if (seam > 0.5 && vShell > 0.3) keep = 0.0;
            if (keep < 0.5) discard;
          }
          // dark at the roots, light at the tips; each strand its own shade
          float tone = mix(0.58, 1.1, vShell) * (0.9 + 0.2 * strand * (1.0 - fine));
          diffuseColor.rgb *= mix(tone, 0.9, fine * 0.6);
          diffuseColor.rgb = mix(diffuseColor.rgb, threadCol * (0.9 + 0.2 * strand), thread);
          diffuseColor.rgb *= 1.0 - 0.2 * seam;
        }`,
      )
  }
  m.customProgramCacheKey = () => `plush.${face ? 'face' : 'cloth'}${seam ? '.seam' : ''}`
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
  for (let i = 0; i <= 10; i++) r.addColorStop(i / 10, `rgba(0,0,0,${Math.pow(1 - i / 10, 1.9).toFixed(3)})`)
  g.fillStyle = r
  g.fillRect(0, 0, 128, 128)
  contactTex = new THREE.CanvasTexture(c)
  return contactTex
}

/**
 * One toy. which: 'ghost' | 'duck'; parts: its meshed pieces (from the worker); at: where it sits
 * (world); yaw: the way it faces; sdf(x, y, z, grad): what it can land on and against (world: the
 * desk, the wall, the things on the desk), floorY: the floor under all of it; surfaceY(x, z): the
 * height of what is under a point (the desk, or the floor), for its shade; onLand(k).
 * Returns { group, shade, meshes (what a ray may hit), materials, center(out), radius, top, held,
 *   poke(k), pick(hit, ray), aim(ray), release(), home(), cancel(), update(dt) -> still moving, dispose() }.
 */
export function createPlush({ which, parts, at, yaw = 0, anisotropy = 4, sdf, floorY, surfaceY, onLand }) {
  const P = PLUSH[which]
  const group = new THREE.Group()
  group.name = `plush.${which}`
  group.matrixAutoUpdate = false
  const soft = new THREE.Group() // (what squashes)
  group.add(soft)
  const geometries = []
  const materials = []
  const meshes = []
  const faceMap = new THREE.CanvasTexture(faceCanvas(P.face, FACES[which]))
  faceMap.colorSpace = THREE.SRGBColorSpace
  faceMap.anisotropy = anisotropy
  let billMap = null
  if (P.billFace) {
    billMap = new THREE.CanvasTexture(faceCanvas(P.billFace, duckBillFace))
    billMap.colorSpace = THREE.SRGBColorSpace
    billMap.anisotropy = anisotropy
  }
  // (what casts the shadow and takes the ray: the cloth itself, once, drawing nothing)
  const proxyMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
  const shellAttr = new THREE.InstancedBufferAttribute(new Float32Array(Array.from({ length: SHELLS }, (_, i) => i / (SHELLS - 1))), 1)
  const one = new THREE.Matrix4()
  for (const p of parts) {
    const g = new THREE.InstancedBufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p.positions, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(p.normals, 3))
    // (the creases between its pieces a little darker: the mesher's own occlusion)
    const col = new Float32Array(p.ao.length * 3)
    for (let i = 0; i < p.ao.length; i++) col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0.45 + 0.55 * p.ao[i]
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aShell', shellAttr)
    g.setIndex(new THREE.BufferAttribute(p.indices, 1))
    g.instanceCount = SHELLS
    g.computeBoundingSphere()
    g.boundingSphere.radius += PILE
    geometries.push(g)
    const [color, sheen] = CLOTH[which][p.name]
    const m = cloth(color, sheen, p.name === 'body' ? { map: faceMap, rect: P.face } : p.name === 'bill' && billMap ? { map: billMap, rect: P.billFace } : null, p.name !== 'feet')
    materials.push(m)
    const fur = new THREE.InstancedMesh(g, m, SHELLS)
    for (let i = 0; i < SHELLS; i++) fur.setMatrixAt(i, one)
    fur.name = `plush.${which}.${p.name}`
    fur.raycast = () => {}
    soft.add(fur)
    // (the same vertices, without the shells: for shadows and rays)
    const pg = new THREE.BufferGeometry()
    pg.setAttribute('position', g.attributes.position)
    pg.setIndex(g.index)
    pg.computeBoundingSphere()
    geometries.push(pg)
    const proxy = new THREE.Mesh(pg, proxyMat)
    proxy.name = `plush.${which}.${p.name}.proxy`
    proxy.castShadow = true
    meshes.push(proxy)
    soft.add(proxy)
  }
  if (which === 'duck') {
    // three strands of hair: thick black felt with round ends, the middle one tallest, the others leaning out
    const strand = (pts) => {
      const v = pts.map((p) => new THREE.Vector3(...p))
      const tip = new THREE.SphereGeometry(4.6, 12, 8).translate(v[2].x, v[2].y, v[2].z)
      return mergeGeometries([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), 12, 4.6, 10, false), tip.toNonIndexed ? tip : tip].map((q) => (q.index ? q.toNonIndexed() : q)))
    }
    const strands = [
      strand([[2, 166, 0], [4, 190, -1], [3, 212, -3]]),
      strand([[-8, 166, 0], [-17, 184, -1], [-22, 200, -2]]),
      strand([[11, 165, 0], [22, 180, -1], [34, 190, -2]]),
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
  // its shade on what is under it: soft, darkest when it sits, fading as it is lifted
  const shadeGeo = new THREE.PlaneGeometry(P.r * 3, P.r * 3)
  shadeGeo.rotateX(-Math.PI / 2)
  geometries.push(shadeGeo)
  const shadeMat = new THREE.MeshBasicMaterial({ color: 0x000000, map: contactTexture(), transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -2 })
  const shade = new THREE.Mesh(shadeGeo, shadeMat)
  shade.name = `plush.${which}.contact`

  // ---- where it is: a rigid body (core/body.js) when it is free, the hand when it is held
  const [cx, cy, cz] = P.com
  const body = createBody({ spheres: P.spheres.map(([x, y, z, r]) => [x - cx, y - cy, z - cz, r]), s: 80, mass: [5, 1, 1, 1], sdf, floorY, friction: 7 })
  const X = new THREE.Vector3()
  const Y = new THREE.Vector3()
  const Z = new THREE.Vector3()
  const C = new THREE.Vector3() // (its centre of mass, world)
  const fr = new Float64Array(12)
  const homeC = new THREE.Vector3(at.x, at.y + cy, at.z).add(new THREE.Vector3(cx, 0, cz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw))
  let heading = yaw
  const upright = (h) => {
    X.set(Math.cos(h), 0, -Math.sin(h))
    Y.set(0, 1, 0)
    Z.set(Math.sin(h), 0, Math.cos(h))
  }
  function pose() {
    // (the group's frame from the body's: its origin where the toy's own is)
    group.matrix.makeBasis(X, Y, Z)
    group.matrix.setPosition(C.x - X.x * cx - Y.x * cy - Z.x * cz, C.y - X.y * cx - Y.y * cy - Z.y * cz, C.z - X.z * cx - Y.z * cy - Z.z * cz)
    group.updateMatrixWorld(true)
    const sy = surfaceY(C.x, C.z)
    shade.position.set(C.x, sy + 0.3, C.z)
    const up = Math.max(0, C.y - cy - sy)
    shade.scale.setScalar(1 + up / 260)
    shadeMat.opacity = 0.5 * Math.max(0, 1 - up / 420)
    shade.updateMatrixWorld(true)
  }
  function rest(c, h) {
    heading = h
    upright(h)
    C.copy(c)
    body.set([C.x, C.y, C.z], [X.x, X.y, X.z], [Y.x, Y.y, Y.z], [Z.x, Z.y, Z.z])
    body.awake = false
    pose()
  }
  rest(homeC, yaw)

  // the squash: a spring, under-damped (x: how far it is pressed down, as a share of its height)
  let x = 0
  let v = 0
  let lean = 1
  const place = () => {
    soft.scale.set(1 - 0.55 * x, 1 + x, 1 - 0.55 * x)
    soft.rotation.z = 0.35 * x * lean
    soft.updateMatrixWorld(true)
  }
  const poke = (k = 1) => {
    v = -7.5 * k
    lean = -lean
  }

  // the hand: where the pointer's ray meets the level it is carried at, followed softly
  const hold = { on: false, target: new THREE.Vector3(), vel: new THREE.Vector3(), plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), swing: 0 }
  const hit = new THREE.Vector3()
  const prev = new THREE.Vector3()
  let wasContact = true
  let lostFor = 0
  let fallSpeed = 0
  function throwIt() {
    hold.on = false
    const sp = hold.vel.length()
    if (sp > 1400) hold.vel.multiplyScalar(1400 / sp)
    upright(heading)
    body.set([C.x, C.y, C.z], [X.x, X.y, X.z], [Y.x, Y.y, Y.z], [Z.x, Z.y, Z.z], [hold.vel.x, hold.vel.y, hold.vel.z])
    // (thrown, it tumbles forward over the way it goes)
    const flat = Math.hypot(hold.vel.x, hold.vel.z)
    if (flat > 120) body.spin([C.x, C.y, C.z], [hold.vel.z / flat, 0, -hold.vel.x / flat], Math.min(9, flat / 110), [hold.vel.x, hold.vel.y, hold.vel.z])
    wasContact = false
  }
  const api = {
    group,
    shade,
    meshes,
    materials,
    radius: P.r,
    top: P.top,
    center: (out) => out.copy(C),
    get held() {
      return hold.on
    },
    get moving() {
      return hold.on || body.awake || x !== 0 || v !== 0
    },
    poke,
    // ---- core/grab.js's contract
    pick(h, ray) {
      hold.on = true
      body.awake = false
      hold.vel.set(0, 0, 0)
      hold.plane.constant = -(surfaceY(C.x, C.z) + HOLD)
      hold.target.copy(C)
      poke(0.5)
      if (ray) api.aim(ray)
    },
    aim(ray) {
      if (!hold.on) return
      if (ray.intersectPlane(hold.plane, hit)) hold.target.copy(hit)
    },
    twist(rad) {
      heading += rad
    },
    release() {
      if (hold.on) throwIt()
    },
    cancel() {
      if (hold.on) throwIt()
    },
    /** Back to where it sits (dropped onto it from a little above). */
    home() {
      hold.on = false
      heading = yaw
      upright(yaw)
      C.copy(homeC).setY(homeC.y + 90)
      body.set([C.x, C.y, C.z], [X.x, X.y, X.z], [Y.x, Y.y, Y.z], [Z.x, Z.y, Z.z])
      wasContact = false
      lostFor = 0
    },
    update(dt) {
      let busy = false
      if (hold.on) {
        // (carried: drawn towards the hand, upright, leaning back a little from the way it moves)
        prev.copy(C)
        const k = 1 - Math.exp(-dt / 0.085)
        C.lerp(hold.target, k)
        if (dt > 0) hold.vel.lerp(prev.subVectors(C, prev).divideScalar(dt), 1 - Math.exp(-dt / 0.06))
        upright(heading)
        pose()
        busy = true
      } else if (body.awake) {
        body.step(Math.min(dt, 0.05))
        body.frame(fr)
        fallSpeed = (C.y - fr[1]) / Math.max(dt, 1e-3)
        C.set(fr[0], fr[1], fr[2])
        X.set(fr[3], fr[4], fr[5])
        Y.set(fr[6], fr[7], fr[8])
        Z.set(fr[9], fr[10], fr[11])
        pose()
        // (a landing: it squashes, by how hard it came down)
        if (body.contact && !wasContact && fallSpeed > 250) {
          poke(Math.min(1.1, fallSpeed / 1300))
          onLand?.(Math.min(1, fallSpeed / 1500))
        }
        wasContact = body.contact
        busy = true
      }
      // (off the desk and at rest: back onto its place after a moment)
      if (!hold.on && !body.awake && C.y < homeC.y - 120) {
        lostFor += dt
        busy = true
        if (lostFor > 2.2) api.home()
      } else lostFor = 0
      if (x !== 0 || v !== 0) {
        const steps = Math.max(1, Math.ceil(dt / 0.004))
        const h = Math.min(dt, 0.05) / steps
        for (let i = 0; i < steps; i++) {
          v += (-210 * x - 7.5 * v) * h
          x += v * h
        }
        x = Math.max(-0.3, Math.min(0.2, x))
        if (Math.abs(x) < 0.0015 && Math.abs(v) < 0.02) x = v = 0
        place()
        busy = true
      }
      return busy
    },
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      proxyMat.dispose()
      shadeMat.dispose()
      faceMap.dispose()
      billMap?.dispose()
    },
  }
  return api
}
