import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';

const App: React.FC = () => {
  return (
    <div className="relative w-full h-screen bg-neutral-900">
      <Canvas
        dpr={[1, 2]} // Handle high DPI screens
        gl={{ 
          antialias: false, // Post-processing handles smoothing, disable AA for perf
          powerPreference: "high-performance",
          stencil: false,
          depth: true
        }}
        camera={{ position: [0, 0, 50], fov: 45 }}
      >
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
      </Canvas>
      <UI />
    </div>
  );
};

export default App;
