import React, { useEffect, useRef } from 'react';
import { gameEngine } from '../game/GameEngine';
import { CONFIG } from '../constants';

export const Minimap: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const size = 150; // Pixel size of the minimap
    const mapRadius = CONFIG.mapSize;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            ctx.clearRect(0, 0, size, size);

            // Draw background circle
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();

            const player = gameEngine.getPlayer();
            const snakes = gameEngine.snakes;

            // Helper to convert game coords to minimap coords
            const toMinimapX = (val: number) => (val / (mapRadius * 2)) * size + size / 2;
            const toMinimapY = (val: number) => size / 2 - (val / (mapRadius * 2)) * size;

            // Draw other snakes
            snakes.forEach(s => {
                if (s.id === player?.id) return;
                const mx = toMinimapX(s.head.x);
                const my = toMinimapY(s.head.y);

                ctx.beginPath();
                ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fill();
            });

            // Draw player snake
            if (player) {
                const px = toMinimapX(player.head.x);
                const py = toMinimapY(player.head.y);

                // Draw a pulsing dot for player
                const pulse = Math.sin(Date.now() / 200) * 0.5 + 1.5;
                ctx.beginPath();
                ctx.arc(px, py, 3 * pulse, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [mapRadius]);

    return (
        <div className="absolute bottom-4 right-4 pointer-events-auto rounded-full overflow-hidden bg-black/60 border border-white/20">
            <canvas
                ref={canvasRef}
                width={size}
                height={size}
                className="block"
            />
        </div>
    );
};
