// An energy drink, open: a slim 355 ml can (58 x 150 mm) in white with a small lime mark, of a
// made-up brand ("late."). Knocked over it falls as a rigid body (core/body.js: rings of spheres
// round its axis, so it lands on its side and rolls a little), the drink pours from its mouth in
// drops and spreads on the desk in a puddle (a few circles, grown as the drink lands, joined
// smoothly in the puddle's shader). Stood up again it is full, and the puddle dries.
// Frame: the can's own, y up its axis from its bottom (y = 0), its front (the brand) at +x.
import * as THREE from 'three'
import { createBody } from '../core/body.js'

export const CAN = { r: 29, h: 150, com: 66, lidY: 146.4, mouth: 11.5 }
const MAX_BLOBS = 10
const DROPS = 40
const G = -9810

/** The label (sRGB): warm white, the brand up the front, fine print on the back, a lime band. */
function labelCanvas(font) {
  const W = 1024
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#f3f2ee'
  g.fillRect(0, 0, W, H)
  // (the band near the bottom, all the way round)
  g.fillStyle = '#bfe23a'
  g.fillRect(0, H - 34, W, 9)
  // the brand, up the front (u = 0.25 is the can's +x)
  const fx = W * 0.25
  g.save()
  g.translate(fx + 40, H * 0.5)
  g.rotate(-Math.PI / 2)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `700 150px ${font}`
  const word = 'late'
  const ww = g.measureText(word).width
  g.fillStyle = '#1d1f24'
  g.fillText(word, -20, 0)
  g.fillStyle = '#b4db2c'
  g.beginPath()
  g.arc(-20 + ww / 2 + 22, 38, 16, 0, Math.PI * 2)
  g.fill()
  g.restore()
  g.save()
  g.translate(fx - 62, H * 0.5)
  g.rotate(-Math.PI / 2)
  g.textAlign = 'center'
  g.fillStyle = '#7b7f86'
  g.font = `600 26px ${font}`
  g.fillText('SPARKLING ENERGY', 0, 0)
  g.restore()
  g.fillStyle = '#7b7f86'
  g.font = `600 24px ${font}`
  g.textAlign = 'center'
  g.fillText('355 ml', fx, H - 52)
  g.textAlign = 'left'
  // the back: fine print and a code
  const bx = W * 0.75 - 110
  g.fillStyle = '#c4c4bf'
  for (let i = 0; i < 12; i++) g.fillRect(bx, 92 + i * 22, 220 - (i % 3) * 30, 8)
  g.fillStyle = '#2a2c31'
  for (let i = 0; i < 26; i++) {
    const w = 2 + ((i * 7) % 5)
    g.fillRect(bx + 30 + i * 6.4, 380, w, 54)
  }
  return c
}

/** The can's profile, [r, y] from the middle of its bottom round to the middle of its lid. */
const BOTTOM = [
  [0, 3.4],
  [12, 2.6],
  [19, 1.3],
  [21.4, 0],
  [23.4, 0.25],
  [25.4, 2.4],
  [27.6, 5.6],
  [28.6, 8],
]
const BODY = [
  [28.6, 8],
  [29, 12],
  [29, 124],
  [28.4, 130],
  [27.1, 135],
]
const TOP = [
  [27.1, 135],
  [25.7, 141],
  [25.2, 145.6],
  [25.9, 147.5],
  [25.6, 149.5],
  [24.6, 149.7],
  [23.9, 147.8],
  [23.0, CAN.lidY],
  [0, CAN.lidY],
]
const lathe = (pts, segs) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs)

/**
 * home: { x, y, z } (world: the middle of its bottom, on the desk), yaw: its turn (rad);
 * sdf(x, y, z, g): what it collides with besides the desk (world, mm; g: the gradient); floorY: the
 * desk's height; clear(x, z): how far a point of the desk is from anything the can must not land
 * on (mm); font: a loaded CSS family for the label; onLand(): it hit the desk.
 */
export function createCan({ home, yaw, sdf, floorY, clear, font, anisotropy = 4, onLand = () => {} }) {
  const group = new THREE.Group()
  group.matrixAutoUpdate = false
  const geometries = []
  const materials = []
  const textures = []

  // ---- the can
  const labelTex = new THREE.CanvasTexture(labelCanvas(font))
  labelTex.colorSpace = THREE.SRGBColorSpace
  labelTex.anisotropy = anisotropy
  textures.push(labelTex)
  const printed = new THREE.MeshPhysicalMaterial({ map: labelTex, roughness: 0.36, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.18 })
  const alu = new THREE.MeshPhysicalMaterial({ color: 0xd6d9dd, metalness: 1, roughness: 0.27 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 })
  materials.push(printed, alu, dark)
  const bodyGeo = lathe(BODY, 64)
  {
    // (the label's v by height, its u round the can as the lathe gives it)
    const p = bodyGeo.attributes.position
    const uv = bodyGeo.attributes.uv
    for (let i = 0; i < p.count; i++) uv.setY(i, (p.getY(i) - 8) / (135 - 8))
  }
  const bottomGeo = lathe(BOTTOM, 64)
  const topGeo = lathe(TOP, 64)
  geometries.push(bodyGeo, bottomGeo, topGeo)
  // the tab, a flat loop lying on the lid; the opening, dark, in front of it
  const tabShape = new THREE.Shape()
  {
    const w = 9
    const l = 19
    tabShape.absarc(0, l / 2 - w / 2, w / 2, 0, Math.PI, false)
    tabShape.absarc(0, -l / 2 + w / 2, w / 2, Math.PI, Math.PI * 2, false)
    const hole = new THREE.Path()
    hole.absellipse(0, -2.5, 2.6, 4.4, 0, Math.PI * 2, true)
    tabShape.holes.push(hole)
  }
  const tabGeo = new THREE.ShapeGeometry(tabShape, 10).rotateX(-Math.PI / 2).rotateY(Math.PI / 2)
  tabGeo.translate(-3, CAN.lidY + 0.5, 0)
  const holeGeo = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2)
  holeGeo.scale(7.2, 1, 5.8)
  holeGeo.translate(CAN.mouth, CAN.lidY + 0.05, 0)
  geometries.push(tabGeo, holeGeo)
  const parts = [new THREE.Mesh(bodyGeo, printed), new THREE.Mesh(bottomGeo, alu), new THREE.Mesh(topGeo, alu), new THREE.Mesh(tabGeo, alu), new THREE.Mesh(holeGeo, dark)]
  for (const m of parts) m.castShadow = true
  const canMesh = new THREE.Group()
  canMesh.add(...parts)
  group.add(canMesh)

  // ---- its body: rings of spheres round the axis, about its centre of mass (the drink low in it)
  const spheres = []
  for (const [y, rr, sr] of [
    [6.4, 22.4, 6.4],
    [40, 22.6, 6.4],
    [75, 22.6, 6.4],
    [110, 22.6, 6.4],
    [140, 20.2, 5.8],
  ])
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2
      spheres.push([Math.sin(a) * rr, y - CAN.com, Math.cos(a) * rr, sr])
    }
  // (its particles 80 mm apart: about the can's own size, so a sphere at its rim is pushed through
  // weights near one, and a knock turns it over its rim rather than sliding it)
  const body = createBody({ spheres, s: 80, mass: [5, 1, 1, 1], sdf, floorY, friction: 6 })
  const F = new Float64Array(12)
  const pose = new THREE.Matrix4()
  const homeM = new THREE.Matrix4().makeRotationY(yaw).setPosition(home.x, home.y, home.z)
  const ax = new THREE.Vector3()
  const ay = new THREE.Vector3()
  const az = new THREE.Vector3()
  const tv = new THREE.Vector3()

  // ---- the drink: the puddle (a plane on the desk; its shape in the shader) and the drops
  const SPAN = 760
  const puddleGeo = new THREE.PlaneGeometry(SPAN, SPAN).rotateX(-Math.PI / 2)
  geometries.push(puddleGeo)
  const blobU = { value: Array.from({ length: MAX_BLOBS }, () => new THREE.Vector3(0, 0, -1)) }
  const fadeU = { value: 1 }
  // (no clearcoat: its normal would ignore the meniscus; the drink's own surface is sharp enough)
  const puddleMat = new THREE.MeshPhysicalMaterial({ color: 0xe1e78f, roughness: 0.035, metalness: 0, specularIntensity: 1, transparent: true, depthWrite: false })
  puddleMat.onBeforeCompile = (sh) => {
    sh.uniforms.uBlobs = blobU
    sh.uniforms.uFade = fadeU
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vPud;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPud = position.xz;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vPud;
        uniform vec3 uBlobs[${MAX_BLOBS}];
        uniform float uFade;
        float pudHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        float pudNoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(pudHash(i), pudHash(i + vec2(1.0, 0.0)), f.x), mix(pudHash(i + vec2(0.0, 1.0)), pudHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        // (the puddle's edge: the circles joined smoothly, and a wandering edge, as a spill's is)
        float pudSdf(vec2 p) {
          float d = 1e4;
          for (int i = 0; i < ${MAX_BLOBS}; i++) {
            vec3 b = uBlobs[i];
            if (b.z <= 0.0) continue;
            float di = length(p - b.xy) - b.z;
            float k = 9.0;
            float h = clamp(0.5 + 0.5 * (d - di) / k, 0.0, 1.0);
            d = mix(d, di, h) - k * h * (1.0 - h);
          }
          return d + (pudNoise(p * 0.055) - 0.5) * 7.0 + (pudNoise(p * 0.16) - 0.5) * 2.2;
        }`,
      )
      .replace(
        '#include <alphatest_fragment>',
        `#include <alphatest_fragment>
        float pd = pudSdf(vPud);
        float aa = max(fwidth(pd), 0.3);
        // (thin in the middle, a darker rim where the meniscus stands)
        float pa = smoothstep(aa, -aa, pd);
        float rim = smoothstep(-5.0, -0.5, pd) * pa;
        diffuseColor.a = (0.55 + 0.3 * rim) * pa * uFade;
        diffuseColor.rgb *= 1.0 - 0.16 * rim;
        if (diffuseColor.a < 0.002) discard;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          // (the meniscus: the surface curls down at the edge; the highlight runs round it)
          float e = 0.8;
          vec2 gpd = vec2(pudSdf(vPud + vec2(e, 0.0)) - pudSdf(vPud - vec2(e, 0.0)), pudSdf(vPud + vec2(0.0, e)) - pudSdf(vPud - vec2(0.0, e))) / (2.0 * e);
          float slope = smoothstep(-4.0, 0.0, pd) * 1.6;
          vec3 nWorld = normalize(vec3(gpd.x * slope, 1.0, gpd.y * slope));
          normal = normalize((viewMatrix * vec4(nWorld, 0.0)).xyz);
        }`,
      )
  }
  puddleMat.customProgramCacheKey = () => 'can.puddle'
  materials.push(puddleMat)
  const puddle = new THREE.Mesh(puddleGeo, puddleMat)
  puddle.receiveShadow = true
  puddle.renderOrder = 2
  puddle.visible = false
  puddle.frustumCulled = false
  // (the plane's own frame: its middle at the can's home, on the desk)
  puddle.position.set(home.x, floorY + 0.14, home.z)
  const dropGeo = new THREE.IcosahedronGeometry(1, 1)
  geometries.push(dropGeo)
  const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xd6e05a, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.82 })
  materials.push(dropMat)
  const drops = new THREE.InstancedMesh(dropGeo, dropMat, DROPS)
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  drops.frustumCulled = false
  drops.visible = false
  const dp = new Float64Array(DROPS * 3)
  const dv = new Float64Array(DROPS * 3)
  const ds = new Float64Array(DROPS)
  const dAlive = new Uint8Array(DROPS)

  // ---- state
  const st = {
    mode: 'standing', // standing | falling | lying | rising
    fill: 1, // (the drink still in it, 0..1)
    t: 0,
    fromM: new THREE.Matrix4(),
    blobs: [], // { x, z (puddle frame), r, vol, kids: [{ a, o, k }] }
    fade: 1,
    drying: false,
    landed: false,
    pourAcc: 0,
  }
  let rnd = 1
  const rand = () => {
    rnd = (rnd * 16807) % 2147483647
    return rnd / 2147483647
  }

  function placeStanding() {
    pose.copy(homeM)
    group.matrix.copy(pose)
    group.matrixWorldNeedsUpdate = true
  }
  placeStanding()

  /** The axes and the centre of mass of the pose. */
  function comOf(m, out) {
    return out.set(0, CAN.com, 0).applyMatrix4(m)
  }

  /** The way it may fall nearest to `want` (a direction on the desk): clear of everything. */
  function chooseDir(wx, wz) {
    const a0 = Math.atan2(wz, wx)
    const p = new THREE.Vector3().setFromMatrixPosition(homeM)
    let best = null
    for (let k = 0; k <= 12; k++) {
      for (const sgn of k ? [1, -1] : [1]) {
        const a = a0 + sgn * k * (Math.PI / 12)
        const dx = Math.cos(a)
        const dz = Math.sin(a)
        // (lying, it reaches from the rim it tips over to its top: its width either side)
        let ok = true
        for (let t = 0; t <= 165 && ok; t += 15)
          for (const side of [-1, 0, 1]) {
            const x = p.x + dx * (CAN.r + t) - dz * side * CAN.r
            const z = p.z + dz * (CAN.r + t) + dx * side * CAN.r
            if (clear(x, z) < 6) {
              ok = false
              break
            }
          }
        if (ok) return [dx, dz]
        if (!best) best = [dx, dz]
      }
    }
    return best
  }

  const up = [0, 1, 0]
  const pivot = [0, 0, 0]
  const axis = [0, 0, 0]
  /** Knock it over, towards (dx, dz) or the nearest clear way to it. */
  function knock(dx, dz, strength = 1) {
    if (st.mode !== 'standing') return false
    const l = Math.hypot(dx, dz) || 1
    const [ux, uz] = chooseDir(dx / l, dz / l)
    // the body as it stands, then turning about the rim it tips over
    comOf(pose, tv)
    ax.setFromMatrixColumn(pose, 0)
    ay.setFromMatrixColumn(pose, 1)
    az.setFromMatrixColumn(pose, 2)
    body.set([tv.x, tv.y, tv.z], [ax.x, ax.y, ax.z], [ay.x, ay.y, ay.z], [az.x, az.y, az.z])
    pivot[0] = home.x + ux * CAN.r
    pivot[1] = floorY
    pivot[2] = home.z + uz * CAN.r
    // (about up x the push: the top goes the way it was pushed)
    axis[0] = up[1] * uz - up[2] * 0
    axis[1] = 0
    axis[2] = -up[1] * ux
    const al = Math.hypot(axis[0], axis[2]) || 1
    axis[0] /= al
    axis[2] /= al
    body.spin(pivot, axis, 4.6 + 1.6 * Math.min(1, strength), [ux * 60, 0, uz * 60])
    st.mode = 'falling'
    st.landed = false
    st.t = 0
    rnd = 1 + Math.floor(Math.abs(dx * 1e4 + dz * 3e3)) % 1e6
    return true
  }

  /** Stood up again where it started, full; the puddle dries. */
  function standUp() {
    if (st.mode === 'standing' || st.mode === 'rising') return
    st.fromM.copy(pose)
    st.mode = 'rising'
    st.t = 0
    st.drying = st.blobs.length > 0
    body.awake = false
    for (let i = 0; i < DROPS; i++) dAlive[i] = 0
  }

  function reset() {
    body.awake = false
    st.mode = 'standing'
    st.fill = 1
    st.blobs.length = 0
    st.drying = false
    st.fade = 1
    fadeU.value = 1
    puddle.visible = false
    for (let i = 0; i < DROPS; i++) dAlive[i] = 0
    drops.visible = false
    syncBlobs()
    placeStanding()
  }

  // ---- the drink, each step
  const mouth = new THREE.Vector3()
  function syncBlobs() {
    const arr = blobU.value
    let n = 0
    for (const b of st.blobs) {
      if (n >= MAX_BLOBS) break
      arr[n++].set(b.x, b.z, b.r)
      for (const kd of b.kids) {
        if (n >= MAX_BLOBS) break
        arr[n++].set(b.x + Math.cos(kd.a) * b.r * kd.o, b.z + Math.sin(kd.a) * b.r * kd.o, b.r * kd.k)
      }
    }
    for (; n < MAX_BLOBS; n++) arr[n].set(0, 0, -1)
  }
  /** Drink poured at (x, z) (world, on the desk), dv of the can (0..1). */
  function landAt(x, z, dvol) {
    const px = x - puddle.position.x
    const pz = z - puddle.position.z
    let b = st.blobs[st.blobs.length - 1]
    if (!b || Math.hypot(b.x - px, b.z - pz) > Math.max(16, b.r * 0.5)) {
      if (st.blobs.length >= 4) b = st.blobs[st.blobs.length - 1]
      else {
        b = { x: px, z: pz, r: 2, vol: 0, kids: [] }
        // (two or three lobes off it: a spill's edge is never a circle)
        const nk = 2 + Math.floor(rand() * 2)
        for (let k = 0; k < nk; k++) b.kids.push({ a: rand() * Math.PI * 2, o: 0.55 + 0.35 * rand(), k: 0.38 + 0.22 * rand() })
        st.blobs.push(b)
        puddle.visible = true
      }
    }
    b.vol += dvol
  }
  const K_AREA = 92 * 92 // (mm², the puddle a whole can makes: a hand's span across)
  function stepDrink(h) {
    let busy = false
    // pouring: once it lies past ~70 degrees, quicker the further over
    if (st.mode !== 'standing' && st.mode !== 'rising' && st.fill > 0) {
      ay.setFromMatrixColumn(pose, 1)
      const tilt = ay.y // (cos of the axis to the vertical)
      const rate = THREE.MathUtils.smoothstep(-tilt, -0.34, 0.15) * 0.42
      if (rate > 0) {
        const dvol = Math.min(st.fill, rate * h)
        st.fill -= dvol
        mouth.set(CAN.mouth, CAN.lidY, 0).applyMatrix4(pose)
        // (the stream lands a little past the mouth, the way the can points)
        landAt(mouth.x + ay.x * 14, mouth.z + ay.z * 14, dvol)
        // drops from the mouth
        st.pourAcc += rate * h * 160
        while (st.pourAcc >= 1) {
          st.pourAcc -= 1
          for (let i = 0; i < DROPS; i++) {
            if (dAlive[i]) continue
            dAlive[i] = 1
            dp[i * 3] = mouth.x
            dp[i * 3 + 1] = mouth.y
            dp[i * 3 + 2] = mouth.z
            const sp = 180 + 140 * rand()
            dv[i * 3] = ay.x * sp + (rand() - 0.5) * 60
            dv[i * 3 + 1] = Math.max(0, ay.y) * sp + 60 * rand()
            dv[i * 3 + 2] = ay.z * sp + (rand() - 0.5) * 60
            ds[i] = 1.4 + 1.6 * rand()
            break
          }
        }
        busy = true
      }
    }
    // the drops fly and land
    let any = false
    for (let i = 0; i < DROPS; i++) {
      if (!dAlive[i]) continue
      any = true
      dv[i * 3 + 1] += G * h
      dp[i * 3] += dv[i * 3] * h
      dp[i * 3 + 1] += dv[i * 3 + 1] * h
      dp[i * 3 + 2] += dv[i * 3 + 2] * h
      if (dp[i * 3 + 1] < floorY + ds[i] * 0.5) dAlive[i] = 0
    }
    if (any) busy = true
    // the puddle spreads towards the area its drink covers, quickly at first, then slowly
    for (const b of st.blobs) {
      const target = Math.sqrt((b.vol * K_AREA) / 1)
      if (target - b.r > 0.05) {
        b.r += (target - b.r) * (1 - Math.exp(-h * 2.6))
        busy = true
      }
    }
    if (st.drying) {
      st.fade = Math.max(0, st.fade - h / 1.4)
      fadeU.value = st.fade
      if (st.fade <= 0) {
        st.drying = false
        st.blobs.length = 0
        st.fade = 1
        fadeU.value = 1
        puddle.visible = false
      }
      busy = true
    }
    syncBlobs()
    return busy
  }

  const dm = new THREE.Matrix4()
  const yUp = new THREE.Vector3(0, 1, 0)
  const dq = new THREE.Quaternion()
  const ds3 = new THREE.Vector3()
  const dpos = new THREE.Vector3()
  function drawDrops() {
    let n = 0
    for (let i = 0; i < DROPS; i++) {
      if (!dAlive[i]) continue
      const s = ds[i]
      // (stretched along its flight)
      const vl = Math.hypot(dv[i * 3], dv[i * 3 + 1], dv[i * 3 + 2]) || 1
      tv.set(dv[i * 3] / vl, dv[i * 3 + 1] / vl, dv[i * 3 + 2] / vl)
      dq.setFromUnitVectors(yUp, tv)
      ds3.set(s, s * (1 + Math.min(1.4, vl / 600)), s)
      dm.compose(dpos.set(dp[i * 3], dp[i * 3 + 1], dp[i * 3 + 2]), dq, ds3)
      drops.setMatrixAt(n++, dm)
    }
    drops.count = n
    drops.visible = n > 0
    drops.instanceMatrix.needsUpdate = true
  }

  const api = {
    group,
    puddle,
    drops,
    meshes: parts,
    st,
    get standing() {
      return st.mode === 'standing'
    },
    knock,
    standUp,
    reset,
    /** Where it is (world): the middle of its body. */
    center: (out) => comOf(pose, out),
    /** For the physics scheduler: the fall. */
    physics: {
      awake: () => body.awake,
      step: (h) => {
        body.step(h)
      },
    },
    /** Each frame; returns true while anything of it moves. */
    update(dt) {
      let busy = false
      if (st.mode === 'falling' || st.mode === 'lying') {
        body.frame(F)
        ax.set(F[3], F[4], F[5])
        ay.set(F[6], F[7], F[8])
        az.set(F[9], F[10], F[11])
        pose.makeBasis(ax, ay, az)
        tv.set(F[0], F[1], F[2]).addScaledVector(ay, -CAN.com)
        pose.setPosition(tv)
        group.matrix.copy(pose)
        group.matrixWorldNeedsUpdate = true
        if (!st.landed && body.contact && ay.y < 0.6) {
          st.landed = true
          onLand()
        }
        if (body.awake) busy = true
        else st.mode = 'lying'
      } else if (st.mode === 'rising') {
        st.t = Math.min(1, st.t + dt / 0.75)
        const e = st.t * st.t * (3 - 2 * st.t)
        // (lifted, turned upright and set down where it stood)
        st.fromM.decompose(tv, dq, ds3)
        const q1 = new THREE.Quaternion().setFromRotationMatrix(homeM)
        dq.slerp(q1, e)
        const p1 = new THREE.Vector3().setFromMatrixPosition(homeM)
        tv.lerp(p1, e)
        tv.y += Math.sin(Math.PI * e) * 40
        pose.compose(tv, dq, ds3.set(1, 1, 1))
        group.matrix.copy(pose)
        group.matrixWorldNeedsUpdate = true
        if (st.t >= 1) {
          st.mode = 'standing'
          st.fill = 1
          placeStanding()
        }
        busy = true
      }
      if (stepDrink(Math.min(dt, 1 / 30))) busy = true
      drawDrops()
      return busy
    },
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      for (const t of textures) t.dispose()
      drops.dispose()
    },
  }
  return api
}
