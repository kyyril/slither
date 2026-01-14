import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SnakeState } from '../types';
import { SNAKE_OPTS } from '../constants';
import { gameEngine } from '../game/GameEngine';

interface SnakeProps {
  snake: SnakeState;
}

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export const Snake: React.FC<SnakeProps> = ({ snake }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const eyeLeftRef = useRef<THREE.Mesh>(null);
  const eyeRightRef = useRef<THREE.Mesh>(null);

  // Pre-allocate geometry and material to share if needed, 
  // though R3F caches primitives well.
  // Using a simple SphereGeometry.

  // We determine max instances to allocate buffer.
  const maxSegments = 1000; // Cap visual length to avoid buffer overflow

  // We maintain a local smooth path that follows the interpolated head
  const smoothPathRef = useRef<{ x: number, y: number }[]>([]);

  useFrame((state, delta) => {
    if (!meshRef.current || !headRef.current) return;

    // Fetch latest data directly from engine to avoid React render cycle dependency
    const currentSnake = gameEngine.getSnake(snake.id);
    if (!currentSnake) return;

    // 1. Update Head Position with Prediction & Interpolation

    // Extrapolate target based on speed & angle to compensate for network lag/tick rate
    // We assume the snake continues moving in its current direction
    const predictionTime = delta * 1.5; // Look ahead slightly
    const moveDist = currentSnake.speed * predictionTime;
    const predictedX = currentSnake.head.x + Math.cos(currentSnake.angle) * moveDist;
    const predictedY = currentSnake.head.y + Math.sin(currentSnake.angle) * moveDist;

    // Use a lower smoothing factor for smoother visual convergence
    // Ideally we want to reach the target over ~100ms
    const smoothing = currentSnake.boost ? 15 : 8;
    const lerpT = 1 - Math.exp(-smoothing * delta);

    headRef.current.position.x += (predictedX - headRef.current.position.x) * lerpT;
    headRef.current.position.y += (predictedY - headRef.current.position.y) * lerpT;

    // Angle interpolation (handle wrap around)
    let diff = currentSnake.angle - headRef.current.rotation.z;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    headRef.current.rotation.z += diff * lerpT;

    headRef.current.scale.setScalar(currentSnake.width);

    // 2. Update Local Smooth Path
    const curHead = { x: headRef.current.position.x, y: headRef.current.position.y };

    // Initialize or handle jumps (reset path if too far)
    if (smoothPathRef.current.length === 0) {
      smoothPathRef.current = Array(10).fill(curHead);
    }

    const firstPoint = smoothPathRef.current[0];
    const distToHead = Math.hypot(curHead.x - firstPoint.x, curHead.y - firstPoint.y);

    // We only add points when the head has moved enough to avoid overcrowding
    const minStep = 0.5;
    if (distToHead > minStep) {
      smoothPathRef.current.unshift(curHead);
      // Keep path long enough for the snake plus some buffer
      const maxPathLen = Math.ceil(currentSnake.length * 5) + 100;
      if (smoothPathRef.current.length > maxPathLen) {
        smoothPathRef.current.pop();
      }
    }

    // 3. Update Body Segments (InstancedMesh)
    const points = smoothPathRef.current;
    if (points.length < 1) return;

    let distTravelled = 0;
    let segmentIndex = 0;
    const spacing = currentSnake.width * 0.5;

    // We start from the interpolated head position itself
    let prevP = curHead;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const dx = prevP.x - p.x;
      const dy = prevP.y - p.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      if (segLen < 0.001) continue;

      while (distTravelled + segLen > (segmentIndex + 1) * spacing) {
        const t = ((segmentIndex + 1) * spacing - distTravelled) / segLen;
        const cx = prevP.x + (p.x - prevP.x) * t;
        const cy = prevP.y + (p.y - prevP.y) * t;

        tempObject.position.set(cx, cy, 0);

        // Taper the tail
        const scale = currentSnake.width * (1 - (segmentIndex / (currentSnake.length * 2 + 10)));
        tempObject.scale.setScalar(Math.max(scale, currentSnake.width * 0.3));

        tempObject.updateMatrix();
        meshRef.current.setMatrixAt(segmentIndex, tempObject.matrix);

        segmentIndex++;
        if (segmentIndex >= currentSnake.length || segmentIndex >= maxSegments) break;
      }

      distTravelled += segLen;
      prevP = p;
      if (segmentIndex >= currentSnake.length || segmentIndex >= maxSegments) break;
    }

    // Hide unused instances
    for (let i = segmentIndex; i < maxSegments; i++) {
      tempObject.scale.setScalar(0);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Set initial color
  useLayoutEffect(() => {
    if (meshRef.current) {
      tempColor.set(snake.color);
      for (let i = 0; i < maxSegments; i++) {
        meshRef.current.setColorAt(i, tempColor);
      }
      meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [snake.color]);

  return (
    <group>
      {/* The Body */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, maxSegments]}
        frustumCulled={false} // Prevent culling issues with dynamic bounds
      >
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          color={snake.color}
          emissive={snake.color}
          emissiveIntensity={0.5}
          roughness={0.4}
          metalness={0.6}
        />
      </instancedMesh>

      {/* The Head (Separate Mesh for detail/eyes) */}
      <mesh ref={headRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={snake.color}
          emissive={snake.color}
          emissiveIntensity={0.8}
        />

        {/* Eyes */}
        <group position={[0.4, 0.4, 0.5]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshBasicMaterial color="white" />
          </mesh>
          <mesh position={[0.1, 0, 0.25]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="black" />
          </mesh>
        </group>
        <group position={[0.4, -0.4, 0.5]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshBasicMaterial color="white" />
          </mesh>
          <mesh position={[0.1, 0, 0.25]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="black" />
          </mesh>
        </group>
      </mesh>
    </group>
  );
};
