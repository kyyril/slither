import React, { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Snake } from './Snake';
import { FoodField } from './FoodField';
import { Background } from './Background';
import { gameEngine } from '../game/GameEngine';
import { SnakeState } from '../types';

// Camera Controller Component
const CameraController = () => {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const [isOverview, setIsOverview] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyC') {
        setIsOverview(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useFrame((state, delta) => {
    // We try to find player in active snakes
    const player = gameEngine.getPlayer();

    if (player) {
      // Smooth follow
      const targetX = player.head.x;
      const targetY = player.head.y;

      // Zoom based on size & mode
      const baseHeight = isOverview ? 150 : 40;
      const growthFactor = isOverview ? 8 : 5;

      const zoomFactor = player.width * growthFactor;
      const targetZ = baseHeight + zoomFactor;

      targetRef.current.set(targetX, targetY, targetZ);

      camera.position.lerp(targetRef.current, delta * 2.0);
      camera.lookAt(targetX, targetY, 0);
    }
  });

  return null;
};

// Input Handler Component
const InputHandler = () => {
  const { gl, camera } = useThree();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate mouse position relative to center of screen
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      // Calculate angle
      // Note: In screen space, Y is down (positive). In 3D space, Y is up.
      // So -dy.
      const angle = Math.atan2(-dy, dx);

      gameEngine.setPlayerTargetAngle(angle);
    };

    const handleMouseDown = () => gameEngine.setPlayerBoost(true);
    const handleMouseUp = () => gameEngine.setPlayerBoost(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return null;
};

export const GameScene: React.FC = () => {
  // We need to trigger React renders for snakes addition/removal
  // But we animate them inside the components via Refs and useFrame
  const [snakes, setSnakes] = useState<SnakeState[]>([]);
  const [gameId, setGameId] = useState(0);

  // Sync React state with GameEngine occasionally or on frame
  useFrame((state, delta) => {
    gameEngine.update(delta);

    const engineSnakes = gameEngine.snakes;
    const engineId = gameEngine.gameId;
    const engineVersion = gameEngine.stateVersion;

    // Trigger re-render if connection changed, snake count changed, or state updated
    if (engineId !== gameId ||
      engineSnakes.length !== snakes.length ||
      stateVersionRef.current !== engineVersion) {

      stateVersionRef.current = engineVersion;
      setGameId(engineId);
      setSnakes([...engineSnakes]);
    }
  });

  const stateVersionRef = useRef(0);

  return (
    <>
      <color attach="background" args={['#050505']} />

      <CameraController />
      <InputHandler />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 20]} intensity={1} distance={50} />

      {/* Game Objects */}
      <Background />
      <FoodField />

      {snakes.map((snake) => (
        <Snake key={snake.id} snake={snake} />
      ))}

      {/* Effects */}
      <EffectComposer disableNormalPass>
        <Bloom
          luminanceThreshold={0.2}
          mipmapBlur
          intensity={1.5}
          radius={0.6}
        />
      </EffectComposer>
    </>
  );
};