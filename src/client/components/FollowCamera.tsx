// ============================================================
// ClawCity — Follow Camera (Third-Person Agent Tracking)
// ============================================================

import React, { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useWorldStore } from '../stores/useWorldStore';

const CAMERA_OFFSET = new Vector3(5, 8, 5);
const LERP_SPEED = 0.05;

export function FollowCamera() {
  const { camera } = useThree();
  const followingAgentId = useWorldStore((s) => s.followingAgentId);
  const agents = useWorldStore((s) => s.agents);

  const targetAgent = agents.find((a) => a.id === followingAgentId);

  // Handle Escape key to unfollow
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && followingAgentId) {
        useWorldStore.getState().followAgent(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [followingAgentId]);

  useFrame(() => {
    if (!targetAgent) return;

    const targetPos = new Vector3(targetAgent.x, 0, targetAgent.y);
    const desiredCameraPos = targetPos.clone().add(CAMERA_OFFSET);

    // Smooth lerp to follow position
    camera.position.lerp(desiredCameraPos, LERP_SPEED);
    camera.lookAt(targetPos);
  });

  return null;
}
