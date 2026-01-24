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

      {/* Ambient Stars / Dust */}
      <Stars count={5000} />

      {/* Grid helper */}
      <gridHelper
        args={[CONFIG.mapSize * 2.5, 200, "#111111", "#111111"]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -4.9]}
      />

      {/* Boundary Ring - Standard Line */}
      <mesh position={[0, 0, -4.8]}>
        <ringGeometry args={[CONFIG.mapSize, CONFIG.mapSize + 3, 128]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
      </mesh>
    </group>
  );
};

// Internal component for stars to keep things clean
const Stars = ({ count }: { count: number }) => {
  const points = React.useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * CONFIG.mapSize * 4;
      p[i * 3 + 1] = (Math.random() - 0.5) * CONFIG.mapSize * 4;
      p[i * 3 + 2] = -Math.random() * 100; // Deep background
    }
    return p;
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length / 3}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.5} color="#555555" transparent opacity={0.6} />
    </points>
  );
};
