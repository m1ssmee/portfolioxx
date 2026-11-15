// Two wailing faces in white marble (objects/masksGeo.js: meshed in the worker), on a plinth of
// dark stone, each held up on a brass rod as a museum mounts a fragment: the first tipped back, its
// face turned up; the second, a little taller, tipped forward, its face turned down.
// The marble: a warm white, matt with a soft polish on what stands proud; its hollows a shade
// warmer and darker, as old marble keeps its dust; faint grey veins through it; a fine tooth where
// the chisel was. The frame: y up from the desk, +z the front, the plinth's middle at the origin (mm).
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export const MASK_STAND = {
  plinth: [250, 30, 104],
  // each face: the middle of it (x, height, z), tipped back (radians: positive, its face up), turned (about y)
  one: { at: [-62, 148, 4], tip: 0.36, turn: 0.2, roll: -0.05 },
  two: { at: [64, 158, 0], tip: -0.2, turn: -0.22, roll: 0.04 },
}

function marble() {
  const m = new THREE.MeshStandardMaterial({ color: 0xece6db, roughness: 0.52, metalness: 0, vertexColors: true, envMapIntensity: 0.9 })
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vStoneP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvStoneP = position;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vStoneP;
        float stoneHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float stoneNoise(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(stoneHash(i), stoneHash(i + vec3(1, 0, 0)), f.x), mix(stoneHash(i + vec3(0, 1, 0)), stoneHash(i + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(stoneHash(i + vec3(0, 0, 1)), stoneHash(i + vec3(1, 0, 1)), f.x), mix(stoneHash(i + vec3(0, 1, 1)), stoneHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `{
          // (the mesher's occlusion, in the vertex colour: the hollows darker and a shade warmer,
          // old marble's dust; then the stone's own veins and clouds)
          float occ = vColor.r;
          vec3 dust = mix(vec3(0.5, 0.44, 0.37), vec3(1.0), smoothstep(0.0, 0.92, occ));
          float warp = stoneNoise(vStoneP * 0.035);
          float vein = abs(stoneNoise(vStoneP * vec3(0.05, 0.022, 0.05) + warp * 2.2) - 0.5);
          float veins = 1.0 - 0.1 * (1.0 - smoothstep(0.0, 0.035, vein));
          float cloud = 0.95 + 0.07 * stoneNoise(vStoneP * 0.016 + 4.0);
          float cave = vColor.g;
          diffuseColor.rgb *= dust * veins * cloud * (0.45 + 0.55 * occ) * mix(0.045, 1.0, cave * cave);
        }`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.82, roughnessFactor, smoothstep(0.55, 0.98, vColor.r));')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          // a fine tooth, gone where it would be smaller than a pixel
          float foot = length(fwidth(vStoneP));
          float h = (stoneNoise(vStoneP * 2.6) - 0.5) * 0.07 * (1.0 - smoothstep(0.2, 0.7, foot)) + (stoneNoise(vStoneP * 0.5) - 0.5) * 0.12;
          vec3 sp = -vViewPosition;
          vec3 sx = dFdx(sp);
          vec3 sy = dFdy(sp);
          vec3 r1 = cross(sy, normal);
          vec3 r2 = cross(normal, sx);
          float det = dot(sx, r1);
          normal = normalize(abs(det) * normal - sign(det) * (dFdx(h) * r1 + dFdy(h) * r2));
        }`,
      )
  }
  m.customProgramCacheKey = () => 'masks.marble'
  return m
}

/**
 * meshes: { one, two } (masksGeo.js's maskMesh, from the worker); at: the middle of the plinth's
 * foot (world, on the desk); yaw: the way the group faces.
 * Returns { group, meshes, materials, center (world), centers: [one, two] (world), size, dispose() }.
 */
export function createMasks({ meshes, at, yaw = 0 }) {
  const group = new THREE.Group()
  group.name = 'masks'
  group.position.copy(at)
  group.rotation.y = yaw
  const stone = marble()
  const granite = new THREE.MeshStandardMaterial({ color: 0x232325, roughness: 0.38, metalness: 0 })
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08d4a, roughness: 0.36, metalness: 1 })
  granite.customProgramCacheKey = () => 'masks.granite'
  brass.customProgramCacheKey = () => 'masks.brass'
  const geometries = []
  const out = []
  const S = MASK_STAND
  const [pw, ph, pd] = S.plinth
  // the plinth: a block, its edges eased
  const plinthGeo = new THREE.BoxGeometry(pw, ph, pd).translate(0, ph / 2, 0)
  geometries.push(plinthGeo)
  const plinth = new THREE.Mesh(plinthGeo, granite)
  plinth.name = 'masks.plinth'
  plinth.castShadow = true
  group.add(plinth)
  out.push(plinth)
  const rods = []
  const centers = []
  for (const k of ['one', 'two']) {
    const m = meshes[k]
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3))
    const col = new Float32Array(m.ao.length * 3)
    // (red: the close occlusion, the creases; green: the long one, the cavities)
    for (let i = 0; i < m.ao.length; i++) {
      col[i * 3] = m.ao[i]
      col[i * 3 + 1] = m.cave ? m.cave[i] : 1
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.setIndex(new THREE.BufferAttribute(m.indices, 1))
    g.computeBoundingSphere()
    geometries.push(g)
    const face = new THREE.Mesh(g, stone)
    face.name = `masks.${k}`
    face.castShadow = true
    const P = S[k]
    face.position.set(...P.at)
    // (tipped about its own middle: back, its face up; then turned, and a little crooked)
    face.rotation.set(-P.tip, P.turn, P.roll, 'YXZ')
    group.add(face)
    out.push(face)
    centers.push(new THREE.Vector3(...P.at))
    // its mount: a rod up behind it, clear of its back wherever it leans, and a short arm from
    // the rod's top forward into the middle of its back
    face.updateMatrix()
    const hy = k === 'one' ? 75 : 82
    const backZ = Math.min(...[-hy, 0, hy].map((y) => new THREE.Vector3(0, y, -15).applyMatrix4(face.matrix).z))
    const hold = new THREE.Vector3(0, 4, -14).applyMatrix4(face.matrix)
    const zr = backZ - 7
    const up = hold.y - ph
    rods.push(
      new THREE.CylinderGeometry(2.3, 2.3, up, 16).translate(hold.x, ph + up / 2, zr),
      new THREE.CylinderGeometry(2.3, 2.3, hold.z - zr + 2, 16).rotateX(Math.PI / 2).translate(hold.x, hold.y, (hold.z + zr) / 2 + 1),
      new THREE.SphereGeometry(2.3, 12, 8).translate(hold.x, hold.y, zr),
      new THREE.CylinderGeometry(6.5, 7.5, 3, 24).translate(hold.x, ph + 1.5, zr),
    )
  }
  const rodGeo = mergeGeometries(rods.map((r) => (r.index ? r.toNonIndexed() : r)))
  for (const r of rods) r.dispose()
  geometries.push(rodGeo)
  const rod = new THREE.Mesh(rodGeo, brass)
  rod.name = 'masks.rods'
  rod.castShadow = true
  group.add(rod)
  out.push(rod)
  group.updateMatrixWorld(true)
  const world = (v) => v.clone().applyMatrix4(group.matrixWorld)
  return {
    group,
    meshes: out,
    materials: [stone, granite, brass],
    center: world(new THREE.Vector3(0, 140, 0)),
    centers: centers.map(world),
    size: [pw, 250],
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of [stone, granite, brass]) m.dispose()
    },
  }
}
