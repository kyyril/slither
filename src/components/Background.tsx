import React from 'react';
import * as THREE from 'three';
import { CONFIG, COLORS } from '../constants';

export const Background: React.FC = () => {
  return (
    <group position={[0, 0, -5]}>
      {/* Dark infinite-looking plane */}
      <mesh receiveShadow position={[0, 0, -5]}>
        <planeGeometry args={[CONFIG.mapSize * 5, CONFIG.mapSize * 5]} />
        <meshBasicMaterial color={COLORS.background} />
      </mesh>

      {/* Grid helper - Reduced density for stability */}
      <gridHelper
        args={[CONFIG.mapSize * 2.5, 200, COLORS.grid, COLORS.grid]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -4.9]}
      />

      {/* Boundary Ring - Glowing Neon Line */}
      <mesh position={[0, 0, -4.8]}>
        <ringGeometry args={[CONFIG.mapSize, CONFIG.mapSize + 10, 128]} />
        <meshStandardMaterial
          color="#ff0055"
          emissive="#ff0055"
          emissiveIntensity={10}
          toneMapped={false}
        />
      </mesh>

      {/* Outer Glow for Boundary */}
      <mesh position={[0, 0, -4.85]}>
        <ringGeometry args={[CONFIG.mapSize + 2, CONFIG.mapSize + 200, 128]} />
        <meshBasicMaterial
          color="#ff0055"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
