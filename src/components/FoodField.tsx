import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { gameEngine } from '../game/GameEngine';
import { CONFIG, MAX_FOOD_COUNT } from '../constants';

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export const FoodField: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // We simply poll the game engine food state
  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const foodList = gameEngine.food;
    const count = foodList.length;
    
    // Animate scale/pulse
    const pulse = Math.sin(clock.elapsedTime * 4) * 0.1 + 1;

    for (let i = 0; i < count; i++) {
      // Safety check in case engine somehow exceeds max render count
      if (i >= MAX_FOOD_COUNT) break;

      const food = foodList[i];
      
      tempObject.position.set(food.x, food.y, 0);
      tempObject.scale.setScalar(food.size * pulse);
      tempObject.rotation.z = clock.elapsedTime + i; // tiny spin
      tempObject.updateMatrix();
      
      meshRef.current.setMatrixAt(i, tempObject.matrix);
      
      // Update color
      tempColor.set(food.color);
      meshRef.current.setColorAt(i, tempColor);
    }
    
    // Hide unused instances (from current count up to max buffer)
    for (let i = count; i < MAX_FOOD_COUNT; i++) {
       tempObject.scale.set(0,0,0);
       tempObject.updateMatrix();
       meshRef.current.setMatrixAt(i, tempObject.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_FOOD_COUNT]}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[1, 0]} /> {/* Low poly for food */}
      <meshStandardMaterial 
        emissiveIntensity={2} 
        toneMapped={false}
        color="white" // Base color, overridden by instanceColor
      />
    </instancedMesh>
  );
};