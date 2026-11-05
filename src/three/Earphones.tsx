import { RoundedBox } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { rig } from '../rig'
import { plugSound } from '../sound'
import { BR, Cable, MAIN } from './cable'
import { grilleTexture } from './internals'
import { FLOOR } from './layout'
import { roundedRect, stadiumGeometry } from './model'
import { catmull, Tube } from './tube'

const CABLE_R = 0.0088

// scratch
const X = new THREE.Vector3()
const Y = new THREE.Vector3()
const Z = new THREE.Vector3()
const V = new THREE.Vector3()
const M = new THREE.Matrix4()
const Q = new THREE.Quaternion()

/** EarPods-style head: a rounded body with a flattened speaker face. */
function headGeometry() {
  const g = new THREE.SphereGeometry(0.074, 64, 48)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i) * 0.92
    let z = p.getZ(i) * 0.9
    if (z > 0.034) z = 0.034 + (z - 0.034) * 0.42
    if (z < -0.03) z = -0.03 + (z + 0.03) * 0.8
    p.setXYZ(i, x, y, z)
  }
  g.computeVertexNormals()
  return g
}

function connectorGeometry() {
  const g = new THREE.ExtrudeGeometry(roundedRect(0.083, 0.027, 0.0134), {
    depth: 0.065,
    bevelEnabled: true,
    bevelThickness: 0.0015,
    bevelSize: 0.0012,
    bevelSegments: 2,
    curveSegments: 16,
  })
  g.rotateX(-Math.PI / 2)
  return g
}

type Props = {
  podRef: RefObject<THREE.Group | null>
  sound: boolean
  onPlug: (plugged: boolean) => void
}

export function Earphones({ podRef, sound, onPlug }: Props) {
  const { camera, gl } = useThree()
  const sim = useMemo(() => new Cable(), [])
  const tubes = useMemo(() => [new Tube(MAIN * 3 + 1, 12), new Tube(BR * 3 + 1, 10), new Tube(BR * 3 + 1, 10)], [])
  const samples = useMemo(() => tubes.map((t) => Array.from({ length: t.n }, () => new THREE.Vector3())), [tubes])
  const geo = useMemo(() => {
    const hole = stadiumGeometry(0.066, 0.011)
    hole.rotateX(Math.PI)
    hole.translate(0, -0.0006, 0)
    const vent = new THREE.ShapeGeometry(roundedRect(0.012, 0.005, 0.0024), 8)
    return {
      head: headGeometry(),
      stem: new THREE.CapsuleGeometry(0.0255, 0.12, 8, 28),
      relief: new THREE.CylinderGeometry(0.016, 0.0095, 0.024, 24),
      oval: new THREE.CircleGeometry(1, 48),
      vent,
      splitter: new THREE.CylinderGeometry(0.017, 0.017, 0.05, 28),
      connector: connectorGeometry(),
      hole,
      plugRelief: new THREE.CylinderGeometry(0.0095, 0.02, 0.06, 24),
      mark: new THREE.BoxGeometry(0.016, 0.0035, 0.0015),
    }
  }, [])
  const mats = useMemo(
    () => ({
      plastic: new THREE.MeshPhysicalMaterial({ color: '#f5f5f3', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 }),
      cable: new THREE.MeshPhysicalMaterial({ color: '#f1f1ee', roughness: 0.36, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
      grille: new THREE.MeshStandardMaterial({ map: grilleTexture(), color: '#9aa1aa', metalness: 0.45, roughness: 0.45 }),
      steel: new THREE.MeshStandardMaterial({ color: '#d4d6da', metalness: 1, roughness: 0.18 }),
      dark: new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.6 }),
      vent: new THREE.MeshStandardMaterial({ color: '#41454c', roughness: 0.5, metalness: 0.3 }),
    }),
    [],
  )

  const plugRef = useRef<THREE.Group>(null)
  const budL = useRef<THREE.Group>(null)
  const budR = useRef<THREE.Group>(null)
  const splitRef = useRef<THREE.Group>(null)
  const remoteRef = useRef<THREE.Group>(null)

  // dev only: lets automated tests find the plug and buds on screen
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__earphones = (i: number) => {
      const id = i === -1 ? sim.bodies[0].ids[1] : i === -2 ? sim.bodies[1].ids[2] : i === -3 ? sim.bodies[2].ids[2] : i
      const p = sim.pts[id]
      const v = new THREE.Vector3(p.x, p.y, p.z).project(camera)
      const r = gl.domElement.getBoundingClientRect()
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, plugged: sim.plugged }
    }
  }, [sim, camera, gl])

  /** Point something along the cable at particle i (towards particle j), facing the viewer. */
  const along = (obj: THREE.Object3D | null, i: number, j: number) => {
    if (!obj) return
    const p = sim.pts[i]
    const q = sim.pts[j]
    Y.set(q.x - p.x, q.y - p.y, q.z - p.z).normalize()
    V.set(p.x, p.y, p.z)
    Z.copy(camera.position).sub(V).normalize()
    Z.addScaledVector(Y, -Z.dot(Y)).normalize()
    X.crossVectors(Y, Z).normalize()
    Z.crossVectors(X, Y)
    M.makeBasis(X, Y, Z)
    Q.setFromRotationMatrix(M)
    obj.position.copy(V)
    obj.quaternion.slerp(Q, 0.5)
  }

  useFrame((_, dt) => {
    const pod = podRef.current
    if (!pod) return
    if (!sim.built) sim.build(pod)
    sim.step(Math.min(dt, 1 / 15), pod, rig.gust)
    rig.gust = 0
    // carrying the plug: judge "near the port" on screen, and let the port pull it in like a magnet
    if (sim.drag && sim.drag.i === sim.bodies[0].ids[1]) {
      const a = sim.portAnchor()
      const sp = a.clone().project(camera)
      const r = gl.domElement.getBoundingClientRect()
      const sx = r.left + ((sp.x + 1) / 2) * r.width
      const sy = r.top + ((1 - sp.y) / 2) * r.height
      if (Math.hypot(rig.pointer.cx - sx, rig.pointer.cy - sy) < 90) {
        sim.nearPort = true
        sim.drag.target.lerp(a, 0.3)
      }
    }
    rig.portGlow = sim.drag && sim.nearPort ? 1 : 0

    catmull(sim.pts, sim.mainIds, 3, samples[0])
    tubes[0].update(samples[0], CABLE_R)
    catmull(sim.pts, sim.leftIds, 3, samples[1])
    tubes[1].update(samples[1], CABLE_R * 0.92)
    catmull(sim.pts, sim.rightIds, 3, samples[2])
    tubes[2].update(samples[2], CABLE_R * 0.92)

    // rigid parts take their pose straight from the physics
    for (const [ref, b] of [
      [plugRef, 0],
      [budL, 1],
      [budR, 2],
    ] as const) {
      const o = ref.current
      if (o) sim.pose(b, o.position, o.quaternion)
    }
    along(splitRef.current, sim.SPLIT, sim.mainIds[MAIN - 1])
    along(remoteRef.current, sim.REMOTE, sim.rightIds[2])
  }, -2)

  // ------------------------------------------------------------ grabbing
  const startDrag = (i: number, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (i < 0) return
    rig.busy = true
    const p = sim.pts[i]
    const at = new THREE.Vector3(p.x, p.y, p.z)
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new THREE.Vector3()).negate(),
      at,
    )
    const offset = at.clone().sub(e.point)
    const plugBody = sim.bodies[0].ids[1]
    if (i === plugBody && sim.plugged) {
      sim.unplug()
      onPlug(false)
      if (sound) plugSound('out')
    }
    sim.drag = { i, target: at.clone() }
    document.body.style.cursor = 'grabbing'
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const hit = new THREE.Vector3()
    const move = (ev: PointerEvent) => {
      const r = gl.domElement.getBoundingClientRect()
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      if (sim.drag && ray.ray.intersectPlane(plane, hit)) {
        sim.drag.target.copy(hit).add(offset)
        sim.drag.target.y = Math.max(sim.drag.target.y, FLOOR + sim.pts[i].r)
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (sim.drag?.i === plugBody && sim.nearPort) {
        sim.plugIn()
        onPlug(true)
        if (sound) plugSound('in')
      }
      sim.drag = null
      rig.busy = false
      document.body.style.cursor = ''
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  const grabBody = (b: number, part: number) => (e: ThreeEvent<PointerEvent>) => startDrag(sim.bodies[b].ids[part], e)
  const grabCable = (e: ThreeEvent<PointerEvent>) => {
    const ids = [...sim.mainIds, ...sim.leftIds, ...sim.rightIds]
    startDrag(sim.nearest(e.point.x, e.point.y, e.point.z, ids), e)
  }
  const hover = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (!sim.drag) document.body.style.cursor = 'grab'
    },
    onPointerOut: () => {
      if (!sim.drag) document.body.style.cursor = ''
    },
  }

  const bud = (ref: RefObject<THREE.Group | null>, b: number) => (
    <group ref={ref} onPointerDown={grabBody(b, 2)} {...hover}>
      <mesh geometry={geo.relief} material={mats.plastic} position-y={-0.004} castShadow />
      <mesh geometry={geo.stem} material={mats.plastic} position-y={0.07} castShadow receiveShadow />
      <mesh geometry={geo.head} material={mats.plastic} position={[0, 0.212, 0.012]} castShadow receiveShadow />
      {/* speaker mesh on the face, a vent on top, and one on the stem */}
      <mesh geometry={geo.oval} material={mats.grille} position={[0, 0.206, 0.0602]} scale={[0.031, 0.04, 1]} />
      <mesh geometry={geo.oval} material={mats.vent} position={[0, 0.27, -0.016]} rotation-x={-1.15} scale={[0.016, 0.009, 1]} />
      <mesh geometry={geo.vent} material={mats.vent} position={[0, 0.128, 0.0258]} />
    </group>
  )

  return (
    <group>
      {/* the cable */}
      {tubes.map((t, i) => (
        <mesh
          key={i}
          geometry={t.geometry}
          material={mats.cable}
          castShadow
          receiveShadow
          frustumCulled={false}
          onPointerDown={grabCable}
          {...hover}
        />
      ))}

      {bud(budL, 1)}
      {bud(budR, 2)}

      <group ref={splitRef}>
        <mesh geometry={geo.splitter} material={mats.plastic} castShadow />
      </group>

      {/* inline remote: + at the top, − at the bottom */}
      <group ref={remoteRef} onPointerDown={grabCable} {...hover}>
        <RoundedBox args={[0.05, 0.23, 0.034]} radius={0.016} smoothness={4} material={mats.plastic} castShadow />
        <mesh geometry={geo.mark} material={mats.vent} position={[0, -0.06, 0.0172]} />
        <mesh geometry={geo.mark} material={mats.vent} position={[0, 0.06, 0.0172]} />
        <mesh geometry={geo.mark} material={mats.vent} position={[0, 0.06, 0.0172]} rotation-z={Math.PI / 2} />
      </group>

      {/* straight USB-C plug; grab it to pull it out */}
      <group ref={plugRef} onPointerDown={grabBody(0, 1)} {...hover}>
        <mesh geometry={geo.connector} material={mats.steel} castShadow />
        <mesh geometry={geo.hole} material={mats.dark} />
        <RoundedBox args={[0.118, 0.2, 0.062]} radius={0.024} smoothness={5} position-y={0.165} material={mats.plastic} castShadow />
        <mesh geometry={geo.plugRelief} material={mats.plastic} position-y={0.293} castShadow />
      </group>
    </group>
  )
}
