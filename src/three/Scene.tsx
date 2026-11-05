import { Environment, Lightformer, PerformanceMonitor, SoftShadows } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { rig } from '../rig'
import { focusIndex, type Pod } from '../usePod'
import { Albums } from './Albums'
import { ambienceFor } from './ambience'
import { Ashtray, ASHTRAY_Y } from './Ashtray'
import { room } from './room'
import { Backdrop } from './Backdrop'
import { Earphones } from './Earphones'
import { CAM_Y, FOV, layoutFor } from './layout'
import { PodModel } from './Pod'

type Props = { pod: Pod; onReady: () => void }

export default function Scene({ pod, onReady }: Props) {
  const [dpr, setDpr] = useState(() => Math.min(2, window.devicePixelRatio || 1))
  return (
    <Canvas
      className="scene"
      shadows
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: FOV, near: 0.1, far: 40, position: [0, CAM_Y, 3.4] }}
    >
      <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d - 0.5))} />
      <World pod={pod} onReady={onReady} />
      {import.meta.env.DEV && <DevHooks />}
    </Canvas>
  )
}

function World({ pod, onReady }: Props) {
  const { size, camera } = useThree()
  const aspect = size.width / size.height
  const focus = focusIndex(pod)
  const amb = ambienceFor(focus)
  const L = layoutFor(aspect, focus !== null)
  const podRef = useRef<THREE.Group>(null)
  room.target = amb

  useFrame((_, dt) => {
    room.step(1 - Math.pow(0.05, dt))
    const still = rig.reducedMotion
    const px = still ? 0 : rig.pointer.x - 0.5
    const py = still ? 0 : rig.pointer.y - 0.5
    const k = 1 - Math.pow(0.02, dt)
    camera.position.x += (L.panX + px * 0.07 - camera.position.x) * k
    camera.position.y += (CAM_Y - py * 0.05 - camera.position.y) * k
    camera.position.z += (L.d - camera.position.z) * k
  }, -4)

  useEffect(() => {
    let n = 0
    let raf = 0
    const tick = () => {
      if (++n > 3) onReady()
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onReady])

  return (
    <>
      <SoftShadows size={22} samples={12} focus={0.55} />
      <hemisphereLight args={['#ffffff', '#b9bdc5', 0.7]} />
      <directionalLight
        castShadow
        position={[-2.4, 4.2, 3.4]}
        intensity={2.5}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      >
        <orthographicCamera attach="shadow-camera" args={[-3.4, 3.4, 2.8, -2.6, 0.5, 14]} />
      </directionalLight>
      <directionalLight position={[3.2, 1.5, 2.5]} intensity={0.55} />

      {/* what the metal and glass reflect: a soft grey studio with big light panels */}
      <Environment resolution={256} frames={1}>
        <mesh scale={40}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#6f737a" side={THREE.BackSide} />
        </mesh>
        <Lightformer form="rect" intensity={3.2} position={[0, 5, 2]} scale={[10, 3]} />
        <Lightformer form="rect" intensity={2.4} position={[-6, 1, 3]} scale={[2, 10]} />
        <Lightformer form="rect" intensity={3.6} position={[6, 0.5, 1]} scale={[1.2, 10]} />
        <Lightformer form="rect" intensity={1} position={[0, -1.5, 7]} scale={[8, 3]} />
        <Lightformer form="circle" color="#e8eefc" intensity={2} position={[3, -3, -4]} scale={3} />
      </Environment>

      <Backdrop d={L.d} aspect={aspect} focusX={L.panX * 0.4} word={amb.word} />
      <PodModel pod={pod} x={0} split={L.split} accent={amb.accent} roomA={amb.a} roomB={amb.b} groupRef={podRef} />
      <Earphones podRef={podRef} sound={pod.settings.clicks} onPlug={pod.setPlugged} />
      <Ashtray position={[-0.82, ASHTRAY_Y, 0.1]} />
      <Albums show={L.split && pod.opened === null} focus={focus} x={L.albumsX} onPick={pod.focusProject} />

      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.35} luminanceThreshold={1} luminanceSmoothing={0.2} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <Vignette offset={0.3} darkness={0.42} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.08} />
      </EffectComposer>
    </>
  )
}

/** Dev only: lets automated tests read renderer stats and sample each finished frame. */
function DevHooks() {
  const { gl, scene } = useThree()
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__three = { gl, scene }
  }, [gl, scene])
  useFrame(() => {
    const probe = (window as unknown as { __probe?: (g: THREE.WebGLRenderer) => void }).__probe
    if (probe) probe(gl)
  }, 10)
  return null
}
