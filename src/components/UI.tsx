import React, { useEffect, useState } from 'react';
import { gameEngine } from '../game/GameEngine';
import { Minimap } from './Minimap';

interface UIProps {
  onLeave: () => void;
}

export const UI: React.FC<UIProps> = ({ onLeave }) => {
  const [score, setScore] = useState(0);
  const [rank, setRank] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [isDead, setIsDead] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const snakes = gameEngine.snakes;
      const player = gameEngine.getPlayer();

      setTotalPlayers(snakes.length);

      if (player) {
        setScore(Math.floor(player.score));
        setIsDead(player.dead);

        // Calculate Rank
        const sorted = [...snakes].sort((a, b) => b.score - a.score);
        const myRank = sorted.findIndex(s => s.id === player.id) + 1;
        setRank(myRank);
      } else {
        setIsDead(true);
      }
    }, 200); // 5fps UI update

    return () => clearInterval(interval);
  }, []);

  const handleRestart = () => {
    // For a real authoritative restart, better to rejoin room or reload
    // but here we just redirect to room selector for simplicity
    onLeave();
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
      {/* Score / Map UI */}
      <div className="absolute top-4 left-4 text-white font-mono">
        <h1 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">NEON SLITHER</h1>
        <p className="mt-2">Score: {score}</p>
        <p>Rank: {rank} / {totalPlayers + (isDead ? 1 : 0)}</p>
      </div>

      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <button
          onClick={onLeave}
          className="pointer-events-auto px-4 py-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-100 text-xs font-bold rounded-md backdrop-blur-md transition-all active:scale-95"
        >
          QUIT GAME
        </button>
      </div>

      <Minimap />

      <div className="absolute bottom-4 left-4 text-white/50 text-sm">
        <p>Mouse to Move</p>
        <p>Click/Hold to Boost</p>
        <p>Press 'C' to Change Camera</p>
      </div>

      {isDead && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-auto backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-red-500 mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">GAME OVER</h2>
            <p className="text-xl text-white mb-8">Final Score: {score}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={onLeave}
                className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-full transition-all transform hover:scale-105"
              >
                Change Room
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all transform hover:scale-105"
              >
                Respawn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};