import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { rig, type Zone } from '../rig'
import type { Pod } from '../usePod'
import { UI } from './fonts'
import { POD_Y } from './layout'
import { bodyGeometries, buttonGeometry, POD, roundedRect, stadiumGeometry } from './model'
import { PodOS, screenMaterial } from './os'
import { FINISHES, type Finish } from './palette'

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

/** Etched labels on the wheel, drawn into its colour map. */
function wheelFace() {
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
    ctx.fillStyle = f.metal
    ctx.fillRect(0, 0, S, S)
    // the turned finish also shows faintly in the colour
    for (let r = 30; r < c; r += 5) {
      ctx.strokeStyle = `rgba(255,255,255,${r % 15 === 0 ? 0.045 : 0.02})`
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(c, c, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (pressed && pressed !== 'center') {
      const from = { menu: -135, next: -45, play: 45, prev: 135 }[pressed]
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.beginPath()
      ctx.moveTo(c, c)
      ctx.arc(c, c, c, (from * Math.PI) / 180, ((from + 90) * Math.PI) / 180)
      ctx.fill()
    }
    ctx.fillStyle = f.ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `650 ${S * 0.062}px ${UI}`
    if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${S * 0.012}px`
    ctx.fillText('MENU', c + S * 0.006, S * 0.135)
    const w = S * 0.11
    icon('M1 1l7 5-7 5zM9 1l7 5-7 5zM17 1h2.4v10H17z', S - S * 0.135, c, w)
    icon('M4.6 1H7v10H4.6zM15 1l-7 5 7 5zM23 1l-7 5 7 5z', S * 0.135, c, w)
    icon('M2 1l8 5-8 5zM13 1h2.6v10H13zM18 1h2.6v10H18z', c, S - S * 0.13, w)
    tex.needsUpdate = true
  }
  return { tex, draw }
}

/** Tangential brushing directions, so the wheel catches light like turned metal. */
function turnedAnisotropy() {
  const S = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(S, S)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S - 0.5
      const v = 0.5 - (y + 0.5) / S
      const l = Math.hypot(u, v) || 1
      const k = (y * S + x) * 4
      img.data[k] = (-v / l) * 127.5 + 127.5
      img.data[k + 1] = (u / l) * 127.5 + 127.5
      img.data[k + 2] = 255
      img.data[k + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace
  return tex
}

type Props = {
  pod: Pod
  x: number
  split: boolean
  accent: string
  groupRef: RefObject<THREE.Group | null>
}

export function PodModel({ pod, x, split, accent, groupRef }: Props) {
  const { camera, gl } = useThree()
  const finish = FINISHES[pod.settings.body]
  const os = useMemo(() => new PodOS(), [])
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__os = os
  }, [os])
  const face = useMemo(() => wheelFace(), [])
  const geo = useMemo(() => {
    const port = stadiumGeometry(0.088, 0.03)
    const tongue = stadiumGeometry(0.062, 0.008)
    const glow = stadiumGeometry(0.12, 0.055)
    return {
      ...bodyGeometries(),
      button: buttonGeometry(),
      panel: roundedPlane(POD.display.w, POD.display.h, POD.display.r),
      active: new THREE.PlaneGeometry(POD.active.w, POD.active.h),
      port,
      tongue,
      glow,
    }
  }, [])
  const mats = useMemo(() => {
    const aniso = turnedAnisotropy()
    return {
      glass: new THREE.MeshPhysicalMaterial({ roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03 }),
      metal: new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.35 }),
      wheel: new THREE.MeshPhysicalMaterial({
        metalness: 1,
        roughness: 0.27,
        map: face.tex,
        anisotropy: 0.85,
        anisotropyMap: aniso,
      }),
      button: new THREE.MeshPhysicalMaterial({ roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.02 }),
      panel: new THREE.MeshPhysicalMaterial({ color: '#020203', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }),
      // reflections on the glass over the display: black base, additive, so only highlights show
      cover: new THREE.MeshStandardMaterial({
        color: '#000000',
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        envMapIntensity: 2.4,
      }),
      screen: screenMaterial(os.texture),
      port: new THREE.MeshBasicMaterial({ color: '#030303' }),
      tongue: new THREE.MeshStandardMaterial({ color: '#3c3c3e', metalness: 0.6, roughness: 0.4 }),
      groove: new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.3, depthWrite: false }),
      glow: new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    }
  }, [face, os])

  useEffect(() => {
    mats.glass.color.set(finish.glass)
    mats.glass.roughness = finish.glassDark ? 0.08 : 0.12
    mats.metal.color.set(finish.metal)
    mats.metal.roughness = finish.metalRough
    mats.wheel.roughness = finish.metalRough - 0.08
    mats.button.color.set(finish.button)
    face.draw(finish, rig.pressed)
  }, [finish, mats, face])

  // ------------------------------------------------------------ motion
  const motion = useRef({ x: 0, y: POD_Y, yaw: -0.2, pitch: 0.05, vx: 0, vy: 0, vyaw: 0, vpitch: 0 })
  const wheelRef = useRef<THREE.Group>(null)
  const buttonRef = useRef<THREE.Group>(null)
  const lastPressed = useRef<Zone | 'center' | null>(null)
  const live = useRef({ pod, accent, finish, x, split })
  live.current = { pod, accent, finish, x, split }

  useFrame((state, dt) => {
    const g = groupRef.current
    if (!g) return
    const L = live.current
    const m = motion.current
    const t = state.clock.elapsedTime
    const still = rig.reducedMotion
    const px = rig.pointer.x - 0.5
    const py = rig.pointer.y - 0.5
    const tx = L.x
    const ty = POD_Y + (still ? 0 : Math.sin(t * 0.9) * 0.008)
    const tyaw = (L.split ? 0.18 : -0.2) + (still ? 0 : px * 0.26 + Math.sin(t * 0.45) * 0.02)
    const tpitch = 0.05 + (still ? 0 : py * 0.12)
    m.vpitch += rig.kickPitch
    m.vyaw += rig.kickYaw
    m.vy += rig.kickY
    rig.kickPitch = rig.kickYaw = rig.kickY = 0
    const steps = Math.max(1, Math.min(4, Math.round(dt * 60)))
    for (let i = 0; i < steps; i++) {
      m.vx = (m.vx + (tx - m.x) * 0.035) * 0.86
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

    // wheel and button press animation
    const pr = rig.pressed
    const wg = wheelRef.current
    if (wg) {
      const rx = pr === 'menu' ? -0.045 : pr === 'play' ? 0.045 : 0
      const ry = pr === 'next' ? 0.045 : pr === 'prev' ? -0.045 : 0
      wg.rotation.x += (rx - wg.rotation.x) * 0.35
      wg.rotation.y += (ry - wg.rotation.y) * 0.35
    }
    const bg = buttonRef.current
    if (bg) bg.position.z += ((pr === 'center' ? -0.0024 : 0) - bg.position.z) * 0.4
    if (pr !== lastPressed.current) {
      face.draw(L.finish, pr)
      lastPressed.current = pr
    }

    // the display
    const now = performance.now()
    const p = L.pod
    os.update(p, now, L.accent)
    const u = mats.screen.uniforms.uPower
    const target = p.power === 'off' ? 0 : p.power === 'booting' ? Math.min(1, (now - p.bootAt) / 420) : 1
    u.value += (target - u.value) * 0.25

    mats.glow.opacity += (rig.portGlow * 0.85 - mats.glow.opacity) * 0.2
  }, -3)

  // ------------------------------------------------------------ input
  const drag = useRef<{ cx: number; cy: number; last: number; acc: number; moved: number; zone: Zone } | null>(null)

  const onWheelDown = (e: ThreeEvent<PointerEvent>) => {
    const wg = wheelRef.current
    if (!wg) return
    const local = wg.worldToLocal(e.point.clone())
    if (Math.hypot(local.x, local.y) < POD.wheel.button + 0.004) return
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

  return (
    <group ref={groupRef}>
      <mesh geometry={geo.front} material={[mats.glass, mats.metal]} castShadow receiveShadow />
      <mesh geometry={geo.back} material={mats.metal} castShadow receiveShadow />

      {/* display: black panel, lit area, reflections on the cover glass */}
      <mesh geometry={geo.panel} material={mats.panel} position={[0, POD.display.y, POD.FRONT + 0.0004]} />
      <mesh geometry={geo.active} material={mats.screen} position={[0, POD.display.y, POD.FRONT + 0.0008]} />
      <mesh geometry={geo.panel} material={mats.cover} position={[0, POD.display.y, POD.FRONT + 0.0014]} />

      {/* click wheel */}
      <group ref={wheelRef} position={[0, POD.wheel.y, POD.FRONT]}>
        <mesh material={mats.groove} position-z={0.0003}>
          <ringGeometry args={[POD.wheel.r - 0.001, POD.wheel.r + 0.0045, 128]} />
        </mesh>
        <mesh
          material={mats.wheel}
          position-z={0.0011}
          receiveShadow
          onPointerDown={onWheelDown}
          onPointerOver={cursor('grab')}
          onPointerOut={cursor('')}
        >
          <circleGeometry args={[POD.wheel.r, 128]} />
        </mesh>
        <mesh material={mats.groove} position-z={0.0014}>
          <ringGeometry args={[POD.wheel.button - 0.0005, POD.wheel.button + 0.0038, 96]} />
        </mesh>
        <group ref={buttonRef}>
          <mesh
            geometry={geo.button}
            material={mats.button}
            position-z={0.0014}
            castShadow
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

      {/* USB-C port on the top edge */}
      <group position={[POD.port.x, POD.H / 2, POD.port.z]}>
        <mesh geometry={geo.port} material={mats.port} position-y={0.0006} />
        <mesh geometry={geo.tongue} material={mats.tongue} position-y={0.0009} />
        <mesh geometry={geo.glow} material={mats.glow} position-y={0.0013} />
      </group>
    </group>
  )
}
