import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore } from '../stores/worldStore';

function getSunPosition(hour: number, minute: number): [number, number, number] {
  // Sun rises at 6, peaks at 12, sets at 18
  const timeDecimal = hour + minute / 60;
  const angle = ((timeDecimal - 6) / 12) * Math.PI; // 0 at 6AM, PI at 6PM
  const y = Math.sin(angle) * 50;
  const x = Math.cos(angle) * 50;
  return [x, Math.max(y, -10), 20];
}

// Rain particles
function Rain() {
  const count = 500;
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = Math.random() * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const posArr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      posArr[i * 3 + 1] -= 0.3;
      if (posArr[i * 3 + 1] < 0) {
        posArr[i * 3 + 1] = 20;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#aac8e8" size={0.05} transparent opacity={0.6} />
    </points>
  );
}

// Snow particles
function Snow() {
  const count = 300;
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = Math.random() * 15;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const posArr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      posArr[i * 3 + 1] -= 0.04;
      posArr[i * 3] += Math.sin(clock.elapsedTime + i) * 0.005;
      if (posArr[i * 3 + 1] < 0) {
        posArr[i * 3 + 1] = 15;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#fff" size={0.08} transparent opacity={0.8} />
    </points>
  );
}

// Fireflies at night
function Fireflies() {
  const count = 40;
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = 0.5 + Math.random() * 3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const posArr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      posArr[i * 3] += Math.sin(clock.elapsedTime * 0.5 + i * 3) * 0.01;
      posArr[i * 3 + 1] += Math.cos(clock.elapsedTime * 0.7 + i * 2) * 0.005;
      posArr[i * 3 + 2] += Math.sin(clock.elapsedTime * 0.3 + i * 5) * 0.01;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;

    // Pulsing glow
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = 0.5 + Math.sin(clock.elapsedTime * 2) * 0.3;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#ffff88" size={0.12} transparent opacity={0.7} />
    </points>
  );
}

export default function Environment() {
  const time = useWorldStore((s) => s.time);
  const weather = useWorldStore((s) => s.weather);
  const season = useWorldStore((s) => s.season);

  const isNight = time.phase === 'night';
  const isRain = weather === 'rain' || weather === 'storm';
  const isSnow = season === 'winter' && (weather === 'rain' || weather === 'snow');
  const isFog = weather === 'fog';

  const sunPos = getSunPosition(time.hour, time.minute);

  return (
    <>
      <Sky
        sunPosition={sunPos}
        turbidity={isFog ? 10 : isRain ? 6 : 2}
        rayleigh={isNight ? 0.1 : 1}
        mieCoefficient={isFog ? 0.1 : 0.005}
        mieDirectionalG={0.8}
      />

      {/* Ambient light */}
      <ambientLight
        intensity={isNight ? 0.15 : isFog ? 0.4 : 0.5}
        color={isNight ? '#4466aa' : '#ffffff'}
      />

      {/* Sun/Moon directional light */}
      <directionalLight
        position={sunPos}
        intensity={isNight ? 0.05 : isRain ? 0.3 : 0.8}
        color={isNight ? '#8899cc' : '#fffdf0'}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Hemisphere light for ambient fill */}
      <hemisphereLight
        args={[
          isNight ? '#1a1a3e' : '#b1e1ff',
          '#3d6b2e',
          isNight ? 0.1 : 0.3,
        ]}
      />

      {/* Weather effects */}
      {isRain && !isSnow && <Rain />}
      {isSnow && <Snow />}
      {isNight && !isRain && <Fireflies />}

      {/* Fog */}
      {isFog && <fog attach="fog" args={['#cccccc', 5, 30]} />}
    </>
  );
}
