// The lighter: its materials and parts (body from the worker's SDF mesh, the push button, the
// flame), how it is held and dropped, and lighting it. Registered with core/grab.js like the
// cigarette; its light is a term in the lit materials (core/flamelight.js).
//   at rest:  lying on its side in the lit pool
//   held:     turned upright, chimney up, as if picked up in a hand; follows the pointer through a
//             spring-damper, leans with motion; kept out of the ashtray, the cigarette, the table
//   lit:      press and hold the flame button (or Space): the button sinks, a spark, the flame grows
//             in 80 ms; it flickers, sputters now and then, bends away from motion and blows out if
//             swung too fast
//   dropped:  falls (core/body.js), tips onto its side, settles; the flame goes out
//   reaching: near a cigarette's end it is brought in as a hand would, angled so the flame meets
//             the end while the lighter stays clear of the ashtray, the table and the cigarette
//   home:     glides back to where it lay (Escape, the reset button)
import * as THREE from 'three'
import { createBody } from '../core/body.js'
import { noise3 } from '../core/noise.js'
import { LIGHTER, CHIMNEY } from './lighterGeo.js'
import flameVert from '../shaders/flame.vert'
import flameFrag from '../shaders/flame.frag'
import sparkVert from '../shaders/spark.vert'
import sparkFrag from '../shaders/spark.frag'

const H = LIGHTER.h
const HW = LIGHTER.w / 2
const HD = LIGHTER.d / 2
const NOZZLE = LIGHTER.bodyTop + 4.6 // (the flame's base, up the lighter's axis from its centre)
const FLAME_LEN = 22
const RISE = 1.2 // (a tilted lighter's flame still rises: its direction is the nozzle's plus this much up)
// the poses tried when reaching for an end: the chimney upright down to tipped below level, all round
const BETAS = [90, 62, 36, 12, -12, -32].map((d) => (d * Math.PI) / 180)
const PSIS = 12

/**
 * The chimney: the oval wall swept round, outer face, rounded lip, inner face (a few thousand
 * triangles; its holes are cut in the shader). aZone: steel, and the chimney's own flag.
 */
function chimneyGeometry(segs = 96) {
  const C = CHIMNEY
  const g0 = C.grow
  const w = C.wall + 2 * g0
  // the profile: [offset out from the oval, y, normal (out, up)]
  const prof = []
  const yTop = C.y1 - w / 2
  prof.push([g0, C.y0, 1, 0], [g0, yTop, 1, 0])
  for (let k = 1; k < 8; k++) {
    const t = (k / 8) * Math.PI
    prof.push([g0 - w / 2 + (w / 2) * Math.cos(t), yTop + (w / 2) * Math.sin(t), Math.cos(t), Math.sin(t)])
  }
  prof.push([g0 - w, yTop, -1, 0], [g0 - w, C.y0, -1, 0])
  const n = (segs + 1) * prof.length
  const pos = new Float32Array(n * 3)
  const nrm = new Float32Array(n * 3)
  const col = new Float32Array(n * 3).fill(1)
  const zone = new Float32Array(n * 2)
  let v = 0
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2
    const ex = C.a * Math.cos(t)
    const ez = C.b * Math.sin(t)
    // the oval's outward normal there
    let nx = Math.cos(t) / C.a
    let nz = Math.sin(t) / C.b
    const l = Math.hypot(nx, nz)
    nx /= l
    nz /= l
    for (const [o, y, pn, py] of prof) {
      pos.set([ex + nx * o, y, ez + nz * o], v * 3)
      nrm.set([nx * pn, py, nz * pn], v * 3)
      zone.set([1, 1], v * 2)
      v++
    }
  }
  const idx = []
  const P = prof.length
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < P - 1; j++) {
      const a = i * P + j
      const b = (i + 1) * P + j
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setAttribute('aZone', new THREE.BufferAttribute(zone, 2))
  g.setIndex(idx)
  return g
}

/** The flame: a camera-facing card shaped in its shader (no edges, no outline), additive. */
function flameMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uFlame: U.uFlame, uSeed: { value: 0.37 } },
    vertexShader: flameVert,
    fragmentShader: flameFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
    side: THREE.DoubleSide,
  })
}

/**
 * sdf(x, y, z): the ashtray's distance; sdfGrad(x, y, z, g): the same with its gradient;
 * groundGrad: what it lands on when dropped (the ashtray and the cigarette); cigCapsule(p, n): the
 * cigarette's distance (and normal); target: the cigarette's ends this frame, kept up to date by
 * the scene: { on, foot: Vector3, filter: Vector3, filterOn, axis: Vector3 (unit, filter to foot) }
 */
export function createLighter({ mesh, tex, U, sdf, sdfGrad, groundGrad, cigCapsule, target, onIgnite, rest = { x: -30, z: 92, theta: 0 } }) {
  // ---- materials: olive anodized aluminium (bead-blasted), brushed steel chimney, polished button
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.62, roughness: 0.46, vertexColors: true })
  bodyMat.onBeforeCompile = (sh) => {
    sh.uniforms.tBead = { value: tex.bead }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aZone;\nvarying vec2 vZone;\nvarying vec3 vLP;\nvarying vec3 vLN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZone = aZone;\nvLP = position;\nvLN = normal;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vZone; varying vec3 vLP; varying vec3 vLN; uniform sampler2D tBead;
        float steel; vec3 beadN;
        vec4 tri(vec3 p, vec3 n, float s) { vec3 w = pow(abs(n), vec3(4.0)); w /= dot(w, vec3(1.0));
          return texture2D(tBead, p.yz * s) * w.x + texture2D(tBead, p.zx * s) * w.y + texture2D(tBead, p.xy * s) * w.z; }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        steel = vZone.x;
        if (vZone.y > 0.5 && abs(vLP.y - ${CHIMNEY.holeY.toFixed(2)}) < ${(CHIMNEY.holeR + 0.1).toFixed(2)}) {
          // the chimney's row of holes
          float ang = atan(vLP.z / ${CHIMNEY.b.toFixed(2)}, vLP.x / ${CHIMNEY.a.toFixed(2)});
          float per = 6.2831853 / ${CHIMNEY.holes.toFixed(1)};
          float ha = floor(ang / per + 0.5) * per;
          vec2 hc = vec2(cos(ha) * ${CHIMNEY.a.toFixed(2)}, sin(ha) * ${CHIMNEY.b.toFixed(2)});
          if (length(vec2(length(vLP.xz - hc), vLP.y - ${CHIMNEY.holeY.toFixed(2)})) < ${CHIMNEY.holeR.toFixed(2)}) discard;
        }
        vec4 bead = tri(vLP, normalize(vLN), 0.35);
        // (linear) deep olive, a little uneven; steel; the parting line and the screw's head ring
        vec3 olive = vec3(0.092, 0.104, 0.05) * (0.92 + 0.16 * bead.a);
        vec3 st = vec3(0.56, 0.56, 0.55) * (0.94 + 0.08 * bead.g);
        float part = (1.0 - smoothstep(0.06, 0.16, abs(vLP.y - 14.0))) * (1.0 - steel);
        float screw = (1.0 - smoothstep(0.08, 0.16, abs(length(vLP.xz) - 1.25))) * step(vLP.y, -30.4);
        diffuseColor.rgb = mix(olive, st, steel) * (1.0 - 0.55 * part - 0.6 * screw) * vColor.rgb;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        // bead-blast: an even satin; the chimney brushed (streaks round it)
        roughnessFactor = mix(0.46 + 0.06 * bead.b, 0.24 + 0.12 * bead.r, steel);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(0.45, 1.0, steel);`,
      )
  }
  bodyMat.customProgramCacheKey = () => 'lighter-body'
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3))
  const ao = new Float32Array(mesh.ao.length * 3)
  for (let i = 0; i < mesh.ao.length; i++) ao[i * 3] = ao[i * 3 + 1] = ao[i * 3 + 2] = 0.55 + 0.45 * mesh.ao[i]
  g.setAttribute('color', new THREE.BufferAttribute(ao, 3))
  g.setAttribute('aZone', new THREE.BufferAttribute(mesh.zone, 2))
  g.setIndex(new THREE.BufferAttribute(mesh.indices, 1))
  const body = new THREE.Mesh(g, bodyMat)
  body.castShadow = body.receiveShadow = true
  const chimney = new THREE.Mesh(chimneyGeometry(), bodyMat)
  chimney.castShadow = chimney.receiveShadow = true
  // the push button: a pill, flush in its recess on the +x side; it sinks when pressed
  const B = LIGHTER.button
  const btnGeo = new THREE.CapsuleGeometry(B.w / 2 - 0.15, B.len - B.w, 6, 24)
  btnGeo.scale(0.32, 1, 1)
  const btnMat = new THREE.MeshPhysicalMaterial({ color: 0xd6d6d4, metalness: 1, roughness: 0.12 })
  const btn = new THREE.Mesh(btnGeo, btnMat)
  btn.position.set(B.x - 0.42, B.y, 0)
  btn.castShadow = true
  // the flame, on the burner
  const flameMat = flameMaterial(U)
  const flameGeo = new THREE.PlaneGeometry(1, 1, 1, 8).translate(0, 0.5, 0)
  const flame = new THREE.Mesh(flameGeo, flameMat)
  flame.frustumCulled = false
  flame.renderOrder = 10
  const flameHolder = new THREE.Group() // (bends and stretches the flame)
  flameHolder.position.set(0, NOZZLE, 0)
  flameHolder.add(flame)
  // the spark: a brief flash at the nozzle
  const spark = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShaderMaterial({
    uniforms: { uSpark: { value: 0 } },
    vertexShader: sparkVert,
    fragmentShader: sparkFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
  }))
  spark.position.set(0, LIGHTER.bodyTop + 3.2, 0)
  spark.frustumCulled = false
  spark.renderOrder = 11
  const group = new THREE.Group()
  group.matrixAutoUpdate = false
  group.add(body, chimney, btn, flameHolder, spark)

  // ---- the rest pose: lying on its side in the pool of light, its length along rest.theta
  const REST = new THREE.Matrix4()
  {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, Math.PI / 2 - rest.theta, 0, 'YXZ'))
    REST.compose(new THREE.Vector3(rest.x, HD, rest.z), q, new THREE.Vector3(1, 1, 1))
  }
  group.matrix.copy(REST)

  // ---- physics when dropped: the slab as spheres on its rounded edges and faces
  const spheres = []
  for (const sx of [-1, 1]) for (const sy of [-1, 0, 1]) for (const sz of [-1, 1]) spheres.push([sx * (HW - 4.2), sy * (H / 2 - 5) - 1, sz * (HD - 4.2), 4.2])
  spheres.push([0, H / 2 - 5, 0, 5.5]) // (the chimney's end)
  // (the frame's arms about the lighter's own size: its contacts then lie within reach of the four
  // particles, and it comes to rest, still, instead of jittering)
  const phys = createBody({ spheres, s: 26, mass: [4, 1, 1, 1], sdf: groundGrad })

  const st = {
    mode: 'rest', // rest | held | fall | glide
    lit: 0, // the flame, 0..1
    glow: 0, // the flame's brightness this frame (its flicker): the light follows it
    want: false, // the button (or Space) held
    out: false, // blown out: needs a fresh press
    press: 0, // the button's travel, 0..1
    spark: 0,
    sputter: 0,
    P: new THREE.Vector3(),
    V: new THREE.Vector3(),
    T: new THREE.Vector3(), // where the pointer puts it
    G: new THREE.Vector3(), // where it is drawn to (the pointer's place, or a reach)
    off: new THREE.Vector3(),
    offSet: false,
    holdY: 0,
    yaw: 0,
    up: 0, // 0 lying, 1 upright (eased on pickup)
    q0: new THREE.Quaternion(),
    lean: new THREE.Vector2(),
    leanV: new THREE.Vector2(),
    bend: new THREE.Vector3(), // the flame's bend, world (springs back)
    bendV: new THREE.Vector3(),
    speed: 0,
    near: 0, // drawn towards an end
    reach: 0, // how far into a reach, 0..1
    stuck: 0, // (seconds held off the reach by something in the way)
    glideT: 0,
    flameDir: new THREE.Vector3(0, 1, 0), // world
    flameLen: 0, // mm
    blowSpeed: 900, // (mm/s: swung faster than this, the flame blows out)
  }
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const tv = new THREE.Vector3()
  const tw = new THREE.Vector3()
  const nd = new THREE.Vector3()
  const qa = new THREE.Quaternion()
  const qb = new THREE.Quaternion()
  const qc = new THREE.Quaternion()
  const m4 = new THREE.Matrix4()
  const one = new THREE.Vector3(1, 1, 1)
  const UP = new THREE.Vector3(0, 1, 0)
  const grad = new Float64Array(3)
  const fr = new Float64Array(12)
  const prevV = new THREE.Vector3()
  const acc = new THREE.Vector3()
  const flameTip = new THREE.Vector3()
  const flameBase = new THREE.Vector3()
  const eul = new THREE.Euler()
  const ax3 = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
  const restP = new THREE.Vector3()
  const restQ = new THREE.Quaternion()
  REST.decompose(restP, restQ, tv)
  const g0P = new THREE.Vector3()
  const g0Q = new THREE.Quaternion()
  const before = new THREE.Matrix4() // (where it was picked up from: a tap taken for a hold puts it back)

  /** The worst overlap of the lighter's spheres in this pose (matrix m) with the table, the ashtray, the cigarette; its normal in nd. */
  function overlap(m, withGrad) {
    let worst = 0
    let wi = -1
    for (let i = 0; i < spheres.length; i++) {
      const sp = spheres[i]
      tv.set(sp[0], sp[1], sp[2]).applyMatrix4(m)
      let d = Math.min(tv.y, sdf(tv.x, tv.y, tv.z)) - sp[3]
      const dc = cigCapsule(tv, tw) - sp[3]
      if (dc < d) d = dc
      if (d < worst) {
        worst = d
        wi = i
      }
    }
    if (withGrad && wi >= 0) {
      const sp = spheres[wi]
      tv.set(sp[0], sp[1], sp[2]).applyMatrix4(m)
      const dt = sdfGrad(tv.x, tv.y, tv.z, grad)
      const dc = cigCapsule(tv, tw)
      if (tv.y <= dt && tv.y <= dc) nd.set(0, 1, 0)
      else if (dt <= dc) nd.set(grad[0], grad[1], grad[2])
      else nd.copy(tw)
    }
    return worst
  }
  /** Keep the held lighter out of the ashtray, the cigarette and the table. */
  function collide() {
    for (let it = 0; it < 3; it++) {
      const worst = overlap(group.matrix, true)
      if (worst >= 0) return
      st.P.addScaledVector(nd, -worst)
      group.matrix.elements[12] = st.P.x
      group.matrix.elements[13] = st.P.y
      group.matrix.elements[14] = st.P.z
    }
  }

  // ---- reaching for an end (see the top): the best pose for it, searched a few candidates a frame
  const reach = {
    end: -1, // which end the search is for: 0 the foot, 1 the filter
    C: new THREE.Vector3(), // the point the flame should meet
    i: 0,
    n: BETAS.length * PSIS,
    score: Infinity,
    q: new THREE.Quaternion(),
    p: new THREE.Vector3(), // the lighter's centre in that pose
    side: new THREE.Vector3(),
    // (a search in progress keeps its best here; it replaces the pose above once it is done, so a
    // search again for the same end never leaves the lighter in a half-searched pose meanwhile)
    has: false,
    cScore: Infinity,
    cq: new THREE.Quaternion(),
    cp: new THREE.Vector3(),
  }
  const cu = new THREE.Vector3()
  const cx = new THREE.Vector3()
  const cz = new THREE.Vector3()
  const cm = new THREE.Matrix4()
  const cB = new THREE.Vector3()
  const cD = new THREE.Vector3()
  const cP = new THREE.Vector3()
  /** Distance from point p to the flame's segment (from base B along d, len mm). */
  function segDist(p, B, d, len) {
    tw.subVectors(p, B)
    const t = Math.min(len, Math.max(1, tw.dot(d)))
    return tw.addScaledVector(d, -t).length()
  }
  function tryPose(k) {
    const bi = Math.floor(k / PSIS)
    const beta = BETAS[bi]
    if (bi === 0 && k % PSIS >= 6) return // (upright: half a turn of yaws is all of them)
    const psi = ((k % PSIS) / PSIS) * Math.PI * 2
    const hx = Math.cos(psi)
    const hz = Math.sin(psi)
    const cb = Math.cos(beta)
    const sb = Math.sin(beta)
    // its axis u (towards the end); its broad faces as level as they go (flat when it is level)
    cu.set(cb * hx, sb, cb * hz)
    cx.set(-hz, 0, hx)
    cz.crossVectors(cx, cu)
    cm.makeBasis(cx, cu, cz)
    // the flame rises from the nozzle: its base placed so the flame passes through the end
    cD.copy(cu).addScaledVector(UP, RISE).normalize()
    cB.copy(reach.C).addScaledVector(cD, -7)
    cP.copy(cB).addScaledVector(cu, -NOZZLE)
    cm.setPosition(cP)
    // pushed clear (it may not quite reach then)
    let pen = 0
    for (let it = 0; it < 3; it++) {
      pen = overlap(cm, true)
      if (pen >= 0) break
      cP.addScaledVector(nd, -pen)
      cm.setPosition(cP)
    }
    pen = Math.min(0, overlap(cm, false))
    cB.copy(cP).addScaledVector(cu, NOZZLE)
    const miss = segDist(reach.C, cB, cD, FLAME_LEN * 0.8)
    const score = Math.max(0, miss - 3) * 10 - pen * 30 + (1 - sb) * 2.5 + (1 - (hx * reach.side.x + hz * reach.side.z)) * 4
    if (score < reach.cScore) {
      reach.cScore = score
      reach.cq.setFromRotationMatrix(cm)
      reach.cp.copy(cP)
    }
  }
  /** Start a search for the current end, preferring the side of `from` (where the lighter is). */
  function searchFrom(from) {
    reach.i = 0
    reach.cScore = Infinity
    reach.side.set(reach.C.x - from.x, 0, reach.C.z - from.z)
    if (reach.side.lengthSq() < 1e-6) reach.side.set(1, 0, 0)
    reach.side.normalize()
  }
  /** Which end the pointer has the flame over, and how close (0 none .. 1 there). Only while it burns. */
  function reachWeight() {
    if (!target.on || !(st.want && !st.out)) return 0
    // the flame (upright, over where the pointer holds it) against each end, seen from above
    // (the filter end only of an unlit cigarette: nobody brings a flame to a lit one's filter)
    const df = Math.hypot(st.T.x - target.foot.x, st.T.z - target.foot.z)
    const dl = target.filterOn ? Math.hypot(st.T.x - target.filter.x, st.T.z - target.filter.z) : Infinity
    const end = df <= dl ? 0 : 1
    const d = Math.min(df, dl)
    const w = 1 - THREE.MathUtils.smoothstep(d, 12, 30)
    if (w <= 0) return 0
    // the end's point: just past its face, where the flame should lick it
    if (end === 0) tv.copy(target.foot).addScaledVector(target.axis, 1.5)
    else tv.copy(target.filter).addScaledVector(target.axis, -1.5)
    if (end !== reach.end || tv.distanceToSquared(reach.C) > 1) {
      // a new end (or it moved): search again, from the side the lighter comes from
      reach.end = end
      reach.C.copy(tv)
      reach.has = false
      searchFrom(st.P)
    }
    if (reach.i < reach.n) {
      for (let k = 0; k < 6 && reach.i < reach.n; k++) tryPose(reach.i++) // (~0.6 ms a frame, done in 12)
      if (reach.i >= reach.n) {
        // (done: the pose it found; the reach starts only then, a fifth of a second in)
        reach.score = reach.cScore
        reach.q.copy(reach.cq)
        reach.p.copy(reach.cp)
        reach.has = reach.score < Infinity
      }
    }
    return reach.has ? w : 0
  }

  const api = {
    group,
    meshes: [body, chimney, btn],
    st,
    flame,
    btn,
    flameTip,
    flameBase,
    get busy() {
      return st.mode !== 'rest' || st.lit > 0 || st.spark > 0 || st.press > 0.01
    },
    /** World positions of the flame's base and tip (for lighting things). */
    flamePoints() {
      flameBase.set(0, NOZZLE, 0).applyMatrix4(group.matrix)
      flameTip.copy(flameBase).addScaledVector(st.flameDir, st.flameLen * 0.85)
      return flameTip
    },
    /** How far point p is from the flame (mm; Infinity while it is out). */
    flameDist(p) {
      if (st.lit <= 0.05) return Infinity
      api.flamePoints()
      return segDist(p, flameBase, st.flameDir, st.flameLen * 0.9)
    },
    reset() {
      st.mode = 'rest'
      st.lit = 0
      st.glow = 0
      st.want = false
      st.out = false
      st.press = 0
      st.reach = 0
      group.matrix.copy(REST)
      group.matrixWorldNeedsUpdate = true
    },
    pick(hitPoint) {
      before.copy(group.matrix)
      st.P.setFromMatrixPosition(group.matrix)
      st.V.set(0, 0, 0)
      group.matrix.decompose(tv, st.q0, tw)
      // the yaw it faces: its thin side towards the camera, so the flame shows
      st.yaw = 0
      st.up = 0
      st.reach = 0
      reach.end = -1
      reach.has = false
      // (held a little above the table, as a hand holds it ready: the flame stays in the picture)
      st.holdY = Math.max(st.P.y, H / 2 + 2) + 6
      st.T.copy(st.P)
      st.T.y = st.holdY
      st.offSet = false
      st.lean.set(0, 0)
      st.leanV.set(0, 0)
      st.mode = 'held'
      void hitPoint
    },
    aim(r) {
      plane.constant = -st.holdY
      if (!r.intersectPlane(plane, tw)) return
      if (!st.offSet) {
        st.off.set(st.P.x - tw.x, 0, st.P.z - tw.z)
        st.offSet = true
      }
      tw.add(st.off)
      const rr = Math.hypot(tw.x, tw.z)
      if (rr > 170) {
        const k = (170 + 45 * Math.tanh((rr - 170) / 45)) / rr
        tw.x *= k
        tw.z *= k
      }
      st.T.copy(tw)
    },
    twist(rad) {
      st.yaw += rad
    },
    cancel() {
      st.want = false
      st.lit = 0
      st.reach = 0
      group.matrix.copy(before)
      group.matrixWorldNeedsUpdate = true
      st.mode = 'rest'
    },
    release() {
      if (st.mode !== 'held') return
      // the flame goes out; it falls, tips over and settles
      st.want = false
      st.lit = 0
      group.matrix.decompose(tv, qa, tw)
      const [ax, ay, az] = ax3
      ax.set(1, 0, 0).applyQuaternion(qa)
      ay.set(0, 1, 0).applyQuaternion(qa)
      az.set(0, 0, 1).applyQuaternion(qa)
      phys.set([tv.x, tv.y, tv.z], [ax.x, ax.y, ax.z], [ay.x, ay.y, ay.z], [az.x, az.y, az.z], [st.V.x, st.V.y, st.V.z])
      st.mode = 'fall'
    },
    /** Back where it lay, the flame out (a short glide). */
    home() {
      st.want = false
      st.lit = 0
      st.reach = 0
      if (st.mode === 'rest' && group.matrix.equals(REST)) return
      group.matrix.decompose(g0P, g0Q, tv)
      st.glideT = 0
      st.mode = 'glide'
    },
    /** The dropped lighter, for the physics scheduler (core/physics.js). */
    physics: { awake: () => st.mode === 'fall' && phys.awake, step: (h) => phys.step(h) },
    /** The button (or Space): pressed or let go. */
    ignite(on) {
      if (on && st.mode === 'held' && !st.want) {
        st.want = true
        st.out = false
        st.spark = 1
        onIgnite()
      }
      if (!on) {
        st.want = false
        st.out = false
      }
    },
    update(dt, time) {
      if (st.mode === 'held') {
        // drawn to the pointer, or (near an end) into the reach for it
        const w = reachWeight()
        st.reach += (w - st.reach) * Math.min(1, dt * 7)
        const e = st.reach * st.reach * (3 - 2 * st.reach)
        st.G.copy(st.T)
        if (e > 0.001) {
          // (in the reach the pointer still moves it a little: pulling away pulls the flame off)
          tv.copy(reach.p)
          tv.x += (st.T.x - reach.C.x) * 0.35
          tv.z += (st.T.z - reach.C.z) * 0.35
          st.G.lerp(tv, e)
          // (on the way in it goes up and over, as a hand would, not through the cigarette: high
          // until it is over its place, then down into it)
          if (Math.hypot(st.P.x - st.G.x, st.P.z - st.G.z) > 8) st.G.y = Math.max(st.G.y, 74)
        }
        prevV.copy(st.V)
        const k = 200
        const damp = 2 * Math.sqrt(k) * 0.72
        for (let i = 0; i < 3; i++) {
          const h = dt / 3
          st.V.x += (k * (st.G.x - st.P.x) - damp * st.V.x) * h
          st.V.y += (k * (st.G.y - st.P.y) - damp * st.V.y) * h
          st.V.z += (k * (st.G.z - st.P.z) - damp * st.V.z) * h
          st.P.addScaledVector(st.V, h)
        }
        acc.subVectors(st.V, prevV).divideScalar(Math.max(dt, 1e-4))
        // it leans a little with the motion (a spring on its tilt)
        const kl = 80
        const cl = 2 * Math.sqrt(kl) * 0.5
        st.leanV.x += (-kl * st.lean.x - cl * st.leanV.x + (acc.z / 9000) * kl * 0.25) * dt
        st.leanV.y += (-kl * st.lean.y - cl * st.leanV.y - (acc.x / 9000) * kl * 0.25) * dt
        st.lean.x = THREE.MathUtils.clamp(st.lean.x + st.leanV.x * dt, -0.3, 0.3)
        st.lean.y = THREE.MathUtils.clamp(st.lean.y + st.leanV.y * dt, -0.3, 0.3)
        // from lying to upright, as if picked up in a hand; then into the reach
        st.up = Math.min(1, st.up + dt / 0.35)
        const eu = st.up * st.up * (3 - 2 * st.up)
        qb.setFromEuler(eul.set(st.lean.x, st.yaw, st.lean.y))
        if (e > 0.001) {
          qc.setFromEuler(eul.set(st.lean.x * 0.4, 0, st.lean.y * 0.4))
          qc.premultiply(reach.q)
          qb.slerp(qc, e)
        }
        qa.slerpQuaternions(st.q0, qb, eu)
        m4.compose(st.P, qa, one)
        group.matrix.copy(m4)
        collide()
        // held off its reach by something in the way: look again, from where it actually is
        // (once a search is done; the pose it has stays until the new one is found)
        if (e > 0.95 && reach.i >= reach.n && st.P.distanceToSquared(st.G) > 36) st.stuck += dt
        else st.stuck = 0
        if (st.stuck > 0.35) {
          st.stuck = 0
          searchFrom(st.P)
        }
        group.matrixWorldNeedsUpdate = true
        st.speed = st.V.length()
      } else if (st.mode === 'fall') {
        // (the body is stepped by the physics scheduler: core/physics.js)
        phys.frame(fr)
        group.matrix.makeBasis(tv.set(fr[3], fr[4], fr[5]), tw.set(fr[6], fr[7], fr[8]), nd.set(fr[9], fr[10], fr[11]))
        group.matrix.setPosition(fr[0], fr[1], fr[2])
        group.matrixWorldNeedsUpdate = true
        st.speed = 0
        if (!phys.awake) st.mode = 'rest'
      } else if (st.mode === 'glide') {
        st.glideT = Math.min(1, st.glideT + dt / 0.6)
        const e = st.glideT < 0.5 ? 4 * st.glideT ** 3 : 1 - (-2 * st.glideT + 2) ** 3 / 2
        tv.lerpVectors(g0P, restP, e)
        tv.y += Math.sin(Math.PI * e) * 14
        qa.slerpQuaternions(g0Q, restQ, e)
        group.matrix.compose(tv, qa, one)
        group.matrixWorldNeedsUpdate = true
        st.speed = 0
        if (st.glideT >= 1) {
          group.matrix.copy(REST)
          st.mode = 'rest'
        }
      }
      // the flame: grows in 80 ms, goes out at once; blown out by a fast swing
      if (st.want && !st.out && st.speed > st.blowSpeed) {
        st.out = true
        st.want = false
      }
      const on = st.want && !st.out && st.mode === 'held'
      st.lit = on ? Math.min(1, st.lit + dt / 0.08) : 0
      st.press += ((st.want ? 1 : 0) - st.press) * Math.min(1, dt * 30)
      if (st.press < 0.001) st.press = 0
      btn.position.x = LIGHTER.button.x - 0.42 - 0.7 * st.press
      st.spark = Math.max(0, st.spark - dt / 0.07)
      spark.material.uniforms.uSpark.value = st.spark
      spark.visible = st.spark > 0
      // it flickers (layered noise) and now and then sputters; the light follows the same flicker
      if (st.lit > 0 && Math.random() < dt * 0.25) st.sputter = 1
      st.sputter = Math.max(0, st.sputter - dt / 0.18)
      const flick = 0.9 + 0.07 * noise3(time * 9, 0.3, 0.7) + 0.05 * noise3(time * 23, 4.1, 0.2) - 0.35 * st.sputter * (0.5 + 0.5 * Math.sin(time * 80))
      st.glow = st.lit * flick
      U.uFlame.value = st.glow
      flame.visible = st.lit > 0
      if (st.lit <= 0) {
        st.bend.set(0, 0, 0)
        st.bendV.set(0, 0, 0)
        st.near = 0
        st.flameLen = 0
        return api.busy
      }
      // the flame rises (a tilted lighter's too); it bends and stretches away from the motion and
      // springs back; near an end it is drawn in towards it
      group.matrix.decompose(tv, qa, tw)
      cu.set(0, 1, 0).applyQuaternion(qa)
      nd.copy(cu).addScaledVector(UP, RISE).normalize()
      nd.addScaledVector(st.V, -1 / 900)
      flameBase.set(0, NOZZLE, 0).applyMatrix4(group.matrix)
      st.near = 0
      if (target.on && reach.end >= 0) {
        tw.subVectors(reach.C, flameBase)
        const dd = tw.length()
        st.near = THREE.MathUtils.clamp(1 - (dd - 8) / 22, 0, 1)
        nd.addScaledVector(tw.normalize(), 0.5 * st.near)
      }
      const ks = 160
      const cs = 2 * Math.sqrt(ks) * 0.5
      st.bendV.x += (ks * (nd.x - st.bend.x) - cs * st.bendV.x) * dt
      st.bendV.y += (ks * (nd.y - st.bend.y) - cs * st.bendV.y) * dt
      st.bendV.z += (ks * (nd.z - st.bend.z) - cs * st.bendV.z) * dt
      st.bend.addScaledVector(st.bendV, dt)
      if (st.bend.lengthSq() < 1e-4) st.bend.copy(nd)
      st.flameDir.copy(st.bend).normalize()
      const stretch = 1 + Math.min(0.6, st.speed / 1500) - 0.12 * st.near
      st.flameLen = FLAME_LEN * stretch * st.lit
      // (the flame's y axis in the lighter's frame: bent and stretched; x and z stay unit)
      qa.invert()
      tv.copy(st.flameDir).applyQuaternion(qa).multiplyScalar(stretch)
      flameHolder.matrixAutoUpdate = false
      flameHolder.matrix.makeBasis(tw.set(1, 0, 0), tv, nd.set(0, 0, 1)).setPosition(0, NOZZLE, 0)
      flameHolder.matrixWorldNeedsUpdate = true
      return api.busy
    },
  }
  return api
}
