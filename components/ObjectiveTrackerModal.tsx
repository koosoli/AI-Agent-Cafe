import React from 'react';
import { shallow } from 'zustand/shallow';
import { useAppStore } from '../hooks/useAppContext.ts';
import { CloseIcon, StarIcon } from './icons.tsx';
import { ROOMS } from '../data/rooms.ts';
import { getRoomGuidance } from '../services/learningGuidanceService.ts';

interface ObjectiveTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MASTERABLE_ROOM_IDS = Object.keys(ROOMS).filter(id => !['outside', 'roster', 'trash'].includes(id) && ROOMS[id].objective);

const ObjectiveTrackerModal = ({ isOpen, onClose }: ObjectiveTrackerModalProps) => {
    const state = useAppStore(s => ({
        agents: s.agents,
        messages: s.messages,
        game: s.game,
    }), shallow);
    const masteredRooms = state.game.masteredRooms;

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
                            const guidance = getRoomGuidance(state, roomId);
                            return (
                                <div
                                    key={roomId}
                                    className={`p-4 border-2 transition-all duration-300 ${isMastered ? 'bg-yellow-900/30 border-yellow-700' : 'bg-black/20 border-black'}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <StarIcon
                                            className={`w-10 h-10 flex-shrink-0 mt-1 ${isMastered ? 'text-yellow-400' : 'text-gray-600'}`}
                                            filled={isMastered}
                                        />
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className={`text-2xl font-bold ${isMastered ? 'text-yellow-300' : 'text-white'}`}>{room.name}</h3>
                                                {guidance && (
                                                    <span className="text-xs uppercase px-2 py-1 border border-white/20 bg-black/20">
                                                        {guidance.progress.label}
                                                    </span>
                                                )}
                                                {guidance?.revisions && (
                                                    <span className="text-xs uppercase px-2 py-1 border border-white/20 bg-black/20">
                                                        {guidance.revisions.label}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`mt-1 text-lg ${isMastered ? 'text-yellow-100' : 'text-gray-300'}`}>{room.objective}</p>
                                            {guidance && (
                                                <>
                                                    <p className="mt-2 text-sm uppercase tracking-[0.2em] text-white/70">{guidance.skill}</p>
                                                    <p className="mt-1 text-base text-white/80">{guidance.mastery}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {guidance && (
                                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Current Path</p>
                                                <div className="mt-2 space-y-2">
                                                    {guidance.steps.map(step => (
                                                        <div key={step.label} className="flex items-start gap-2 text-sm">
                                                            <span className={`mt-1 h-3 w-3 shrink-0 border border-black/50 ${step.status === 'done' ? 'bg-yellow-400' : step.status === 'current' ? 'bg-white' : 'bg-black/20'}`}></span>
                                                            <span className={step.status === 'todo' ? 'text-white/60' : ''}>{step.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Next Step</p>
                                                <p className="mt-2 text-sm text-white/80">{guidance.nextAction}</p>
                                                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/60">Coach Tip</p>
                                                <p className="mt-2 text-sm text-white/70">{guidance.coachTip}</p>
                                            </div>
                                        </div>
                                    )}
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
