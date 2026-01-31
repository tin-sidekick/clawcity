import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore, type Tile } from '../stores/worldStore';

const TERRAIN_COLORS: Record<string, string> = {
  grass: '#7ec850',
  forest: '#4a8c3f',
  stone: '#8c8c8c',
  water: '#4a9bd9',
  sand: '#e8d282',
  mountain: '#6b6b6b',
};

function getHeight(type: string, x: number, y: number): number {
  // Simple hash-based height variation
  const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const noise = hash - Math.floor(hash);

  switch (type) {
    case 'water': return -0.05;
    case 'sand': return 0.05 + noise * 0.05;
    case 'grass': return 0.1 + noise * 0.15;
    case 'forest': return 0.15 + noise * 0.2;
    case 'stone': return 0.2 + noise * 0.2;
    case 'mountain': return 0.4 + noise * 0.3;
    default: return 0.1;
  }
}

// Low-poly tree: cone + cylinder
function Tree({ position }: { position: [number, number, number] }) {
  const hash = Math.sin(position[0] * 31.7 + position[2] * 17.3) * 43758.5;
  const scale = 0.6 + (hash - Math.floor(hash)) * 0.5;
  const rotation = (hash - Math.floor(hash)) * Math.PI * 2;

  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      {/* Trunk */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.5, 5]} />
        <meshStandardMaterial color="#8B6914" flatShading />
      </mesh>
      {/* Foliage */}
      <mesh position={[0, 0.65, 0]}>
        <coneGeometry args={[0.25, 0.6, 6]} />
        <meshStandardMaterial color="#5da83a" flatShading />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <coneGeometry args={[0.18, 0.4, 5]} />
        <meshStandardMaterial color="#6bc048" flatShading />
      </mesh>
    </group>
  );
}

// Low-poly rock
function Rock({ position }: { position: [number, number, number] }) {
  const hash = Math.sin(position[0] * 23.1 + position[2] * 47.7) * 43758.5;
  const scale = 0.1 + (hash - Math.floor(hash)) * 0.15;
  return (
    <mesh position={[position[0], position[1] + scale * 0.5, position[2]]} scale={scale}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#999" flatShading />
    </mesh>
  );
}

// Small flower
function Flower({ position }: { position: [number, number, number] }) {
  const hash = Math.sin(position[0] * 53.1 + position[2] * 71.3) * 43758.5;
  const n = hash - Math.floor(hash);
  const colors = ['#ff9cba', '#ffdb58', '#ff6b6b', '#c084fc', '#fbbf24'];
  const color = colors[Math.floor(n * colors.length)];
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.08, 3]} />
        <meshStandardMaterial color="#5a8a3a" />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.03, 4, 4]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

// Water tile with animation
function WaterTile({ x, z }: { x: number; z: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = -0.05 + Math.sin(clock.elapsedTime * 1.5 + x * 0.8 + z * 0.6) * 0.02;
    }
  });

  return (
    <mesh ref={ref} position={[x, -0.05, z]} receiveShadow>
      <boxGeometry args={[1, 0.1, 1]} />
      <meshStandardMaterial
        color="#4a9bd9"
        flatShading
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

export default function Terrain() {
  const tiles = useWorldStore((s) => s.tiles);
  const mapSize = useWorldStore((s) => s.mapSize);

  const { landTiles, waterTiles, decorations } = useMemo(() => {
    const land: { tile: Tile; height: number }[] = [];
    const water: { x: number; z: number }[] = [];
    const decos: { type: 'tree' | 'rock' | 'flower'; pos: [number, number, number] }[] = [];

    for (const tile of tiles) {
      const h = getHeight(tile.type, tile.x, tile.y);

      if (tile.type === 'water') {
        water.push({ x: tile.x, z: tile.y });
        continue;
      }

      land.push({ tile, height: h });

      // Decorations
      const hash1 = Math.sin(tile.x * 12.9898 + tile.y * 78.233) * 43758.5453;
      const n1 = hash1 - Math.floor(hash1);

      if (tile.type === 'forest') {
        // 1-3 trees per forest tile
        const count = 1 + Math.floor(n1 * 3);
        for (let i = 0; i < count; i++) {
          const ox = (Math.sin(tile.x * 31.7 + i * 17.3) * 43758.5) % 1 * 0.6 - 0.3;
          const oz = (Math.sin(tile.y * 47.1 + i * 23.7) * 43758.5) % 1 * 0.6 - 0.3;
          decos.push({
            type: 'tree',
            pos: [tile.x + ox, h, tile.y + oz],
          });
        }
      } else if (tile.type === 'stone' || tile.type === 'mountain') {
        if (n1 > 0.3) {
          const count = 1 + Math.floor(n1 * 2);
          for (let i = 0; i < count; i++) {
            const ox = (Math.sin(tile.x * 41.3 + i * 11.7) * 43758.5) % 1 * 0.5 - 0.25;
            const oz = (Math.sin(tile.y * 37.1 + i * 13.3) * 43758.5) % 1 * 0.5 - 0.25;
            decos.push({ type: 'rock', pos: [tile.x + ox, h, tile.y + oz] });
          }
        }
      } else if (tile.type === 'grass') {
        if (n1 > 0.7) {
          const count = 1 + Math.floor(n1 * 3);
          for (let i = 0; i < count; i++) {
            const ox = (Math.sin(tile.x * 61.3 + i * 29.7) * 43758.5) % 1 * 0.8 - 0.4;
            const oz = (Math.sin(tile.y * 53.1 + i * 31.3) * 43758.5) % 1 * 0.8 - 0.4;
            decos.push({ type: 'flower', pos: [tile.x + ox, h, tile.y + oz] });
          }
        }
      }
    }

    return { landTiles: land, waterTiles: water, decorations: decos };
  }, [tiles]);

  // Use instanced mesh for land tiles for performance
  const landGeometry = useMemo(() => {
    if (landTiles.length === 0) return null;

    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const normals: number[] = [];

    for (const { tile, height } of landTiles) {
      const x = tile.x;
      const z = tile.y;
      const h = height;
      const color = new THREE.Color(TERRAIN_COLORS[tile.type] || '#7ec850');

      // Top face (two triangles)
      const s = 0.5; // half-size
      // Triangle 1
      positions.push(x - s, h, z - s, x + s, h, z - s, x + s, h, z + s);
      // Triangle 2
      positions.push(x - s, h, z - s, x + s, h, z + s, x - s, h, z + s);

      for (let i = 0; i < 6; i++) {
        colors.push(color.r, color.g, color.b);
        normals.push(0, 1, 0);
      }

      // Side faces (front)
      const bottom = -0.1;
      // Front
      positions.push(x - s, bottom, z + s, x + s, bottom, z + s, x + s, h, z + s);
      positions.push(x - s, bottom, z + s, x + s, h, z + s, x - s, h, z + s);
      const sideColor = color.clone().multiplyScalar(0.7);
      for (let i = 0; i < 6; i++) {
        colors.push(sideColor.r, sideColor.g, sideColor.b);
        normals.push(0, 0, 1);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

    return geo;
  }, [landTiles]);

  // Base plane under everything
  const halfMap = mapSize / 2;

  return (
    <group position={[-halfMap + 0.5, 0, -halfMap + 0.5]}>
      {/* Base ground */}
      <mesh position={[halfMap - 0.5, -0.15, halfMap - 0.5]} receiveShadow>
        <boxGeometry args={[mapSize + 2, 0.1, mapSize + 2]} />
        <meshStandardMaterial color="#3d6b2e" flatShading />
      </mesh>

      {/* Land tiles */}
      {landGeometry && (
        <mesh receiveShadow>
          <primitive object={landGeometry} attach="geometry" />
          <meshStandardMaterial vertexColors flatShading />
        </mesh>
      )}

      {/* Water tiles */}
      {waterTiles.map((w, i) => (
        <WaterTile key={`water-${i}`} x={w.x} z={w.z} />
      ))}

      {/* Decorations */}
      {decorations.map((d, i) => {
        switch (d.type) {
          case 'tree': return <Tree key={`tree-${i}`} position={d.pos} />;
          case 'rock': return <Rock key={`rock-${i}`} position={d.pos} />;
          case 'flower': return <Flower key={`flower-${i}`} position={d.pos} />;
          default: return null;
        }
      })}
    </group>
  );
}
