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

  useFrame(() => {
    if (!meshRef.current || !headRef.current) return;

    // 1. Update Head Position
    const { x, y } = snake.head;
    headRef.current.position.set(x, y, 0);
    headRef.current.rotation.z = snake.angle;
    headRef.current.scale.setScalar(snake.width);

    // 2. Update Body Segments (InstancedMesh)
    const path = snake.path;
    let distTravelled = 0;
    let segmentIndex = 0;

    // We traverse the path history to place segments at fixed intervals
    for (let i = 1; i < path.length; i++) {
      const p1 = path[i - 1];
      const p2 = path[i];
      const segLen = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      
      // We want to place a sphere every `snake.width` or fixed distance
      // Using `SNAKE_OPTS.segmentDistance` for spacing
      const spacing = snake.width * 0.5; 

      while (distTravelled + segLen > (segmentIndex + 1) * spacing) {
         const t = ((segmentIndex + 1) * spacing - distTravelled) / segLen;
         const cx = p1.x + (p2.x - p1.x) * t;
         const cy = p1.y + (p2.y - p1.y) * t;

         tempObject.position.set(cx, cy, 0);
         // Scale down body slightly for visual style
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
    // setMatrixAt doesn't automatically hide, so we set scale to 0 for unused
    for (let i = segmentIndex; i < maxSegments; i++) {
       // Only need to do this once if we track count, but safe to zero out
       // Optimization: check if count changed
       meshRef.current.getMatrixAt(i, tempObject.matrix);
       const elements = tempObject.matrix.elements;
       // If already zero scale (elements[0] is approx 0), skip
       if (Math.abs(elements[0]) > 0.001) {
         tempObject.scale.set(0,0,0);
         tempObject.updateMatrix();
         meshRef.current.setMatrixAt(i, tempObject.matrix);
       }
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
           <mesh position={[0,0,0]}>
             <sphereGeometry args={[0.3, 8, 8]} />
             <meshBasicMaterial color="white" />
           </mesh>
           <mesh position={[0.1,0,0.25]}>
             <sphereGeometry args={[0.15, 8, 8]} />
             <meshBasicMaterial color="black" />
           </mesh>
        </group>
        <group position={[0.4, -0.4, 0.5]}>
           <mesh position={[0,0,0]}>
             <sphereGeometry args={[0.3, 8, 8]} />
             <meshBasicMaterial color="white" />
           </mesh>
           <mesh position={[0.1,0,0.25]}>
             <sphereGeometry args={[0.15, 8, 8]} />
             <meshBasicMaterial color="black" />
           </mesh>
        </group>
      </mesh>
    </group>
  );
};
