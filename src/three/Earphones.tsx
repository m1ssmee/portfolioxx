import { RoundedBox } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { rig } from '../rig'
import { plugSound } from '../sound'
import type { Body } from '../usePod'
import { BR, Cable, MAIN, PLUG } from './cable'
import { FLOOR } from './layout'
import { POD, roundedRect, stadiumGeometry } from './model'
import { FINISHES } from './palette'
import { catmull, Tube } from './tube'

const CABLE_R = 0.0064

// scratch objects
const X = new THREE.Vector3()
const Y = new THREE.Vector3()
const Z = new THREE.Vector3()
const V = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)
const M = new THREE.Matrix4()
const Q = new THREE.Quaternion()

function tipGeometry() {
  // a mushroom-shaped silicone ear tip, along +y
  const pts = [
    [0.011, 0],
    [0.018, 0.004],
    [0.032, 0.011],
    [0.04, 0.021],
    [0.039, 0.03],
    [0.031, 0.038],
    [0.018, 0.043],
    [0.0, 0.0445],
  ].map(([r, y]) => new THREE.Vector2(r, y))
  return new THREE.LatheGeometry(pts, 48)
}

function connectorGeometry() {
  // the metal USB-C tongue: a stadium extruded downwards from the plug
  const g = new THREE.ExtrudeGeometry(roundedRect(0.083, 0.027, 0.0134), {
    depth: 0.062,
    bevelEnabled: true,
    bevelThickness: 0.0015,
    bevelSize: 0.0012,
    bevelSegments: 2,
    curveSegments: 16,
  })
  g.rotateX(Math.PI / 2)
  return g
}

type Props = {
  podRef: RefObject<THREE.Group | null>
  body: Body
  sound: boolean
  onPlug: (plugged: boolean) => void
}

export function Earphones({ podRef, body, sound, onPlug }: Props) {
  const { camera, gl } = useThree()
  const finish = FINISHES[body]
  const sim = useMemo(() => new Cable(), [])
  const tubes = useMemo(() => [new Tube(MAIN * 3 + 1, 10), new Tube(BR * 3 + 1, 9), new Tube(BR * 3 + 1, 9)], [])
  const samples = useMemo(() => tubes.map((t) => Array.from({ length: t.n }, () => new THREE.Vector3())), [tubes])
  const geo = useMemo(() => {
    const hole = stadiumGeometry(0.066, 0.011)
    hole.rotateX(Math.PI)
    hole.translate(0, -0.0632, 0)
    return {
      housing: new THREE.SphereGeometry(0.072, 48, 32).scale(1, 0.86, 0.66),
      stem: new THREE.CylinderGeometry(0.012, 0.021, 0.075, 28),
      nozzle: new THREE.CylinderGeometry(0.02, 0.023, 0.05, 28),
      tip: tipGeometry(),
      accent: new THREE.TorusGeometry(0.032, 0.0032, 12, 64),
      vent: new THREE.CylinderGeometry(0.006, 0.006, 0.004, 16),
      splitter: new THREE.CapsuleGeometry(0.0135, 0.034, 8, 20),
      connector: connectorGeometry(),
      hole,
      relief: new THREE.CylinderGeometry(0.0075, 0.016, 0.06, 20),
      bump: new THREE.CylinderGeometry(0.004, 0.004, 0.003, 12),
    }
  }, [])
  const mats = useMemo(
    () => ({
      plastic: new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
      cable: new THREE.MeshPhysicalMaterial({ roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
      tip: new THREE.MeshPhysicalMaterial({ roughness: 0.78, sheen: 0.7, sheenRoughness: 0.55, sheenColor: '#ffffff' }),
      metal: new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.3 }),
      polished: new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.12 }),
      steel: new THREE.MeshStandardMaterial({ color: '#dadadc', metalness: 1, roughness: 0.16 }),
      dark: new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.6 }),
    }),
    [],
  )
  useEffect(() => {
    mats.plastic.color.set(finish.buds)
    mats.cable.color.set(finish.buds)
    mats.tip.color.set(finish.tips)
    mats.metal.color.set(finish.metal)
    mats.metal.roughness = finish.metalRough
    mats.polished.color.set(finish.metal)
  }, [finish, mats])

  const plugRef = useRef<THREE.Group>(null)
  const budL = useRef<THREE.Group>(null)
  const budR = useRef<THREE.Group>(null)
  const splitRef = useRef<THREE.Group>(null)
  const remoteRef = useRef<THREE.Group>(null)

  /** Point the bud's back (with its accent ring) at the viewer, its stem along the cable. */
  const orientBud = (obj: THREE.Object3D | null, i: number, j: number, k: number) => {
    if (!obj) return
    const p = sim.pts[i]
    const q = sim.pts[j]
    Y.set(q.x - p.x, q.y - p.y, q.z - p.z).normalize()
    V.set(p.x, p.y, p.z)
    Z.copy(camera.position).sub(V).normalize().addScaledVector(UP, 0.35).multiplyScalar(-1)
    Z.addScaledVector(Y, -Z.dot(Y)).normalize()
    X.crossVectors(Y, Z).normalize()
    Z.crossVectors(X, Y)
    M.makeBasis(X, Y, Z)
    Q.setFromRotationMatrix(M)
    obj.position.copy(V)
    obj.quaternion.slerp(Q, k)
  }

  // dev only: lets automated tests find the plug and buds on screen
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__earphones = (i: number) => {
      const p = sim.pts[i === -1 ? sim.PLUG : i === -2 ? sim.BUD_L : i === -3 ? sim.BUD_R : i]
      const v = new THREE.Vector3(p.x, p.y, p.z).project(camera)
      const r = gl.domElement.getBoundingClientRect()
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, plugged: sim.plugged }
    }
    w.__cableDebug = () => ({
      pts: sim.pts.slice(0, 4).map((p) => [p.x, p.y, p.z].map((n) => +n.toFixed(3))),
      plugMesh: plugRef.current ? plugRef.current.position.toArray().map((n) => +n.toFixed(3)) : null,
      drag: sim.drag ? sim.drag.i : null,
      plugged: sim.plugged,
      nan: sim.pts.some((p) => !Number.isFinite(p.x + p.y + p.z)),
    })
  }, [sim, camera, gl])

  useFrame((_, dt) => {
    const pod = podRef.current
    if (!pod) return
    if (!sim.built) sim.build(pod)
    sim.step(Math.min(dt, 1 / 20), pod, rig.gust)
    rig.gust = 0
    // carrying the plug: judge "near the port" on screen, and let the port pull it in like a magnet
    if (sim.drag && sim.drag.i === sim.PLUG) {
      V.set(POD.port.x, POD.H / 2, POD.port.z).add(PLUG.body).applyMatrix4(pod.matrixWorld)
      const sp = V.clone().project(camera)
      const r = gl.domElement.getBoundingClientRect()
      const sx = r.left + ((sp.x + 1) / 2) * r.width
      const sy = r.top + ((1 - sp.y) / 2) * r.height
      const near = Math.hypot(rig.pointer.cx - sx, rig.pointer.cy - sy) < 90
      if (near) {
        sim.nearPort = true
        sim.drag.target.lerp(V, 0.3)
      }
    }
    rig.portGlow = sim.drag?.i === sim.PLUG && sim.nearPort ? 1 : 0

    catmull(sim.pts, sim.mainIds, 3, samples[0])
    tubes[0].update(samples[0], CABLE_R)
    catmull(sim.pts, sim.leftIds, 3, samples[1])
    tubes[1].update(samples[1], CABLE_R * 0.9)
    catmull(sim.pts, sim.rightIds, 3, samples[2])
    tubes[2].update(samples[2], CABLE_R * 0.9)

    orientBud(budL.current, sim.BUD_L, sim.BUD_L - 1, 0.3)
    orientBud(budR.current, sim.BUD_R, sim.BUD_R - 1, 0.3)
    orientBud(splitRef.current, sim.SPLIT, sim.SPLIT - 1, 0.5)
    orientBud(remoteRef.current, sim.REMOTE, sim.REMOTE - 1, 0.5)

    // the plug: locked to the pod when plugged in, otherwise it follows its two particles
    const plug = plugRef.current
    if (plug) {
      if (sim.plugged) {
        V.set(POD.port.x, POD.H / 2, POD.port.z).applyMatrix4(pod.matrixWorld)
        pod.getWorldQuaternion(Q)
        const k = 0.25 + 0.75 * sim.insert
        plug.position.lerp(V, k)
        plug.quaternion.slerp(Q, k)
      } else {
        const b = sim.pts[sim.PLUG]
        const e = sim.pts[sim.START]
        X.set(e.x - b.x, e.y - b.y, e.z - b.z).normalize()
        // lie flat when it can; when the cable hangs straight, face the viewer instead of spinning
        V.copy(camera.position).sub(plug.position).normalize()
        Z.copy(UP).addScaledVector(X, -UP.dot(X)).addScaledVector(V.addScaledVector(X, -V.dot(X)), 0.35)
        if (Z.lengthSq() < 1e-6) Z.set(0, 0, 1)
        Z.normalize()
        Y.crossVectors(Z, X)
        M.makeBasis(X, Y, Z)
        Q.setFromRotationMatrix(M)
        plug.quaternion.slerp(Q, 0.35)
        V.set(-PLUG.body.x, -PLUG.body.y, 0).applyQuaternion(plug.quaternion).add(new THREE.Vector3(b.x, b.y, b.z))
        plug.position.copy(V)
      }
    }
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
    if (i === sim.PLUG && sim.plugged) {
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
      if (sim.drag?.i === sim.PLUG && sim.nearPort) {
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
  const grab = (i: number) => (e: ThreeEvent<PointerEvent>) => startDrag(i, e)
  const grabCable = (e: ThreeEvent<PointerEvent>) => {
    const i = sim.nearest(e.point.x, e.point.y, e.point.z)
    // holding the cable right at the plug means holding the plug
    startDrag(!sim.plugged && i <= sim.START + 1 ? sim.PLUG : i, e)
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

  const bud = (ref: RefObject<THREE.Group | null>, i: number) => (
    <group ref={ref} onPointerDown={grab(i)} {...hover}>
      <group scale={0.82}>
        <mesh geometry={geo.housing} material={mats.plastic} castShadow receiveShadow />
        <mesh geometry={geo.stem} material={mats.plastic} position-y={0.072} castShadow />
        <mesh geometry={geo.accent} material={mats.polished} position-z={-0.0455} />
        <mesh geometry={geo.vent} material={mats.dark} position={[0.034, 0.03, -0.036]} rotation-x={Math.PI / 2} />
        <group position={[0, -0.008, 0.02]} rotation-x={Math.PI / 2 + 0.38}>
          <mesh geometry={geo.nozzle} material={mats.plastic} position-y={0.035} castShadow />
          <mesh geometry={geo.tip} material={mats.tip} position-y={0.052} castShadow />
        </group>
      </group>
    </group>
  )

  return (
    <group>
      {/* cable */}
      <mesh geometry={tubes[0].geometry} material={mats.cable} castShadow frustumCulled={false} onPointerDown={grabCable} {...hover} />
      <mesh geometry={tubes[1].geometry} material={mats.cable} castShadow frustumCulled={false} onPointerDown={grabCable} {...hover} />
      <mesh geometry={tubes[2].geometry} material={mats.cable} castShadow frustumCulled={false} onPointerDown={grabCable} {...hover} />

      {bud(budL, sim.BUD_L)}
      {bud(budR, sim.BUD_R)}

      <group ref={splitRef}>
        <mesh geometry={geo.splitter} material={mats.metal} castShadow />
      </group>

      {/* inline remote with + and - buttons */}
      <group ref={remoteRef} onPointerDown={grab(sim.REMOTE)} {...hover}>
        <RoundedBox args={[0.036, 0.11, 0.022]} radius={0.01} smoothness={4} material={mats.plastic} castShadow />
        <mesh geometry={geo.bump} material={mats.plastic} position={[0, 0.028, 0.0115]} rotation-x={Math.PI / 2} />
        <mesh geometry={geo.bump} material={mats.plastic} position={[0, -0.028, 0.0115]} rotation-x={Math.PI / 2} />
      </group>

      {/* right-angle USB-C plug; grab it to pull it out */}
      <group ref={plugRef} onPointerDown={grab(sim.PLUG)} {...hover}>
        <mesh geometry={geo.connector} material={mats.steel} />
        <mesh geometry={geo.hole} material={mats.dark} />
        <RoundedBox
          args={[0.25, 0.075, 0.064]}
          radius={0.022}
          smoothness={5}
          position={[0.078, 0.0375, 0]}
          material={mats.metal}
          castShadow
        />
        <mesh geometry={geo.relief} material={mats.cable} position={[0.205, 0.0375, 0]} rotation-z={-Math.PI / 2} castShadow />
      </group>
    </group>
  )
}
