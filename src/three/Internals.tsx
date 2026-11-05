import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../rig'
import {
  batteryLabel,
  BOARD,
  boardTextures,
  chipTexture,
  flexTexture,
  PARTS,
  SCREWS,
  sensorTextures,
  shieldTextures,
} from './internals'
import { POD } from './model'
import type { Finish } from './palette'

const TOP = BOARD.z + BOARD.t / 2 // top surface of the board

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/** Box with its own material on the top face (+z). */
function topBox(top: THREE.Material, side: THREE.Material) {
  return [side, side, side, side, top, side]
}

/** Everything visible through the clear shell. */
export function Internals({ finish }: { finish: Finish }) {
  const kind = finish.pcb
  const t = useMemo(
    () => ({
      board: boardTextures(kind),
      sensor: sensorTextures(kind, POD.wheel.r - 0.001, POD.wheel.hole - 0.002),
      shield: shieldTextures(),
      battery: batteryLabel(),
      flash: chipTexture(['KP-NAND', '256 GB', '2604 · KR']),
      pmic: chipTexture(['PMU', 'K26 A1']),
      flexDisp: flexTexture(kind, 'J2 · DISPLAY FPC'),
      flexBatt: flexTexture(kind, 'BATT · 3.87 V'),
      flexAnt: flexTexture(kind, 'ANT · 2.4 / 5 GHz'),
    }),
    [kind],
  )

  const m = useMemo(() => {
    const dark = kind === 'black'
    return {
      boardTop: new THREE.MeshPhysicalMaterial({
        map: t.board.map,
        roughnessMap: t.board.orm,
        metalnessMap: t.board.orm,
        roughness: 1,
        metalness: 1,
        clearcoat: 0.5,
        clearcoatRoughness: 0.4,
      }),
      boardEdge: new THREE.MeshStandardMaterial({ color: dark ? '#1b1e23' : '#d8dbe0', roughness: 0.6 }),
      metal: new THREE.MeshStandardMaterial({ color: '#c8ccd2', metalness: 1, roughness: 0.26 }),
      steel: new THREE.MeshStandardMaterial({ color: '#a9aeb6', metalness: 1, roughness: 0.32 }),
      shieldTop: new THREE.MeshStandardMaterial({
        map: t.shield.map,
        roughnessMap: t.shield.orm,
        metalnessMap: t.shield.orm,
        roughness: 1,
        metalness: 1,
      }),
      sensor: new THREE.MeshPhysicalMaterial({
        map: t.sensor.map,
        roughnessMap: t.sensor.orm,
        metalnessMap: t.sensor.orm,
        roughness: 1,
        metalness: 1,
        clearcoat: 0.4,
      }),
      battery: new THREE.MeshPhysicalMaterial({ color: '#b8bdc4', metalness: 0.75, roughness: 0.4 }),
      batteryLabel: new THREE.MeshStandardMaterial({ map: t.battery, roughness: 0.55 }),
      chipSide: new THREE.MeshStandardMaterial({ color: '#16181c', roughness: 0.45 }),
      flash: new THREE.MeshStandardMaterial({ map: t.flash, roughness: 0.45 }),
      pmic: new THREE.MeshStandardMaterial({ map: t.pmic, roughness: 0.45 }),
      flexDisp: new THREE.MeshStandardMaterial({ map: t.flexDisp, roughness: 0.4, side: THREE.DoubleSide }),
      flexBatt: new THREE.MeshStandardMaterial({ map: t.flexBatt, roughness: 0.4, side: THREE.DoubleSide }),
      flexAnt: new THREE.MeshStandardMaterial({ map: t.flexAnt, roughness: 0.4 }),
      connector: new THREE.MeshStandardMaterial({ color: '#1c1e22', roughness: 0.5 }),
      module: new THREE.MeshStandardMaterial({ color: '#08090b', roughness: 0.5 }),
      backplate: new THREE.MeshStandardMaterial({ color: '#aab0b8', metalness: 1, roughness: 0.42 }),
      screwSlot: new THREE.MeshBasicMaterial({ color: '#202328' }),
      red: new THREE.MeshStandardMaterial({ color: '#ff3b30', roughness: 0.5 }),
      passive: new THREE.MeshStandardMaterial({ roughness: 0.55 }),
      led: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      glow: new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    }
  }, [t, kind])

  // ~200 tiny capacitors, resistors and inductors, scattered where there is room
  const passives = useRef<THREE.InstancedMesh>(null)
  const COUNT = 210
  useLayoutEffect(() => {
    const im = passives.current
    if (!im) return
    const r = rng(1337)
    const o = new THREE.Object3D()
    const col = new THREE.Color()
    const rects = [
      [-0.27, -0.468, -0.16, -0.132],
      [0.16, -0.468, 0.27, -0.132],
      [-0.15, -0.162, 0.15, -0.131],
    ]
    const blocked = (x: number, y: number) => {
      if (Math.hypot(x, y - POD.wheel.y) < POD.wheel.r + 0.008) return true
      for (const p of Object.values(PARTS)) {
        const hw = ('w' in p ? p.w : p.r * 2) / 2 + 0.008
        const hh = ('h' in p ? p.h : p.r * 2) / 2 + 0.008
        if (Math.abs(x - p.x) < hw && Math.abs(y - p.y) < hh) return true
      }
      for (const [sx, sy] of SCREWS) if (Math.hypot(x - sx, y - sy) < 0.022) return true
      return false
    }
    let n = 0
    let guard = 0
    while (n < COUNT && guard++ < 20000) {
      const [x0, y0, x1, y1] = rects[Math.floor(r() * rects.length)]
      const x = x0 + r() * (x1 - x0)
      const y = y0 + r() * (y1 - y0)
      if (blocked(x, y)) continue
      const kindR = r()
      const big = kindR > 0.9
      const l = big ? 0.018 : kindR > 0.6 ? 0.012 : 0.009
      const w = big ? 0.018 : l * 0.5
      const h = big ? 0.008 : l * 0.4
      o.position.set(x, y, TOP + h / 2)
      o.rotation.set(0, 0, r() < 0.5 ? 0 : Math.PI / 2)
      o.scale.set(l, w, h)
      o.updateMatrix()
      im.setMatrixAt(n, o.matrix)
      col.set(big ? '#3b3e44' : kindR > 0.45 ? '#a59d90' : '#1e2024')
      im.setColorAt(n, col)
      n++
    }
    im.count = n
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
  }, [])

  // the light ring under the wheel glows with each tick
  const glow = useRef(0)
  useFrame((_, dt) => {
    glow.current = Math.max(0, glow.current - dt * 2.2)
    if (rig.ledPulse > 0) {
      glow.current = Math.min(1, glow.current + rig.ledPulse * 0.35)
      rig.ledPulse = 0
    }
    m.glow.opacity = glow.current * 0.7
    m.led.color.setScalar(0.6 + glow.current * 3)
  })

  const bx = (BOARD.x0 + BOARD.x1) / 2
  const by = (BOARD.y0 + BOARD.y1) / 2
  const flexAngle = Math.atan2(0.02, 0.03)

  return (
    <group>
      {/* battery, behind the display; its label shows through the back glass */}
      <RoundedBox args={[0.54, 0.5, 0.046]} radius={0.01} smoothness={3} position={[0, 0.19, -0.008]} material={m.battery} castShadow />
      <mesh position={[0, 0.19, -0.0312]} rotation-y={Math.PI} material={m.batteryLabel}>
        <planeGeometry args={[0.5, 0.46]} />
      </mesh>
      <mesh position={[0.21, -0.075, 0.004]} material={m.red}>
        <boxGeometry args={[0.04, 0.05, 0.001]} />
      </mesh>

      {/* display module and its back plate */}
      <mesh position={[0, POD.display.y, 0.0395]} material={m.module}>
        <boxGeometry args={[POD.display.w - 0.006, POD.display.h - 0.006, 0.011]} />
      </mesh>
      <mesh position={[0, POD.display.y, 0.0325]} material={m.backplate}>
        <boxGeometry args={[POD.display.w - 0.014, POD.display.h - 0.014, 0.003]} />
      </mesh>

      {/* flex cables */}
      <mesh position={[0, -0.133, 0.022]} rotation-x={flexAngle} material={m.flexDisp}>
        <planeGeometry args={[0.09, 0.034]} />
      </mesh>
      <mesh position={[-0.17, -0.126, 0.016]} rotation-x={flexAngle} material={m.flexBatt}>
        <planeGeometry args={[0.05, 0.034]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.281, 0.17, 0.03]} material={m.flexAnt}>
          <planeGeometry args={[0.01, 0.56]} />
        </mesh>
      ))}

      {/* main board */}
      <mesh position={[bx, by, BOARD.z]} material={topBox(m.boardTop, m.boardEdge)} receiveShadow>
        <boxGeometry args={[BOARD.x1 - BOARD.x0, BOARD.y1 - BOARD.y0, BOARD.t]} />
      </mesh>
      <instancedMesh ref={passives} args={[undefined, undefined, COUNT]} material={m.passive} castShadow>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>

      {/* shield cans */}
      {[PARTS.socCan, PARTS.rfCan].map((p, i) => (
        <mesh key={i} position={[p.x, p.y, TOP + p.d / 2]} material={topBox(m.shieldTop, m.metal)} castShadow>
          <boxGeometry args={[p.w, p.h, p.d]} />
        </mesh>
      ))}
      {/* chips */}
      <mesh position={[PARTS.flash.x, PARTS.flash.y, TOP + PARTS.flash.d / 2]} material={topBox(m.flash, m.chipSide)} castShadow>
        <boxGeometry args={[PARTS.flash.w, PARTS.flash.h, PARTS.flash.d]} />
      </mesh>
      <mesh position={[PARTS.pmic.x, PARTS.pmic.y, TOP + PARTS.pmic.d / 2]} material={topBox(m.pmic, m.chipSide)} castShadow>
        <boxGeometry args={[PARTS.pmic.w, PARTS.pmic.h, PARTS.pmic.d]} />
      </mesh>
      <RoundedBox
        args={[PARTS.crystal.w, PARTS.crystal.h, PARTS.crystal.d]}
        radius={0.003}
        position={[PARTS.crystal.x, PARTS.crystal.y, TOP + PARTS.crystal.d / 2]}
        material={m.metal}
        castShadow
      />
      {/* board-to-board connector for the display */}
      <mesh position={[PARTS.dispConn.x, PARTS.dispConn.y, TOP + PARTS.dispConn.d / 2]} material={m.connector} castShadow>
        <boxGeometry args={[PARTS.dispConn.w, PARTS.dispConn.h, PARTS.dispConn.d]} />
      </mesh>
      <mesh position={[PARTS.dispConn.x, PARTS.dispConn.y, TOP + PARTS.dispConn.d + 0.0006]} material={m.steel}>
        <boxGeometry args={[PARTS.dispConn.w - 0.012, PARTS.dispConn.h - 0.01, 0.001]} />
      </mesh>
      {/* haptic motor */}
      <mesh
        position={[PARTS.haptic.x, PARTS.haptic.y, TOP + PARTS.haptic.d / 2]}
        rotation-x={Math.PI / 2}
        material={m.steel}
        castShadow
      >
        <cylinderGeometry args={[PARTS.haptic.r, PARTS.haptic.r, PARTS.haptic.d, 48]} />
      </mesh>
      <mesh position={[PARTS.haptic.x, PARTS.haptic.y, TOP + PARTS.haptic.d + 0.0004]} material={m.connector}>
        <ringGeometry args={[PARTS.haptic.r * 0.55, PARTS.haptic.r * 0.72, 48]} />
      </mesh>

      {/* USB-C receptacle at the bottom edge */}
      <RoundedBox
        args={[PARTS.usb.w, PARTS.usb.h, PARTS.usb.d]}
        radius={0.006}
        position={[PARTS.usb.x, PARTS.usb.y, POD.ZC]}
        material={m.steel}
        castShadow
      />

      {/* wheel sensor, dome switch, and the light ring */}
      <mesh position={[0, POD.wheel.y, 0.0355]} material={m.sensor}>
        <ringGeometry args={[POD.wheel.hole - 0.002, POD.wheel.r - 0.001, 128]} />
      </mesh>
      <mesh position={[0, POD.wheel.y, 0.0345]} material={m.connector}>
        <circleGeometry args={[POD.wheel.hole - 0.002, 64]} />
      </mesh>
      <mesh position={[0, POD.wheel.y, 0.0348]} rotation-x={Math.PI / 2} material={m.metal}>
        <sphereGeometry args={[0.03, 32, 12, 0, Math.PI * 2, 0, Math.PI / 5]} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        return (
          <mesh key={i} position={[Math.cos(a) * 0.104, POD.wheel.y + Math.sin(a) * 0.104, 0.0368]} material={m.led}>
            <boxGeometry args={[0.009, 0.006, 0.002]} />
          </mesh>
        )
      })}
      <mesh position={[0, POD.wheel.y, 0.039]} material={m.glow}>
        <ringGeometry args={[0.07, 0.142, 96]} />
      </mesh>

      {/* screws: four in the board, two above the display */}
      {SCREWS.map(([x, y], i) => {
        const z = y > 0 ? 0.0365 : TOP + 0.002
        return (
          <group key={i} position={[x, y, z]}>
            <mesh rotation-x={Math.PI / 2} material={m.metal} castShadow>
              <cylinderGeometry args={[0.011, 0.011, 0.004, 24]} />
            </mesh>
            <mesh position-z={0.0021} material={m.screwSlot}>
              <boxGeometry args={[0.012, 0.0024, 0.0004]} />
            </mesh>
            <mesh position-z={0.0021} rotation-z={Math.PI / 2} material={m.screwSlot}>
              <boxGeometry args={[0.012, 0.0024, 0.0004]} />
            </mesh>
          </group>
        )
      })}

      {/* screw bosses in the corners of the frame */}
      {[
        [-0.25, 0.43],
        [0.25, 0.43],
        [-0.25, -0.43],
        [0.25, -0.43],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, -0.016]} rotation-x={Math.PI / 2} material={m.steel}>
          <cylinderGeometry args={[0.014, 0.014, 0.034, 20]} />
        </mesh>
      ))}
    </group>
  )
}
