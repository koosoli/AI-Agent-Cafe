import React from 'react';
import { StarIcon } from './icons.tsx';
import { ROOMS } from '../data/rooms.ts';

interface MasteryHudProps {
    masteredRooms: string[];
    currentRoomId?: string;
}

const MASTERABLE_ROOMS = Object.keys(ROOMS).filter(id => !['outside', 'roster', 'trash'].includes(id));

const MasteryHud = ({ masteredRooms, currentRoomId }: MasteryHudProps) => {
    const completed = masteredRooms.length;
    const total = MASTERABLE_ROOMS.length;
    const currentRoomName = currentRoomId && currentRoomId !== 'outside' ? ROOMS[currentRoomId]?.name : null;

    return (
        <div className="bg-black/30 p-1 md:p-2 border-2 border-black" style={{ boxShadow: '2px 2px 0px black' }}>
            <div className="flex items-center justify-between gap-3 text-xs md:text-sm uppercase text-yellow-100">
                <span>Stars {completed}/{total}</span>
                <span>{currentRoomName ? `Now in ${currentRoomName}` : 'Campus view'}</span>
            </div>
            <div className="mt-1 flex flex-wrap justify-end items-center gap-1 md:gap-2">
                {MASTERABLE_ROOMS.map(roomId => (
                    <div key={roomId} className="relative group">
                        <StarIcon
                            data-testid={`star-${roomId}`}
                            className={`w-4 h-4 sm:w-5 h-5 md:w-6 h-6 ${masteredRooms.includes(roomId) ? 'text-yellow-400' : 'text-gray-600'}`}
                            filled={masteredRooms.includes(roomId)}
                        />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-black text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {ROOMS[roomId].name} {masteredRooms.includes(roomId) ? '(Mastered)' : ''}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MasteryHud;
