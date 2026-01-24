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
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
                const response = await fetch(`${apiUrl}/rooms`);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-white/5 blur-[120px] rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
            </div>

            <div className="relative w-full max-w-md p-8 bg-neutral-900/80 backdrop-blur-xl rounded-xl border border-white/5">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">
                        SLITHER
                    </h1>
                    <p className="text-neutral-500 font-medium">Select an arena to begin</p>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {loading && rooms.length === 0 ? (
                        <div className="flex flex-col items-center py-10 space-y-4">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Finding Servers...</p>
                        </div>
                    ) : (
                        rooms.map((room) => (
                            <button
                                key={room.ID}
                                onClick={() => onSelect(room.ID)}
                                className="group relative w-full p-5 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-all"
                            >
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="text-left">
                                        <div className="text-white font-bold text-lg">
                                            {room.ID}
                                        </div>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-neutral-500 text-xs font-bold uppercase">Online</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white font-black text-xl italic leading-none">
                                            {room.Players}
                                        </div>
                                        <div className="text-neutral-600 text-[10px] font-bold uppercase tracking-tighter">Players</div>
                                    </div>
                                </div>
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
