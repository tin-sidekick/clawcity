import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore } from '../stores/worldStore';

export default function Camera() {
  const controlsRef = useRef<any>(null);
  const selectedAgent = useWorldStore((s) => s.selectedAgent);
  const agents = useWorldStore((s) => s.agents);
  const followMode = useWorldStore((s) => s.followMode);
  const mapSize = useWorldStore((s) => s.mapSize);
  const { camera } = useThree();

  const followAgent = useWorldStore((s) => s.followAgent);

  // Set initial camera position (isometric-ish)
  useEffect(() => {
    camera.position.set(20, 18, 20);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Handle Escape key to exit follow mode
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && followMode) {
        followAgent(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [followMode, followAgent]);

  // Follow selected agent with zoom-in
  useFrame(() => {
    if (!followMode || !selectedAgent || !controlsRef.current) return;

    const agent = agents.find((a) => a.id === selectedAgent);
    if (!agent) return;

    const halfMap = mapSize / 2;
    const targetX = agent.x - halfMap + 0.5;
    const targetZ = agent.y - halfMap + 0.5;

    // Smooth orbit target tracking
    const target = controlsRef.current.target as THREE.Vector3;
    target.x = THREE.MathUtils.lerp(target.x, targetX, 0.05);
    target.z = THREE.MathUtils.lerp(target.z, targetZ, 0.05);
    target.y = 0;

    // Zoom camera closer for third-person feel
    const desiredPos = new THREE.Vector3(targetX + 5, 8, targetZ + 5);
    camera.position.lerp(desiredPos, 0.03);

    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={5}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2.2}
      minPolarAngle={0.2}
      target={[0, 0, 0]}
    />
  );
}
