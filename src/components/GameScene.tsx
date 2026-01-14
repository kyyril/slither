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
    const player = gameEngine.getPlayer();

    if (player) {
      // Smooth follow
      // We look for the head mesh in the scene to follow the interpolated position
      // Alternatively, we can calculate the same interpolation here
      const targetX = player.head.x;
      const targetY = player.head.y;

      // Zoom based on size & mode
      const baseHeight = isOverview ? 150 : 40;
      const growthFactor = isOverview ? 8 : 5;
      const zoomFactor = player.width * growthFactor;
      const targetZ = baseHeight + zoomFactor;

      targetRef.current.set(targetX, targetY, targetZ);

      // Follow more closely and smoothly
      const followSpeed = 4.0;
      camera.position.lerp(targetRef.current, delta * followSpeed);

      // Look at where the player is actually rendered (interpolated)
      // This is crucial to avoid background "vibration"
      camera.lookAt(camera.position.x, camera.position.y, 0);
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
  // Sync React state with GameEngine occasionally or on frame
  useFrame((state, delta) => {
    gameEngine.update(delta);

    const engineSnakes = gameEngine.snakes;
    const engineId = gameEngine.gameId;
    const engineRosterVersion = gameEngine.rosterVersion;

    // Only Trigger re-render if Roster changed (players join/leave) or Connection reset
    // We DO NOT re-render on position updates (stateVersion). 
    // Snake components will pull position data directly via refs.
    if (engineId !== gameId ||
      rosterVersionRef.current !== engineRosterVersion) {

      rosterVersionRef.current = engineRosterVersion;
      setGameId(engineId);
      setSnakes([...engineSnakes]); // Only update list when structure changes
    }
  });

  const rosterVersionRef = useRef(0);

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