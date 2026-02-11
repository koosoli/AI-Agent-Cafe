import React from 'react';
import { useAppStore } from '../hooks/useAppContext.ts';
import { CloseIcon, StarIcon } from './icons.tsx';
import { ROOMS } from '../data/rooms.ts';

interface ObjectiveTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MASTERABLE_ROOM_IDS = Object.keys(ROOMS).filter(id => !['outside', 'roster', 'trash'].includes(id) && ROOMS[id].objective);

const ObjectiveTrackerModal = ({ isOpen, onClose }: ObjectiveTrackerModalProps) => {
    const masteredRooms = useAppStore(s => s.game.masteredRooms);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
            <div
              className="pixel-modal w-full max-w-3xl max-h-[90vh] flex flex-col welcome-modal-animation"
              role="dialog"
              aria-modal="true"
              aria-labelledby="objective-tracker-heading"
            >
                <header className="pixel-header flex justify-between items-center p-4">
                    <h2 id="objective-tracker-heading" className="text-3xl md:text-4xl">Objective Tracker</h2>
                    <button onClick={onClose} className="text-white hover:text-red-500 ml-4" data-close-button="true"><CloseIcon className="w-8 h-8" /></button>
                </header>

                <main className="p-4 md:p-6 overflow-y-auto space-y-4 flex-grow">
                    {MASTERABLE_ROOM_IDS.length === 0 ? (
                        <p className="text-center text-gray-400">No objectives defined yet.</p>
                    ) : (
                        MASTERABLE_ROOM_IDS.map(roomId => {
                            const room = ROOMS[roomId];
                            const isMastered = masteredRooms.includes(roomId);
                            return (
                                <div key={roomId} className={`p-4 border-2 flex items-start gap-4 transition-all duration-300 ${isMastered ? 'bg-yellow-900/30 border-yellow-700' : 'bg-black/20 border-black'}`}>
                                    <StarIcon 
                                        className={`w-10 h-10 flex-shrink-0 mt-1 ${isMastered ? 'text-yellow-400' : 'text-gray-600'}`}
                                        filled={isMastered}
                                    />
                                    <div>
                                        <h3 className={`text-2xl font-bold ${isMastered ? 'text-yellow-300' : 'text-white'}`}>{room.name}</h3>
                                        <p className={`mt-1 text-lg ${isMastered ? 'text-yellow-100' : 'text-gray-300'}`}>{room.objective}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </main>
                
                <footer className="p-4 border-t-2 border-black mt-auto flex justify-end">
                    <button onClick={onClose} className="pixel-button bg-gray-600 text-lg md:text-xl">Close</button>
                </footer>
            </div>
        </div>
    );
};

export default ObjectiveTrackerModal;