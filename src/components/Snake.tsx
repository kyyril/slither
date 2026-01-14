import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SnakeState } from '../types';
import { SNAKE_OPTS } from '../constants';

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

  const lastPos = useRef(new THREE.Vector3());
  const lastAngle = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current || !headRef.current) return;

    // 1. Update Head Position with Framerate-Independent Lerp
    const targetX = snake.head.x;
    const targetY = snake.head.y;

    // Smoothness factor (higher = faster snap to server, lower = smoother but more lag)
    const smoothing = 10;
    const lerpT = 1 - Math.exp(-smoothing * delta);

    headRef.current.position.x += (targetX - headRef.current.position.x) * lerpT;
    headRef.current.position.y += (targetY - headRef.current.position.y) * lerpT;

    // Angle interpolation (handle wrap around)
    let diff = snake.angle - headRef.current.rotation.z;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    headRef.current.rotation.z += diff * lerpT;

    headRef.current.scale.setScalar(snake.width);

    // 2. Update Body Segments (InstancedMesh)
    const path = snake.path;
    if (path.length < 1) return;

    let distTravelled = 0;
    let segmentIndex = 0;

    // The gap between interpolated head and first server path point
    // We bridge this gap smoothly to avoid "stretching" glitch
    const currentHeadPos = headRef.current.position;

    // We use a virtual path that starts from the interpolated head
    // and continues through the server path
    const extendedPath = [{ x: currentHeadPos.x, y: currentHeadPos.y }, ...path];

    // Spacing between segments
    const spacing = snake.width * 0.5;

    for (let i = 1; i < extendedPath.length; i++) {
      const p1 = extendedPath[i - 1];
      const p2 = extendedPath[i];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      if (segLen < 0.001) continue;

      while (distTravelled + segLen > (segmentIndex + 1) * spacing) {
        const t = ((segmentIndex + 1) * spacing - distTravelled) / segLen;
        const cx = p1.x + (p2.x - p1.x) * t;
        const cy = p1.y + (p2.y - p1.y) * t;

        tempObject.position.set(cx, cy, 0);

        // Taper the tail
        const scale = snake.width * (1 - (segmentIndex / (snake.length * 2 + 10)));
        tempObject.scale.setScalar(Math.max(scale, snake.width * 0.3));

        tempObject.updateMatrix();
        meshRef.current.setMatrixAt(segmentIndex, tempObject.matrix);

        segmentIndex++;
        if (segmentIndex >= snake.length || segmentIndex >= maxSegments) break;
      }

      distTravelled += segLen;
      if (segmentIndex >= snake.length || segmentIndex >= maxSegments) break;
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
