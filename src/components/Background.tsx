import React from 'react';
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
        args={[CONFIG.mapSize * 2, 100, COLORS.grid, COLORS.grid]} 
        rotation={[Math.PI / 2, 0, 0]} 
        position={[0, 0, -0.1]}
      />
      
      {/* Boundary Ring */}
      <mesh>
        <ringGeometry args={[CONFIG.mapSize, CONFIG.mapSize + 2, 64]} />
        <meshBasicMaterial color="#ff0000" opacity={0.3} transparent side={2} />
      </mesh>
    </group>
  );
};
