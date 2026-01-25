import React, { Suspense, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { RoomSelector } from './components/RoomSelector';
import { gameEngine } from './game/GameEngine';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'lobby' | 'connecting' | 'playing'>('lobby');

  // Poll connection status
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameState === 'connecting') {
      interval = setInterval(() => {
        // Check if engine has successfully connected AND received initial state
        // We check 'snakes.length > 0' as a proxy for "state received" to be safe,
        // or we can add an accessor for isConnected
        if (gameEngine.getIsConnected() && gameEngine.getHasReceivedInitialState()) {
          setGameState('playing');
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  const handleRoomSelect = useCallback((roomID: string) => {
    setGameState('connecting');
    gameEngine.connect(roomID);
  }, []);

  const handleLeave = useCallback(() => {
    gameEngine.disconnect();
    setGameState('lobby');
  }, []);

  return (
    <div className="relative w-full h-screen bg-neutral-900 overflow-hidden">
      {gameState === 'lobby' && (
        <RoomSelector onSelect={handleRoomSelect} />
      )}

      {gameState === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-white/60 font-bold tracking-widest animate-pulse">CONNECTING TO ARENA...</p>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <Canvas
            dpr={[1, 1.5]} // Cap DPR at 1.5 for mobile performance
            gl={{
              antialias: false, // Post-processing handles smoothing, disable AA for perf
              powerPreference: "high-performance",
              stencil: false,
              depth: true
            }}
            camera={{ position: [0, 0, 50], fov: 45, far: 5000 }}
          >
            <Suspense fallback={null}>
              <GameScene />
            </Suspense>
          </Canvas>
          <UI onLeave={handleLeave} />
        </>
      )}
    </div>
  );
};

export default App;
