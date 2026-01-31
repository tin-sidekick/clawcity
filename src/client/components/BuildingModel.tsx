import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BuildingState } from '../stores/worldStore';

// Campfire flame flicker
function CampfireFlame({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.intensity = 1.5 + Math.sin(clock.elapsedTime * 8) * 0.5;
    }
  });
  return <pointLight ref={ref} position={position} color="#ff6600" intensity={1.5} distance={3} />;
}

function Shelter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.6, 0.3, 0.6]} />
        <meshStandardMaterial color="#c4a882" flatShading />
      </mesh>
      {/* Tent top */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <coneGeometry args={[0.45, 0.5, 4]} />
        <meshStandardMaterial color="#d4a76a" flatShading />
      </mesh>
    </group>
  );
}

function House({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Walls */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.7, 0.6, 0.7]} />
        <meshStandardMaterial color="#e8d8c4" flatShading />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <coneGeometry args={[0.55, 0.4, 4]} />
        <meshStandardMaterial color="#b85c38" flatShading />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.15, 0.36]}>
        <boxGeometry args={[0.15, 0.25, 0.02]} />
        <meshStandardMaterial color="#6b4226" flatShading />
      </mesh>
      {/* Window */}
      <mesh position={[0.2, 0.35, 0.36]}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
        <meshStandardMaterial color="#87CEEB" flatShading />
      </mesh>
    </group>
  );
}

function Workshop({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main building */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.9, 0.7, 0.8]} />
        <meshStandardMaterial color="#c9b896" flatShading />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <coneGeometry args={[0.65, 0.35, 4]} />
        <meshStandardMaterial color="#8B4513" flatShading />
      </mesh>
      {/* Chimney */}
      <mesh position={[0.3, 1.0, -0.2]} castShadow>
        <boxGeometry args={[0.12, 0.4, 0.12]} />
        <meshStandardMaterial color="#666" flatShading />
      </mesh>
    </group>
  );
}

function MarketStall({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Counter */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.8, 0.4, 0.5]} />
        <meshStandardMaterial color="#deb887" flatShading />
      </mesh>
      {/* Awning poles */}
      <mesh position={[-0.35, 0.5, 0.2]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 4]} />
        <meshStandardMaterial color="#8B6914" flatShading />
      </mesh>
      <mesh position={[0.35, 0.5, 0.2]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 4]} />
        <meshStandardMaterial color="#8B6914" flatShading />
      </mesh>
      {/* Awning */}
      <mesh position={[0, 0.8, 0.1]} rotation={[0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.9, 0.03, 0.6]} />
        <meshStandardMaterial color="#e85d50" flatShading />
      </mesh>
    </group>
  );
}

function Campfire({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Logs */}
      <mesh position={[-0.08, 0.05, 0]} rotation={[0, 0.3, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.3, 5]} />
        <meshStandardMaterial color="#5c3a1e" flatShading />
      </mesh>
      <mesh position={[0.08, 0.05, 0]} rotation={[0, -0.3, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.3, 5]} />
        <meshStandardMaterial color="#5c3a1e" flatShading />
      </mesh>
      {/* Fire glow */}
      <mesh position={[0, 0.15, 0]}>
        <coneGeometry args={[0.08, 0.2, 5]} />
        <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={2} flatShading transparent opacity={0.8} />
      </mesh>
      <CampfireFlame position={[0, 0.3, 0]} />
    </group>
  );
}

function Monument({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <meshStandardMaterial color="#aaa" flatShading />
      </mesh>
      {/* Obelisk */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <coneGeometry args={[0.15, 1.0, 4]} />
        <meshStandardMaterial color="#d4d4d4" flatShading />
      </mesh>
    </group>
  );
}

function Garden({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Soil */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.8, 0.04, 0.8]} />
        <meshStandardMaterial color="#8B6914" flatShading />
      </mesh>
      {/* Flowers */}
      {[-0.2, 0, 0.2].map((x) =>
        [-0.2, 0, 0.2].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.1, z]}>
            <sphereGeometry args={[0.04, 4, 4]} />
            <meshStandardMaterial
              color={['#ff9cba', '#ffdb58', '#c084fc'][Math.abs(Math.floor(x * 10 + z * 7)) % 3]}
              flatShading
            />
          </mesh>
        ))
      )}
    </group>
  );
}

function GenericBuilding({ position, type }: { position: [number, number, number]; type: string }) {
  // Fallback for unknown building types
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.6, 0.5, 0.6]} />
        <meshStandardMaterial color="#bbb" flatShading />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <coneGeometry args={[0.45, 0.3, 4]} />
        <meshStandardMaterial color="#999" flatShading />
      </mesh>
    </group>
  );
}

interface BuildingModelProps {
  building: BuildingState;
  mapSize: number;
}

export default function BuildingModel({ building, mapSize }: BuildingModelProps) {
  const halfMap = mapSize / 2;
  const pos: [number, number, number] = [
    building.x - halfMap + 0.5,
    0,
    building.y - halfMap + 0.5,
  ];

  const type = building.type?.toLowerCase() || 'house';

  switch (type) {
    case 'shelter': return <Shelter position={pos} />;
    case 'house': return <House position={pos} />;
    case 'workshop': return <Workshop position={pos} />;
    case 'market_stall': return <MarketStall position={pos} />;
    case 'campfire': return <Campfire position={pos} />;
    case 'monument': return <Monument position={pos} />;
    case 'garden': return <Garden position={pos} />;
    case 'farm': return <Garden position={pos} />;
    case 'tavern': return <House position={pos} />;
    case 'library': return <Workshop position={pos} />;
    case 'shop': return <MarketStall position={pos} />;
    case 'town_hall': return <Monument position={pos} />;
    default: return <GenericBuilding position={pos} type={type} />;
  }
}
