import React from 'react';
import * as THREE from 'three';
import { CONFIG, COLORS } from '../constants';

export const Background: React.FC = () => {
  return (
    <group position={[0, 0, -5]}>
      {/* Dark infinite-looking plane */}
      <mesh receiveShadow>
        <planeGeometry args={[CONFIG.mapSize * 3, CONFIG.mapSize * 3]} />
        <meshBasicMaterial color={COLORS.background} />
      </mesh>

      {/* Grid helper */}
      <gridHelper
        args={[CONFIG.mapSize * 2, 500, COLORS.grid, COLORS.grid]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -0.1]}
      />

      {/* Boundary Ring - Glowing Neon Line */}
      <mesh>
        <ringGeometry args={[CONFIG.mapSize, CONFIG.mapSize + 5, 128]} />
        <meshBasicMaterial
          color="#ff0055"
          toneMapped={false}
        />
      </mesh>

      {/* Outer Glow for Boundary */}
      <mesh>
        <ringGeometry args={[CONFIG.mapSize + 2, CONFIG.mapSize + 40, 128]} />
        <meshBasicMaterial
          color="#ff0055"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
