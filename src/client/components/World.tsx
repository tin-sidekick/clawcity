import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Terrain from './Terrain';
import AgentModel from './AgentModel';
import BuildingModel from './BuildingModel';
import Environment from './Environment';
import Camera from './Camera';
import { useWorldStore } from '../stores/worldStore';

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#e8b84b" />
    </mesh>
  );
}

function Scene() {
  const agents = useWorldStore((s) => s.agents);
  const buildings = useWorldStore((s) => s.buildings);
  const selectedAgent = useWorldStore((s) => s.selectedAgent);
  const mapSize = useWorldStore((s) => s.mapSize);

  return (
    <>
      <Environment />
      <Camera />

      <Suspense fallback={<LoadingFallback />}>
        <Terrain />

        {/* Buildings */}
        {buildings.map((b) => (
          <BuildingModel key={b.id} building={b} mapSize={mapSize} />
        ))}

        {/* Agents */}
        {agents.map((agent) => (
          <AgentModel
            key={agent.id}
            agent={agent}
            isSelected={agent.id === selectedAgent}
            mapSize={mapSize}
          />
        ))}
      </Suspense>
    </>
  );
}

export default function World() {
  return (
    <Canvas
      shadows
      camera={{ position: [20, 18, 20], fov: 45, near: 0.1, far: 200 }}
      style={{ background: '#1a1a2e' }}
      gl={{ antialias: true }}
    >
      <Scene />
    </Canvas>
  );
}
