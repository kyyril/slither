import React, { useEffect, useState } from 'react';

interface Room {
    ID: string;
    Players: number;
}

interface RoomSelectorProps {
    onSelect: (roomID: string) => void;
}

export const RoomSelector: React.FC<RoomSelectorProps> = ({ onSelect }) => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const response = await fetch('http://localhost:8080/rooms');
                const data = await response.json();
                setRooms(data || []);
            } catch (error) {
                console.error('Failed to fetch rooms:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
        const interval = setInterval(fetchRooms, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md p-8 bg-neutral-900 border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 tracking-tighter">
                        NEON SLITHER
                    </h1>
                    <p className="text-neutral-500 font-medium">Select an arena to begin</p>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {loading && rooms.length === 0 ? (
                        <div className="flex flex-col items-center py-10 space-y-4">
                            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                            <p className="text-cyan-500/50 text-sm font-bold uppercase tracking-widest">Finding Servers...</p>
                        </div>
                    ) : (
                        rooms.map((room) => (
                            <button
                                key={room.ID}
                                onClick={() => onSelect(room.ID)}
                                className="group relative w-full p-5 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-cyan-500/50 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                            >
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="text-left">
                                        <div className="text-white font-bold text-lg group-hover:text-cyan-400 transition-colors">
                                            {room.ID}
                                        </div>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                                            <span className="text-neutral-500 text-xs font-bold uppercase">Online</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-cyan-500 font-black text-xl italic leading-none">
                                            {room.Players}
                                        </div>
                                        <div className="text-neutral-600 text-[10px] font-bold uppercase tracking-tighter">Players</div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[80px] -mr-16 -mt-16 group-hover:bg-cyan-500/10 transition-all"></div>
                            </button>
                        ))
                    )}
                </div>

                <div className="mt-10 text-center">
                    <p className="text-neutral-600 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                        Authoritative Server v1.0<br />
                        Global Spatial Partitioning Active
                    </p>
                </div>
            </div>
        </div>
    );
};
