import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore, type AgentState } from '../stores/worldStore';

const PASTEL_COLORS = [
  '#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7',
  '#C7CEEA', '#F0E6EF', '#D4A5A5', '#9ED2C6', '#FFD93D',
  '#C9B1FF', '#FFC3A0', '#A8E6CF', '#DCD3FF', '#FFB5E8',
];

function getAgentColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length];
}

function getMoodEmoji(mood: number, energy?: number): string {
  if (energy !== undefined && energy < 0.2) return '😴';
  if (mood > 0.8) return '😊';
  if (mood > 0.6) return '🙂';
  if (mood > 0.4) return '🤔';
  if (mood > 0.2) return '😐';
  return '😢';
}

interface AgentModelProps {
  agent: AgentState;
  isSelected: boolean;
  mapSize: number;
}

export default function AgentModel({ agent, isSelected, mapSize }: AgentModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(new THREE.Vector3(agent.x, 0, agent.y));
  const [hovered, setHovered] = useState(false);
  const setSelectedAgent = useWorldStore((s) => s.setSelectedAgent);
  const time = useWorldStore((s) => s.time);

  const color = useMemo(() => getAgentColor(agent.id), [agent.id]);
  const halfMap = mapSize / 2;

  // Show speech bubble for recent messages
  const showBubble = agent.lastMessage && agent.lastMessageTime &&
    (Date.now() - agent.lastMessageTime < 8000);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    // Lerp position
    const targetX = (agent.targetX ?? agent.x) - halfMap + 0.5;
    const targetZ = (agent.targetY ?? agent.y) - halfMap + 0.5;

    posRef.current.x = THREE.MathUtils.lerp(posRef.current.x, targetX, 0.05);
    posRef.current.z = THREE.MathUtils.lerp(posRef.current.z, targetZ, 0.05);

    // Idle bob
    const bob = Math.sin(clock.elapsedTime * 2 + agent.x * 3) * 0.03;
    posRef.current.y = 0.25 + bob;

    groupRef.current.position.copy(posRef.current);

    // Face direction of movement
    const dx = targetX - groupRef.current.position.x;
    const dz = targetZ - groupRef.current.position.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      const angle = Math.atan2(dx, dz);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y, angle, 0.1
      );
    }
  });

  const isNight = time.phase === 'night';
  const isSleeping = isNight && (agent.energy !== undefined && agent.energy < 0.3);

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); setSelectedAgent(agent.id); }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Body (capsule) */}
      <mesh position={[0, 0, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.2, 4, 8]} />
        <meshStandardMaterial
          color={color}
          flatShading
          emissive={isSelected ? '#ffffff' : '#000000'}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <sphereGeometry args={[0.12, 6, 6]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.04, 0.3, 0.1]}>
        <sphereGeometry args={[0.02, 4, 4]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.04, 0.3, 0.1]}>
        <sphereGeometry args={[0.02, 4, 4]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.3, 16]} />
          <meshBasicMaterial color="#e8b84b" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Mood emoji */}
      <Html position={[0, 0.55, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '14px', textShadow: '0 0 3px rgba(0,0,0,0.5)' }}>
          {getMoodEmoji(agent.mood, agent.energy)}
        </div>
      </Html>

      {/* Name on hover or selected */}
      {(hovered || isSelected) && (
        <Html position={[0, 0.7, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            fontFamily: 'system-ui',
          }}>
            {agent.name}
          </div>
        </Html>
      )}

      {/* Speech bubble */}
      {showBubble && (
        <Html position={[0, 0.9, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'white',
            color: '#333',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '10px',
            maxWidth: '120px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontFamily: 'system-ui',
          }}>
            {agent.lastMessage!.slice(0, 60)}
            {agent.lastMessage!.length > 60 ? '...' : ''}
          </div>
        </Html>
      )}

      {/* ZZZ when sleeping */}
      {isSleeping && (
        <Html position={[0.15, 0.5, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            fontSize: '12px',
            opacity: 0.7,
            animation: 'fadeIn 1s ease-in-out infinite alternate',
          }}>
            💤
          </div>
        </Html>
      )}
    </group>
  );
}
