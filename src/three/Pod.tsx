import { RoundedBox } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { rig, type Zone } from '../rig'
import type { Pod } from '../usePod'
import { UI } from './fonts'
import { Internals } from './Internals'
import { POD_Y } from './layout'
import {
  backGlassGeometry,
  buttonGeometry,
  frameGeometry,
  frontGlassGeometry,
  POD,
  roundedRect,
  stadiumGeometry,
  wheelGeometry,
} from './model'
import { PodOS, screenMaterial } from './os'
import { FINISHES, type Finish } from './palette'
import { quality } from './quality'

const STEP = (Math.PI * 2) / 24 // wheel detents per turn

function zoneOf(a: number): Zone {
  if (a >= -0.75 * Math.PI && a < -0.25 * Math.PI) return 'menu'
  if (a >= -0.25 * Math.PI && a < 0.25 * Math.PI) return 'next'
  if (a >= 0.25 * Math.PI && a < 0.75 * Math.PI) return 'play'
  return 'prev'
}

/** A flat rounded rectangle with 0..1 UVs. */
export function roundedPlane(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 24)
  const p = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5)
  return g
}

/** The printing on the clear wheel (transparent everywhere else). */
function wheelPrint() {
  const S = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const icon = (d: string, x: number, y: number, w: number) => {
    const p = new Path2D(d)
    ctx.save()
    ctx.translate(x - w / 2, y - w / 4)
    ctx.scale(w / 24, w / 24)
    ctx.fill(p)
    ctx.restore()
  }
  const draw = (f: Finish, pressed: Zone | 'center' | null) => {
    const c = S / 2
    ctx.clearRect(0, 0, S, S)
    if (pressed && pressed !== 'center') {
      const from = { menu: -135, next: -45, play: 45, prev: 135 }[pressed]
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.beginPath()
      ctx.moveTo(c, c)
      ctx.arc(c, c, c, (from * Math.PI) / 180, ((from + 90) * Math.PI) / 180)
      ctx.fill()
    }
    ctx.fillStyle = f.ink
    ctx.globalAlpha = 0.92
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `650 ${S * 0.058}px ${UI}`
    if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${S * 0.014}px`
    ctx.fillText('MENU', c + S * 0.007, S * 0.125)
    const w = S * 0.1
    icon('M1 1l7 5-7 5zM9 1l7 5-7 5zM17 1h2.4v10H17z', S - S * 0.125, c, w)
    icon('M4.6 1H7v10H4.6zM15 1l-7 5 7 5zM23 1l-7 5 7 5z', S * 0.125, c, w)
    icon('M2 1l8 5-8 5zM13 1h2.6v10H13zM18 1h2.6v10H18z', c, S - S * 0.12, w)
    // a red dot, because why not
    ctx.fillStyle = '#ff3b30'
    ctx.beginPath()
    ctx.arc(c + S * 0.27, S * 0.255, S * 0.009, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    tex.needsUpdate = true
  }
  return { tex, draw }
}

function glass(f: Finish, rough: number, thickness: number, milk = 0) {
  if (quality.tier === 'low') {
    const m = new THREE.MeshPhysicalMaterial({ transparent: true, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.04 })
    tintFake(m, f, rough, milk)
    return m
  }
  return new THREE.MeshPhysicalMaterial({
    color: f.glass,
    transmission: 1,
    roughness: rough,
    thickness,
    ior: 1.5,
    attenuationColor: f.attenuation,
    attenuationDistance: f.attenuationDistance,
    specularIntensity: 1,
    envMapIntensity: 1.2,
  })
}

/**
 * Glass for the light budget: no refraction (that needs a second render of the whole scene),
 * just a see-through tint with strong reflections, which reads the same on thin flat glass.
 */
function tintFake(m: THREE.MeshPhysicalMaterial, f: Finish, rough: number, milk: number) {
  const frosted = rough > 0.2
  const tinted = f.attenuationDistance < 0.3
  if (frosted) {
    m.color.set(f.glass)
    m.opacity = 0.8
    m.envMapIntensity = 1
  } else if (tinted) {
    m.color.set(f.attenuation)
    m.opacity = 0.42 + milk * 0.5
    m.envMapIntensity = 2.2
  } else if (milk > 0) {
    // a light frost over the dark board reads as the grey of the real acrylic
    m.color.set('#c9cdd3')
    m.opacity = milk
    m.envMapIntensity = 2.5
  } else {
    m.color.set('#000000')
    m.opacity = 0.1
    m.envMapIntensity = 5
  }
  m.roughness = Math.min(rough, 0.35)
}

type Props = {
  pod: Pod
  x: number
  split: boolean
  accent: string
  roomA: string
  roomB: string
  groupRef: RefObject<THREE.Group | null>
}

export function PodModel({ pod, x, split, accent, roomA, roomB, groupRef }: Props) {
  const { camera, gl } = useThree()
  const finish = FINISHES[pod.settings.body]
  const os = useMemo(() => new PodOS(), [])
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__os = os
  }, [os])
  const print = useMemo(() => wheelPrint(), [])
  const geo = useMemo(() => {
    const port = stadiumGeometry(0.09, 0.032)
    port.rotateX(Math.PI)
    return {
      frame: frameGeometry(),
      front: frontGlassGeometry(),
      back: backGlassGeometry(),
      wheel: wheelGeometry(),
      button: buttonGeometry(),
      panel: roundedPlane(POD.display.w, POD.display.h, POD.display.r),
      active: new THREE.PlaneGeometry(POD.active.w, POD.active.h),
      port,
    }
  }, [])
  const mats = useMemo(() => {
    const f = FINISHES.clear
    return {
      frame: new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.32, color: f.frame }),
      glass: glass(f, f.glassRough, 0.006),
      acrylic: glass(f, 0.16, 0.007, 0.16),
      // a satin button, so it reads as something to press against the clear wheel
      button: new THREE.MeshPhysicalMaterial({ color: f.button, roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.22 }),
      print: new THREE.MeshBasicMaterial({ map: print.tex, transparent: true, depthWrite: false }),
      panel: new THREE.MeshPhysicalMaterial({ color: '#020203', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }),
      cover: new THREE.MeshStandardMaterial({
        color: '#000000',
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        envMapIntensity: 2.2,
      }),
      screen: screenMaterial(os.texture),
      lensRing: new THREE.MeshPhysicalMaterial({ color: '#050506', roughness: 0.2, clearcoat: 1 }),
      lens: new THREE.MeshPhysicalMaterial({
        color: '#0c1020',
        roughness: 0.04,
        metalness: 0.3,
        clearcoat: 1,
        iridescence: quality.tier === 'high' ? 1 : 0,
        iridescenceIOR: 1.7,
      }),
      lensInner: new THREE.MeshStandardMaterial({ color: '#4c525b', metalness: 1, roughness: 0.3 }),
      port: new THREE.MeshBasicMaterial({ color: '#030303' }),
      insert: new THREE.MeshStandardMaterial({ color: '#2a2d32', roughness: 0.6 }),
      red: new THREE.MeshStandardMaterial({ color: '#ff3b30', roughness: 0.4 }),
    }
  }, [print, os])

  useEffect(() => {
    mats.frame.color.set(finish.frame)
    mats.frame.roughness = finish.frameRough
    for (const [m, rough, milk] of [
      [mats.glass, finish.glassRough, 0],
      [mats.acrylic, Math.max(0.16, finish.glassRough), 0.16],
    ] as const) {
      if (quality.tier === 'low') {
        tintFake(m, finish, rough, milk)
        continue
      }
      m.color.set(finish.glass)
      m.attenuationColor.set(finish.attenuation)
      m.attenuationDistance = finish.attenuationDistance
      m.roughness = rough
    }
    mats.button.color.set(finish.button)
    print.draw(finish, rig.pressed)
  }, [finish, mats, print])

  // ------------------------------------------------------------ motion
  const motion = useRef({ x: 0, y: POD_Y, yaw: -0.2, pitch: 0.05, vx: 0, vy: 0, vyaw: 0, vpitch: 0 })
  const wheelRef = useRef<THREE.Group>(null)
  const buttonRef = useRef<THREE.Group>(null)
  const powerRef = useRef<THREE.Group>(null)
  const lastPressed = useRef<Zone | 'center' | null>(null)
  const live = useRef({ pod, accent, finish, x, split, roomA, roomB })
  live.current = { pod, accent, finish, x, split, roomA, roomB }

  useFrame((state, dt) => {
    const g = groupRef.current
    if (!g) return
    const L = live.current
    const m = motion.current
    const t = state.clock.elapsedTime
    const still = rig.reducedMotion
    const px = rig.pointer.x - 0.5
    const py = rig.pointer.y - 0.5
    const ty = POD_Y + (still ? 0 : Math.sin(t * 0.9) * 0.008)
    const tyaw = (L.split ? 0.18 : -0.22) + (still ? 0 : px * 0.26 + Math.sin(t * 0.45) * 0.02)
    const tpitch = 0.05 + (still ? 0 : py * 0.12)
    m.vpitch += rig.kickPitch
    m.vyaw += rig.kickYaw
    m.vy += rig.kickY
    rig.kickPitch = rig.kickYaw = rig.kickY = 0
    const steps = Math.max(1, Math.min(4, Math.round(dt * 60)))
    for (let i = 0; i < steps; i++) {
      m.vx = (m.vx + (L.x - m.x) * 0.035) * 0.86
      m.vy = (m.vy + (ty - m.y) * 0.05) * 0.84
      m.vyaw = (m.vyaw + (tyaw - m.yaw) * 0.04) * 0.86
      m.vpitch = (m.vpitch + (tpitch - m.pitch) * 0.05) * 0.84
      m.x += m.vx
      m.y += m.vy
      m.yaw += m.vyaw
      m.pitch += m.vpitch
    }
    g.position.set(m.x, m.y, 0)
    g.rotation.set(m.pitch, m.yaw, 0)

    // wheel tilt, button travel, power button travel
    const pr = rig.pressed
    const wg = wheelRef.current
    if (wg) {
      const rx = pr === 'menu' ? -0.04 : pr === 'play' ? 0.04 : 0
      const ry = pr === 'next' ? 0.04 : pr === 'prev' ? -0.04 : 0
      wg.rotation.x += (rx - wg.rotation.x) * 0.35
      wg.rotation.y += (ry - wg.rotation.y) * 0.35
    }
    const bg = buttonRef.current
    if (bg) bg.position.z += ((pr === 'center' ? -0.0013 : 0) - bg.position.z) * 0.45
    const pw = powerRef.current
    if (pw) {
      const down = performance.now() - rig.powerAt < 140
      pw.position.x += ((down ? -0.0045 : 0) - pw.position.x) * 0.5
    }
    if (pr !== lastPressed.current) {
      print.draw(L.finish, pr)
      lastPressed.current = pr
    }

    // the display
    const now = performance.now()
    const p = L.pod
    os.roomA = L.roomA
    os.roomB = L.roomB
    os.update(p, now, L.accent)
    const u = mats.screen.uniforms.uPower
    const target = p.power === 'off' ? 0 : p.power === 'booting' ? Math.min(1, (now - p.bootAt) / 420) : 1
    u.value += (target - u.value) * 0.25
  }, -3)

  // ------------------------------------------------------------ input
  const drag = useRef<{ cx: number; cy: number; last: number; acc: number; moved: number; zone: Zone } | null>(null)

  const onWheelDown = (e: ThreeEvent<PointerEvent>) => {
    const wg = wheelRef.current
    if (!wg) return
    const local = wg.worldToLocal(e.point.clone())
    if (Math.hypot(local.x, local.y) < POD.wheel.hole) return
    e.stopPropagation()
    const zone = zoneOf(Math.atan2(-local.y, local.x))
    const c = new THREE.Vector3()
    wg.getWorldPosition(c).project(camera)
    const rect = gl.domElement.getBoundingClientRect()
    const cx = rect.left + ((c.x + 1) / 2) * rect.width
    const cy = rect.top + ((1 - c.y) / 2) * rect.height
    const a0 = Math.atan2(e.nativeEvent.clientY - cy, e.nativeEvent.clientX - cx)
    drag.current = { cx, cy, last: a0, acc: 0, moved: 0, zone }
    rig.busy = true
    rig.pressed = zone
    document.body.style.cursor = 'grabbing'
    const move = (ev: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const a = Math.atan2(ev.clientY - d.cy, ev.clientX - d.cx)
      let diff = a - d.last
      if (diff > Math.PI) diff -= Math.PI * 2
      if (diff < -Math.PI) diff += Math.PI * 2
      d.last = a
      d.acc += diff
      d.moved += Math.abs(diff)
      if (d.moved > 0.12 && rig.pressed === d.zone) rig.pressed = null
      while (d.acc >= STEP) {
        live.current.pod.act('scrollDown')
        d.acc -= STEP
      }
      while (d.acc <= -STEP) {
        live.current.pod.act('scrollUp')
        d.acc += STEP
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      const d = drag.current
      drag.current = null
      rig.busy = false
      document.body.style.cursor = ''
      if (d && d.moved < 0.12) {
        live.current.pod.act(d.zone)
        rig.pressed = d.zone
        window.setTimeout(() => {
          if (rig.pressed === d.zone) rig.pressed = null
        }, 150)
      } else rig.pressed = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const onButtonDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    rig.busy = true
    rig.pressed = 'center'
    const up = () => {
      rig.busy = false
      window.setTimeout(() => {
        if (rig.pressed === 'center') rig.pressed = null
      }, 120)
    }
    window.addEventListener('pointerup', up, { once: true })
  }

  const cursor = (c: string) => () => {
    if (!drag.current) document.body.style.cursor = c
  }

  const { W, H, FRONT, ZC, display, lens, wheel, power } = POD

  return (
    <group ref={groupRef}>
      {/* the metal frame and the clear shell */}
      <mesh geometry={geo.frame} material={mats.frame} castShadow receiveShadow />
      <mesh geometry={geo.front} material={mats.glass} />
      <mesh geometry={geo.back} material={mats.glass} />
      <Internals finish={finish} />

      {/* display: black panel, lit area, reflections on its cover glass */}
      <mesh geometry={geo.panel} material={mats.panel} position={[0, display.y, FRONT - 0.0006]} />
      <mesh geometry={geo.active} material={mats.screen} position={[0, display.y, FRONT - 0.0003]} />
      <mesh geometry={geo.panel} material={mats.cover} position={[0, display.y, FRONT + 0.0003]} />

      {/* punch-hole camera */}
      <group position={[0, lens.y, FRONT - 0.0001]}>
        <mesh material={mats.lensRing}>
          <circleGeometry args={[lens.r, 48]} />
        </mesh>
        <mesh material={mats.lensInner} position-z={0.0001}>
          <ringGeometry args={[lens.r * 0.56, lens.r * 0.66, 48]} />
        </mesh>
        <mesh material={mats.lens} position-z={0.0002}>
          <circleGeometry args={[lens.r * 0.56, 48]} />
        </mesh>
      </group>

      {/* clear wheel with printed labels, and the clear centre button */}
      <group ref={wheelRef} position={[0, wheel.y, 0]}>
        <mesh
          geometry={geo.wheel}
          material={mats.acrylic}
          onPointerDown={onWheelDown}
          onPointerOver={cursor('grab')}
          onPointerOut={cursor('')}
        />
        <mesh material={mats.print} position-z={FRONT + 0.0018} renderOrder={2}>
          <ringGeometry args={[wheel.hole, wheel.r, 128]} />
        </mesh>
        <group ref={buttonRef}>
          <mesh
            geometry={geo.button}
            material={mats.button}
            position-z={FRONT - 0.0006}
            onPointerDown={onButtonDown}
            onClick={(e) => {
              e.stopPropagation()
              live.current.pod.act('select')
            }}
            onPointerOver={cursor('pointer')}
            onPointerOut={cursor('')}
          />
        </group>
      </group>

      {/* side power button (P on the keyboard presses it too) */}
      <group ref={powerRef}>
        <RoundedBox
          args={[0.014, power.len, 0.026]}
          radius={0.006}
          smoothness={3}
          position={[W / 2 + 0.0025, power.y, ZC]}
          material={mats.frame}
          castShadow
          onClick={(e) => {
            e.stopPropagation()
            live.current.pod.togglePower()
          }}
          onPointerOver={cursor('pointer')}
          onPointerOut={cursor('')}
        />
        <mesh position={[W / 2 + 0.0098, power.y, ZC]} material={mats.red}>
          <boxGeometry args={[0.0008, power.len * 0.42, 0.004]} />
        </mesh>
      </group>

      {/* antenna breaks in the frame, and the USB-C port at the bottom */}
      {[
        [W / 2 + 0.0004, 0.43],
        [W / 2 + 0.0004, -0.38],
        [-W / 2 - 0.0004, 0.43],
        [-W / 2 - 0.0004, -0.38],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, ZC]} material={mats.insert}>
          <boxGeometry args={[0.002, 0.006, 0.07]} />
        </mesh>
      ))}
      <mesh geometry={geo.port} material={mats.port} position={[POD.port.x, -H / 2 - 0.0004, POD.port.z]} />
    </group>
  )
}
