import {
  Canvas,
  render,
  useFrame,
  useThree,
  useUpdate,
} from 'react-three-fiber'
import { Perf } from 'r3f-perf'
import useStore from '@/helpers/store'
import { Environment, Preload, useProgress } from '@react-three/drei'
import { animated, useSpring, config } from '@react-spring/three'
import {
  Bloom,
  EffectComposer,
  Glitch,
  Noise,
  Vignette,
} from '@react-three/postprocessing'
import { Leva, store, useControls } from 'leva'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { MaterialEditor, useEditorComposer } from '@three-material-editor/react'
import _ from 'lodash'
import { BufferGeometry, Points } from 'three'
import * as THREE from 'three/src/Three'

const Bg = () => {
  const background = useControls('Background', {
    r: 0,
    b: 0,
    g: 0,
  })
  return (
    <>
      <color
        attach='background'
        args={[background.r, background.g, background.b]}
      />
      <fog attach='fog' args={['black', 0, 100]} />
    </>
  )
}
const LCanvas = ({ children }) => {
  return (
    <Canvas
      style={{
        position: 'absolute',
        top: 0,
      }}
      gl={{
        powerPreference: 'high-performance',
        alpha: false,
        antialias: false,
        stencil: false,
        depth: false,
      }}
      pixelRatio={[1, 2]}
      onCreated={({ events }) => {
        useStore.setState({ events })
      }}
    >
      <Stars />
      <Leva hidden={true} />
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <Environment preset={'studio'} />
      </Suspense>
      {/* <FlyControls rollSpeed={0.1} /> */}
      <SelectionControls />
      <Preload all />
      <Bg />
      <Perf trackGPU={true} position={'bottom-right'} />
      {children}
    </Canvas>
  )
}

const SelectionControls = () => {
  const { setDefaultCamera, size } = useThree()
  const ref = useRef()
  const y = useStore((s) => s.cameraRotationY)
  const x = useStore((s) => s.cameraRotationX)
  const controls = useControls('Camera', {
    position: [0, 0, 0],
    rotation: [x, y, 0],
    zoom: 1,
  })
  const props = useSpring({
    config: config.molasses,
    rotation: [x, y, 0],
  })

  useEffect(() => {
    setDefaultCamera(ref.current)
  }, [setDefaultCamera])

  const { progress } = useProgress()
  useEffect(() => {
    if (progress === 100) {
      useStore.setState({
        cameraRotationX: 0,
      })
    }
  }, [progress])

  return (
    <>
      {ref.current && (
        <EffectComposer>
          <Glitch
            delay={[2.5, 18]}
            duration={[0.3, 1.0]}
            strength={[0.3, 1.0]}
            active
          />
          <Bloom
            luminanceThreshold={0.4}
            luminanceSmoothing={3.3}
            height={300}
            opacity={0.8}
          />
          <Noise opacity={0.015} />
          <Vignette eskil={false} offset={0.2} darkness={1.1} />
        </EffectComposer>
      )}
      <animated.orthographicCamera
        ref={ref}
        far={100}
        position={controls.position}
        zoom={controls.zoom * Math.sqrt(size.width) * 5}
        {...props}
      />
    </>
  )
}

function Stars() {
  const [geo, mat, vertices, coords] = useMemo(() => {
    const geo = new THREE.SphereBufferGeometry(0.01, 10, 10)
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('gray'),
    })
    const coords = new Array(10000)
      .fill()
      .map((i) => [
        Math.random() * 200 - 100,
        Math.random() * 200 - 100,
        Math.random() * 200 - 100,
      ])
    return [geo, mat, vertices, coords]
  }, [])

  let group = useRef()
  useFrame(() => {
    console.log(group.current.children[0].position.y)
    group.current.children.forEach((p) => {
      p.position.y -= 0.25
      if (p.position.y < -100) {
        p.position.y = 100
        p.velocity = 0
      }
    })
  })
  return (
    <group ref={group}>
      {coords.map(([p1, p2, p3], i) => (
        <mesh key={i} geometry={geo} material={mat} position={[p1, p2, p3]} />
      ))}
    </group>
  )
}

export default LCanvas

function useWindowSize() {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  })
  useEffect(() => {
    // only execute all the code below in client side
    if (typeof window !== 'undefined') {
      // Handler to call on window resize
      const handleResize = () => {
        // Set window width/height to state
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        })
      }
      // Add event listener
      window.addEventListener('resize', handleResize)
      // Call handler right away so state gets updated with initial window size
      handleResize()
      // Remove event listener on cleanup
      return () => window.removeEventListener('resize', handleResize)
    }
  }, []) // Empty array ensures that effect is only run on mount
  return windowSize
}
