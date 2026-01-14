import React, { Suspense, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { RoomSelector } from './components/RoomSelector';
import { gameEngine } from './game/GameEngine';

const App: React.FC = () => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const handleRoomSelect = useCallback((roomID: string) => {
    setSelectedRoom(roomID);
    gameEngine.connect(roomID);
  }, []);

  const handleLeave = useCallback(() => {
    gameEngine.disconnect();
    setSelectedRoom(null);
  }, []);

  return (
    <div className="relative w-full h-screen bg-neutral-900 overflow-hidden">
      {!selectedRoom ? (
        <RoomSelector onSelect={handleRoomSelect} />
      ) : (
        <>
          <Canvas
            dpr={[1, 2]} // Handle high DPI screens
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
