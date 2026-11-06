import { Environment, Lightformer, PerformanceMonitor, SoftShadows } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, FXAA, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { rememberLowTier, type Tier } from '../gpu'
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
import { quality } from './quality'

type Props = { pod: Pod; onReady: () => void }
type SceneProps = Props & {
  tier: Tier
  onFail: (why: string) => void // the 3D view can't go on: show the plain one
  onStruggle: () => void // rebuild with the light budget
}

// What each budget costs. 'low' is for built-in laptop graphics, phones and software renderers:
// no second render pass for refracting glass, plain soft shadows instead of contact-hardening
// ones, no multisampled buffers (a cheap edge-smoothing pass instead) and fewer pixels.
const BUDGET = {
  high: { maxDpr: 2, minDpr: 1, msaa: 4, shadowMap: 2048 },
  low: { maxDpr: 1.25, minDpr: 0.75, msaa: 0, shadowMap: 1024 },
} as const

export default function Scene({ pod, tier, onReady, onFail, onStruggle }: SceneProps) {
  quality.tier = tier // read by the components below while they build their materials
  const B = BUDGET[tier]
  const [dpr, setDpr] = useState(() => Math.min(B.maxDpr, window.devicePixelRatio || 1))
  // nothing is drawn until every shader is compiled, so a slow laptop shows the loading line
  // instead of freezing on the first frame
  const [loop, setLoop] = useState<'never' | 'always'>('never')
  const start = useCallback(() => setLoop('always'), [])
  const since = useRef(0)
  const decline = () => {
    if (performance.now() - since.current < 4000) return // the first seconds are always slow
    if (dpr > B.minDpr) setDpr((d) => Math.max(B.minDpr, d - 0.25))
    else if (tier === 'high') onStruggle()
  }
  return (
    <Canvas
      className="scene"
      shadows
      dpr={dpr}
      frameloop={loop}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: FOV, near: 0.1, far: 40, position: [0, CAM_Y, 3.4] }}
    >
      <Warmup onDone={start} since={since} />
      {loop === 'always' && <PerformanceMonitor onDecline={decline} />}
      <ContextWatch tier={tier} onFail={onFail} onStruggle={onStruggle} />
      <World pod={pod} onReady={onReady} />
      {import.meta.env.DEV && <DevHooks />}
    </Canvas>
  )
}

/** Compile every shader up front, in the background where the browser supports it, then start drawing. */
function Warmup({ onDone, since }: { onDone: () => void; since: { current: number } }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      since.current = performance.now()
      onDone()
    }
    const limit = window.setTimeout(finish, 8000) // never wait forever
    // one frame later, so every component has mounted and built its materials
    const raf = requestAnimationFrame(() => {
      gl.compileAsync(scene, camera).then(finish, finish)
    })
    return () => {
      window.clearTimeout(limit)
      cancelAnimationFrame(raf)
    }
  }, [gl, scene, camera, onDone, since])
  return null
}

/**
 * If the GPU drops the context: on the full budget, rebuild with the light one; on the light one,
 * wait for it to come back, and if it doesn't, give up on 3D instead of leaving an empty canvas.
 */
function ContextWatch({ tier, onFail, onStruggle }: { tier: Tier; onFail: (why: string) => void; onStruggle: () => void }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const canvas = gl.domElement
    let timer = 0
    const check = () => {
      // a hidden tab may legitimately wait for its context: only judge while it's on screen
      if (document.visibilityState === 'hidden') timer = window.setTimeout(check, 1000)
      else if (gl.getContext().isContextLost()) onFail('the graphics context was lost and did not come back')
    }
    const lost = () => {
      rememberLowTier()
      window.clearTimeout(timer)
      if (tier === 'high') onStruggle()
      else timer = window.setTimeout(check, 4000)
    }
    const restored = () => window.clearTimeout(timer)
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    return () => {
      window.clearTimeout(timer)
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
    }
  }, [gl, tier, onFail, onStruggle])
  return null
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

  // ready once a few real frames are on screen
  const drawn = useRef(0)
  useFrame(() => {
    if (drawn.current <= 3 && ++drawn.current === 3) onReady()
  })

  return (
    <>
      {quality.tier === 'high' && <SoftShadows size={22} samples={12} focus={0.55} />}
      <hemisphereLight args={['#ffffff', '#b9bdc5', 0.7]} />
      <directionalLight
        castShadow
        position={[-2.4, 4.2, 3.4]}
        intensity={2.5}
        shadow-mapSize={[BUDGET[quality.tier].shadowMap, BUDGET[quality.tier].shadowMap]}
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

      <EffectComposer multisampling={BUDGET[quality.tier].msaa}>
        <Bloom mipmapBlur intensity={0.35} luminanceThreshold={1} luminanceSmoothing={0.2} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        {quality.tier === 'low' ? <FXAA /> : <></>}
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
