// The cigarette (and the old butt and the burnt match): geometry and materials. Local frame: x along
// the cigarette from the filter's end (x = 0) to its foot (x = 84), radius 3.9 mm. The burn is one
// uniform (the burn line's position): the paper past it is discarded, the scorch is drawn in the
// shader, the ember and the ash column move with it.
import * as THREE from 'three'
import { noise3 } from '../core/noise.js'
import { glsl } from '../core/glsl.js'
import emberGlowGlsl from '../shaders/emberGlow.glsl'
import VALUE_NOISE from '../shaders/valueNoise.glsl'
import emberVert from '../shaders/ember.vert'
import emberFrag from '../shaders/ember.frag'

// (the coal's glow, with the value noise it is made of)
const EMBER_GLSL = glsl(emberGlowGlsl, { valueNoise: VALUE_NOISE })

export const CIG = { length: 84, radius: 3.9, filter: 25, ashMax: 15 }

/** A revolved profile along x: points [r, x]; attributes aAlong (mm) and aAround (0..1). */
function latheX(points, segs) {
  const g = new THREE.LatheGeometry(points.map(([r, x]) => new THREE.Vector2(r, x)), segs)
  g.rotateZ(-Math.PI / 2) // (the lathe's y axis becomes x)
  const p = g.attributes.position
  const along = new Float32Array(p.count)
  const around = new Float32Array(p.count)
  for (let i = 0; i < p.count; i++) {
    along[i] = p.getX(i)
    around[i] = Math.atan2(p.getZ(i), -p.getY(i)) / (2 * Math.PI) + 0.5
  }
  g.setAttribute('aAlong', new THREE.BufferAttribute(along, 1))
  g.setAttribute('aAround', new THREE.BufferAttribute(around, 1))
  return g
}

/** The materials (one set per cigarette, so each has its own burn line). */
export function cigaretteMaterials(tex, shared) {
  const U = shared // uTime, uEmber (0..), uEmberCol
  const body = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.72, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.9, 0.86, 0.8) })
  // (uPart: 0 the whole paper; 1 all but its last 4 mm, for the frame cache; 2 only those 4 mm,
  // drawn every frame over the cache because the ember lights them)
  // (lighting a fresh one: uLightProg, specks of glow round its foot joining into a ring; uScorch,
  // the scorch a flame leaves on its foot; uFilterScorch, on its filter)
  const bu = { uBurn: { value: 64.5 }, uSeed: { value: 0.3 }, uLit: { value: 1 }, uFade: { value: 1 }, uAshScale: { value: 1 }, uPart: { value: 0 }, uLightProg: { value: 1 }, uScorch: { value: 0 }, uFilterScorch: { value: 0 } }
  body.userData.u = bu
  body.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, bu, { uTime: U.uTime, uEmber: U.uEmber, tCork: { value: tex.cork }, tPaper: { value: tex.paper }, tFibre: { value: tex.fibre } })
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aAlong;\nattribute float aAround;\nvarying float vAlong;\nvarying float vAround;\nvarying vec3 vLocalN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlong = aAlong;\nvAround = aAround;\nvLocalN = normal;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vAlong; varying float vAround; varying vec3 vLocalN;
        uniform float uBurn; uniform float uSeed; uniform float uLit; uniform float uFade; uniform float uTime; uniform float uEmber; uniform float uPart; uniform float uScorch; uniform float uFilterScorch;
        uniform sampler2D tCork; uniform sampler2D tPaper; uniform sampler2D tFibre;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float a = vAround * 6.2831853;
        // the burn line wanders round the cigarette
        float edge = uBurn + 0.42 * sin(a * 3.0 + uSeed * 6.0) + 0.27 * sin(a * 7.0 + 0.4 + uSeed) + 0.15 * sin(a * 13.0 + uSeed * 3.0);
        float d = edge - vAlong;
        if (d < 0.0 || (uPart > 0.5 && (uPart < 1.5 ? d < 4.0 : d >= 4.0))) discard;
        vec3 col;
        if (vAlong < 25.0) {
          // tipping paper: cork-tan with speckles, its overlap seam
          col = texture2D(tCork, vec2(vAround * 3.0, vAlong / 12.5)).rgb;
          float seam = 1.0 - smoothstep(0.0015, 0.004, abs(fract(vAround - 0.21) - 0.5) - 0.497);
          col *= 1.0 - 0.08 * seam;
        } else {
          // cigarette paper: off-white, faint laid lines, a thin glue seam
          vec4 pp = texture2D(tPaper, vec2(vAround * 2.0, vAlong / 18.0));
          col = vec3(0.93, 0.915, 0.885) * (0.985 + 0.015 * pp.r) * (0.97 + 0.03 * pp.g);
          float seam = 1.0 - smoothstep(0.0008, 0.0022, abs(fract(vAround - 0.73) - 0.5) - 0.4985);
          col *= 1.0 - 0.05 * seam;
        }
        // the filter's cut end: cellulose fibres
        float face = smoothstep(-0.6, -0.85, vLocalN.x) * step(vAlong, 0.6);
        col = mix(col, vec3(0.86, 0.82, 0.74) * (0.82 + 0.25 * texture2D(tFibre, vec2(vObjYZ().x, vObjYZ().y) / 7.8 + 0.5).r), face);
        // scorch: cream, amber, brown, then the black char lip at the edge (linear values of
        // sRGB #0f0b0a, #5c331a, #b3733a, #ebd6a8)
        float t = d / 2.6;
        vec3 sc = mix(vec3(0.005, 0.0034, 0.003), vec3(0.107, 0.033, 0.01), smoothstep(0.06, 0.26, t));
        sc = mix(sc, vec3(0.45, 0.17, 0.042), smoothstep(0.26, 0.52, t));
        sc = mix(sc, vec3(0.83, 0.67, 0.39), smoothstep(0.5, 0.82, t));
        col = mix(sc, col, smoothstep(0.75, 1.0, t));
        // a fresh cigarette's foot: the cut tobacco on its end; the scorch a flame leaves there
        float foot = smoothstep(0.55, 0.85, vLocalN.x) * step(83.7, vAlong);
        float fl = fract(sin(dot(floor(vObjP.yz * 6.0), vec2(12.9898, 78.233))) * 43758.5453);
        col = mix(col, vec3(0.12, 0.055, 0.02) * (0.6 + 0.8 * fl), foot);
        float fd = 84.0 - vAlong;
        float fsc = uScorch * (1.0 - smoothstep(0.0, 3.0 * uScorch + 0.2, fd + 0.3 * sin(a * 5.0 + uSeed * 4.0)));
        col = mix(col, mix(vec3(0.02, 0.012, 0.008), vec3(0.45, 0.17, 0.042), smoothstep(0.2, 1.0, fd / max(3.0 * uScorch, 0.3))), fsc * (1.0 - foot * 0.5));
        col *= 1.0 - 0.4 * uFilterScorch * (1.0 - smoothstep(0.0, 3.0, vAlong));
        diffuseColor.rgb = col;
        diffuseColor.a *= uFade;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.55, roughnessFactor, step(25.0, vAlong));
        roughnessFactor = mix(0.9, roughnessFactor, smoothstep(0.1, 0.4, d / 2.6));`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // the ember shows through the thin paper in the last few millimetres
        totalEmissiveRadiance += vec3(1.0, 0.36, 0.1) * uEmber * uLit * exp(-d / 1.05) * 1.4 * smoothstep(0.05, 0.25, d / 2.6) * step(25.0, vAlong) * smoothstep(4.0, 3.0, d);`,
      )
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\n#ifdef OPAQUE\ngl_FragColor.a = 1.0 + step(d, 4.0) * step(25.0, vAlong) * uLit;\n#endif')
    // (the end face's coordinates across the cigarette)
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying vec3 vObjP;\nvec2 vObjYZ() { return vObjP.yz; }\nvoid main() {')
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjP = position;')
  }
  body.customProgramCacheKey = () => 'cig-body'
  body.transparent = false
  const bodyDepth = burntDepthMaterial(bu)

  const ember = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uEmber: U.uEmber, uLit: bu.uLit, uFade: bu.uFade, uLightProg: bu.uLightProg },
    vertexShader: emberVert,
    fragmentShader: glsl(emberFrag, { emberGlow: EMBER_GLSL }),
  })

  // the ash, all in the shader, in the cigarette's own frame (no texture: nothing stretches over the
  // tip, and the pattern stays put as the column grows): the layers the paper burned in, partial
  // ring cracks and a few along it, pores, charcoal at the base, the ember glowing through
  const ash = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.95 })
  ash.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: U.uTime, uEmber: U.uEmber, uLit: bu.uLit, uFade: bu.uFade, uBurn: bu.uBurn, uAshScale: bu.uAshScale })
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vAshP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvAshP = position;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        ${EMBER_GLSL}
        varying vec3 vAshP;
        uniform float uTime; uniform float uEmber; uniform float uLit; uniform float uFade; uniform float uBurn; uniform float uAshScale;
        float ashH; float ashCrack; float ashPore; float ashX; vec3 ashQ;
        // a thin line where t is near a whole number, antialiased by its own footprint (it fades
        // with distance rather than shimmering)
        float ashLine(float t, float w) {
          float fw = max(fwidth(t), 1e-5);
          float d = min(fract(t), 1.0 - fract(t));
          return (1.0 - smoothstep(w - fw * 0.5, w + fw * 0.5, d)) * min(1.0, 2.0 * w / fw);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          ashX = 0.7 + vAshP.x * uAshScale;               // mm from the burn line
          ashQ = vec3(uBurn + ashX, vAshP.y, vAshP.z);     // the cigarette's frame
          vec3 rq = vec3(ashQ.x, ashQ.yz * 0.23);          // (round it, about one unit)
          float a = atan(ashQ.z, -ashQ.y);
          float lay = en(vec3(ashQ.x * 1.7 + 0.8 * en(ashQ * 0.7), rq.yz * 0.9));
          float ring = ashLine(ashQ.x * 0.43 + 0.7 * en(ashQ * vec3(0.35, 0.9, 0.9) + 7.0), 0.03) * smoothstep(0.4, 0.62, en(vec3(ashQ.x * 0.4, rq.yz * 1.6 + 3.0)));
          float lon = ashLine(a * 0.7958 + 0.25 * en(ashQ * vec3(0.5, 0.9, 0.9) + 11.0), 0.012) * smoothstep(0.45, 0.7, en(vec3(ashQ.x * 0.6 + 5.0, rq.yz * 1.3))) * smoothstep(2.4, 3.3, length(ashQ.yz));
          ashCrack = max(ring, lon);
          ashPore = smoothstep(0.6, 0.85, en(ashQ * 7.0)) * (1.0 - smoothstep(0.04, 0.12, fwidth(ashQ.x)));
          float lump = en(ashQ * 1.8 + 3.0);
          ashH = 0.06 * lump + 0.03 * lay - 0.08 * ashCrack - 0.03 * ashPore;
          // (linear: pale grey #9a9895 to near-white #d9d7d3; charcoal #1f1d1b at the base)
          vec3 c = mix(vec3(0.32, 0.31, 0.3), vec3(0.69, 0.68, 0.65), smoothstep(0.2, 0.9, lay)) * (0.88 + 0.16 * lump);
          c *= 1.0 - 0.6 * ashCrack - 0.3 * ashPore;
          c = mix(vec3(0.014, 0.013, 0.012), c, smoothstep(0.15, 3.6, ashX));
          diffuseColor.rgb = c;
          diffuseColor.a *= uFade;
        }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          // (bumped by the height above, through its screen-space slope)
          vec3 dpx = dFdx(-vViewPosition);
          vec3 dpy = dFdy(-vViewPosition);
          vec2 dH = vec2(dFdx(ashH), dFdy(ashH));
          vec3 r1 = cross(dpy, normal);
          vec3 r2 = cross(normal, dpx);
          float det = dot(dpx, r1) * faceDirection;
          normal = normalize(abs(det) * normal - sign(det) * (dH.x * r1 + dH.y * r2));
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // the ember glowing through the cracks and pores near the base
        totalEmissiveRadiance += emberGlow(ashQ * 1.3, uTime, uEmber - 1.0) * (ashCrack * 3.2 + ashPore * 0.9 + 0.3) * exp(-max(ashX, 0.0) / 1.3) * (2.2 + 6.0 * uEmber) * uLit * uFade;`,
      )
  }
  const ashOBC = ash.onBeforeCompile
  ash.onBeforeCompile = (sh) => {
    ashOBC(sh)
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\n#ifdef OPAQUE\ngl_FragColor.a = 1.0 + uLit;\n#endif')
  }
  ash.customProgramCacheKey = () => 'cig-ash'

  const tobacco = new THREE.MeshPhysicalMaterial({ color: 0x5a3a1f, roughness: 0.85 })
  return { body, bodyDepth, ember, ash, tobacco, u: bu }
}

/** The shadow caster for a cigarette's body: the same burn line, so burnt paper casts no shadow. */
function burntDepthMaterial(bu) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uBurn: bu.uBurn, uSeed: bu.uSeed })
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aAlong;\nattribute float aAround;\nvarying float vAlong;\nvarying float vAround;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlong = aAlong;\nvAround = aAround;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAlong; varying float vAround; uniform float uBurn; uniform float uSeed;')
      .replace('void main() {', `void main() {
        float a = vAround * 6.2831853;
        if (uBurn + 0.42 * sin(a * 3.0 + uSeed * 6.0) + 0.27 * sin(a * 7.0 + 0.4 + uSeed) + 0.15 * sin(a * 13.0 + uSeed * 3.0) - vAlong < 0.0) discard;`)
  }
  m.customProgramCacheKey = () => 'cig-depth'
  return m
}

/** The cigarette's body: the filter's end rolled in a little and recessed, then the long tube. */
export function bodyGeometry(segs) {
  return latheX(
    [
      [0, 0.35],
      [3.25, 0.35],
      [3.42, 0.21],
      [3.6, 0.05],
      [3.8, 0.02],
      [3.88, 0.12],
      [3.9, 0.32],
      [3.9, 2],
      ...Array.from({ length: 41 }, (_, i) => [3.9, 2 + i * 2]),
      [3.9, 84],
      [2.6, 84],
      [0, 84],
    ],
    segs,
  )
}

/** The coal under the ash: a rounded cap at the burn line (x = 0 here). */
export function emberGeometry(segs) {
  const g = new THREE.LatheGeometry(
    [
      [0, -0.6],
      [3.93, -0.6],
      [3.95, -0.15],
      [3.92, 0.35],
      [3.82, 0.75],
      [3.45, 1.1],
      [2.7, 1.5],
      [1.4, 1.9],
      [0, 2.0],
    ].map(([r, x]) => new THREE.Vector2(r, x)),
    segs,
  )
  g.rotateZ(-Math.PI / 2)
  return g
}

/**
 * The ash column (15 mm long, scaled to its length; its base sits 0.7 mm past the burn line, so the
 * ember's ring shows between): rippled, a little wider than the paper except at its narrower base,
 * drooping, its end rounding over irregularly.
 */
export function ashGeometry(segs) {
  const L = CIG.ashMax
  const rings = 90
  const W = segs + 1
  const pos = []
  const idx = []
  const droop = (x) => -0.0055 * (x + 0.7) * (x + 0.7)
  for (let i = 0; i <= rings; i++) {
    const t = i / rings
    const x = t * L
    const b = Math.min(1, x / 1.6)
    const base = 0.935 + 0.065 * b * b * (3 - 2 * b)
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2
      const ripple = 0.035 * Math.sin(x * 2.4 + 1.7 * Math.sin(a * 2 + x * 0.3)) + 0.09 * noise3(x * 0.9, Math.cos(a) * 2, Math.sin(a) * 2) + 0.05 * noise3(x * 2.3 + 4, Math.cos(a) * 4, Math.sin(a) * 4)
      const endT = Math.max(0, (x - (L - 2.6)) / 2.6)
      const cap = Math.sqrt(Math.max(0, 1 - endT * endT * (0.92 + 0.08 * noise3(a * 2, 3, 1))))
      const r = (4.03 + ripple) * (0.25 + 0.75 * cap) * base
      pos.push(x, Math.cos(a) * r * -1 + droop(x), Math.sin(a) * r)
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < segs; j++) {
      const a = i * W + j
      const b = a + W
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  // the tip: a small fan closing the end
  const tipC = pos.length / 3
  pos.push(L + 0.05, droop(L + 0.05), 0)
  for (let j = 0; j < segs; j++) idx.push(rings * W + j, tipC, rings * W + j + 1)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** A few tobacco strands curling out at the burn edge (x = 0 at the burn line). */
export function strandGeometry() {
  const geos = []
  let s = 11
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let k = 0; k < 7; k++) {
    const a = rnd() * Math.PI * 2
    const r0 = 3.2 + rnd() * 0.6
    const pts = []
    for (let i = 0; i <= 5; i++) {
      const t = i / 5
      const r = r0 + t * (0.4 + rnd() * 0.5)
      const aa = a + t * (rnd() - 0.5) * 0.8
      pts.push(new THREE.Vector3(-0.6 + t * (1.2 + rnd() * 1.4), -Math.cos(aa) * r, Math.sin(aa) * r))
    }
    geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.07 + rnd() * 0.05, 5, false))
  }
  // (one geometry: one draw call)
  const g = mergeIndexed(geos)
  for (const q of geos) q.dispose()
  return g
}

/** Indexed geometries (position, normal, uv) into one. */
function mergeIndexed(geos) {
  let nv = 0
  let ni = 0
  for (const q of geos) {
    nv += q.attributes.position.count
    ni += q.index.count
  }
  const pos = new Float32Array(nv * 3)
  const nrm = new Float32Array(nv * 3)
  const uv = new Float32Array(nv * 2)
  const idx = new Uint32Array(ni)
  let v = 0
  let i = 0
  for (const q of geos) {
    pos.set(q.attributes.position.array, v * 3)
    nrm.set(q.attributes.normal.array, v * 3)
    uv.set(q.attributes.uv.array, v * 2)
    const src = q.index.array
    for (let k = 0; k < src.length; k++) idx[i + k] = src[k] + v
    v += q.attributes.position.count
    i += src.length
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(new THREE.BufferAttribute(idx, 1))
  return g
}

/** The old butt: filter crushed and bent, the burnt end charred; along +x. */
export function buttGeometry(segs) {
  // a bent path, the burnt end squashed flat where it was stubbed out
  const L = 31
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(12, 0.2, 0.3), new THREE.Vector3(22, 1.0, 1.8), new THREE.Vector3(28, 2.4, 4.4), new THREE.Vector3(31, 3.0, 6.4)])
  const g = new THREE.TubeGeometry(curve, 60, CIG.radius, segs, false)
  const p = g.attributes.position
  const uvA = g.attributes.uv
  const along = new Float32Array(p.count)
  const around = new Float32Array(p.count)
  const c = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    const u = uvA.getX(i)
    along[i] = u * L
    around[i] = uvA.getY(i)
    // crush: pull the tube towards its centre line in y near the burnt end
    const t = Math.max(0, (u - 0.62) / 0.38)
    curve.getPointAt(Math.min(1, u), c)
    const dy = p.getY(i) - c.y
    p.setY(i, c.y + dy * (1 - 0.55 * t))
  }
  g.setAttribute('aAlong', new THREE.BufferAttribute(along, 1))
  g.setAttribute('aAround', new THREE.BufferAttribute(around, 1))
  g.computeVertexNormals()
  return { geometry: g, end: curve.getPointAt(1), endDir: curve.getTangentAt(1) }
}

/** The burnt match's stick: square, its edges rounded a little; along +x from 0 to 42. */
export function matchStick() {
  const stick = new THREE.BoxGeometry(42, 2.1, 2.1, 84, 2, 2)
  // round the stick's edges a little (push the corners in)
  const p = stick.attributes.position
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i)
    const z = p.getZ(i)
    const k = Math.max(Math.abs(y), Math.abs(z))
    if (k > 0) {
      const r = Math.hypot(y, z)
      const s = 1.05 / Math.max(r, 1e-6)
      const m = 0.35
      p.setY(i, y * (1 - m) + y * s * m * (k / 1.05))
      p.setZ(i, z * (1 - m) + z * s * m * (k / 1.05))
    }
  }
  stick.translate(21, 0, 0)
  stick.computeVertexNormals()
  return stick
}

/** An ash flake: a thin irregular wafer. */
export function flakeGeometry() {
  const g = new THREE.CylinderGeometry(1, 1, 0.28, 9, 1)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const z = p.getZ(i)
    const a = Math.atan2(z, x)
    const k = 0.75 + 0.35 * noise3(Math.cos(a) * 1.7, Math.sin(a) * 1.7, 5)
    p.setX(i, x * k)
    p.setZ(i, z * k * 0.8)
    p.setY(i, p.getY(i) + 0.08 * noise3(x * 2, 1, z * 2))
  }
  g.computeVertexNormals()
  return g
}
