import React, { useEffect, useState, useRef } from 'react';
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

  // Audio State
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('bgm_muted') === 'true');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    const audio = new Audio('/music/ingame.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    // Try to play if not muted
    if (!isMuted) {
      audio.play().catch(e => console.warn('Audio play failed (user interaction needed):', e));
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, []);

  // Handle Mute Toggle
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      if (isMuted) {
        audio.pause();
      } else {
        audio.play().catch(e => console.warn('Audio play failed:', e));
      }
      localStorage.setItem('bgm_muted', String(isMuted));
    }
  }, [isMuted]);

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

  // Mobile Orientation & Fullscreen Logic
  const [isPortrait, setIsPortrait] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.log("Fullscreen blocked:", e);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

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

      <div className="absolute top-4 right-4 flex gap-2 items-start">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="pointer-events-auto p-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600 text-white rounded-md backdrop-blur-md transition-all active:scale-95 flex items-center justify-center h-[34px] w-[34px]"
          title={isMuted ? "Unmute Music" : "Mute Music"}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          )}
        </button>
        <button
          onClick={onLeave}
          className="pointer-events-auto px-4 py-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-100 text-xs font-bold rounded-md backdrop-blur-md transition-all active:scale-95 h-[34px]"
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

      {/* Mobile Orientation Warning */}
      {isPortrait && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center pointer-events-auto">
          <div className="text-cyan-500 mb-6 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9z"></path><path d="M19 12v9"></path><path d="M5 21v-7"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">PLEASE ROTATE DEVICE</h2>
          <p className="text-neutral-400 mb-8">Neon Slither requires landscape mode for the best experience.</p>
          <div className="w-16 h-28 border-4 border-neutral-700 rounded-lg flex items-center justify-center animate-bounce">
            <div className="w-full h-1 bg-cyan-500/50"></div>
          </div>
        </div>
      )}

      {/* Mobile Fullscreen Button (Bottom Right) */}
      <div className="absolute bottom-4 right-4 pointer-events-auto sm:hidden">
        <button
          onClick={toggleFullscreen}
          className="p-3 bg-neutral-800/80 text-cyan-400 rounded-full border border-cyan-500/30 backdrop-blur-md"
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
          )}
        </button>
      </div>
    </div>
  );
};