import React, { useEffect, useRef, useState } from 'react';
import { shallow } from 'zustand/shallow';
import VictoryAnimation from './VictoryAnimation.tsx';
import SuperAgentUnlockAnimation from './SuperAgentUnlockAnimation.tsx';
import RoomNameIndicator from './RoomNameIndicator.tsx';
import GamepadCursor from './GamepadCursor.tsx';
import { useAppStore } from '../hooks/useAppContext.ts';
import { ROOMS } from '../data/rooms.ts';
import { USER_AGENT } from '../constants.ts';
import FpsCounter from './FpsCounter.tsx';

const ToastNotification: React.FC = () => {
    const toast = useAppStore(s => s.ui.toast);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (toast) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 3500); // Fade out before it's removed from state
            return () => clearTimeout(timer);
        }
    }, [toast]);

    if (!toast) {
        return null;
    }

    return (
        <div
            key={toast.id}
            className={`fixed bottom-28 left-1/2 -translate-x-1/2 bg-black/80 text-white text-lg px-4 py-2 border-2 border-yellow-400 pointer-events-none z-[2000] transition-all duration-300 ease-out ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
            style={{
                textShadow: '2px 2px #000',
                boxShadow: '4px 4px 0px black'
            }}
        >
            {toast.message}
        </div>
    );
};

const Overlays: React.FC = () => {
    const { 
        victoryRoomId, allRoomsMastered, isAnyModalOpen, isWelcomeModalOpen, showFps
    } = useAppStore(s => ({
        victoryRoomId: s.game.victoryRoomId,
        allRoomsMastered: s.game.allRoomsMastered,
        isAnyModalOpen: s.ui.isAnyModalOpen,
        isWelcomeModalOpen: s.ui.isWelcomeModalOpen,
        showFps: s.ui.showFps,
    }), shallow);
    
    const playerRoomId = useAppStore(s => s.agents.find(a => a.id === USER_AGENT.id)?.roomId);
    const displayedRoomName = useAppStore(s => s.ui.displayedRoomName);
    const { setGameState, setAgents, setUiState } = useAppStore.getState();
    const [showUnlockAnimation, setShowUnlockAnimation] = React.useState(false);
    
    useEffect(() => {
        if (allRoomsMastered) {
            setTimeout(() => setShowUnlockAnimation(true), 2000);
        }
    }, [allRoomsMastered]);

    const handleUnlockAnimationComplete = React.useCallback(() => {
        setShowUnlockAnimation(false);
        setGameState({ superAgentUnlocked: true });
        const currentAgents = useAppStore.getState().agents;
        setAgents(currentAgents.map(a => a.id === 'ARCHITECT1' ? { ...a, isLocked: false } : a));
    }, [setGameState, setAgents]);

    const roomAnnouncerTimeoutRef = useRef<number | null>(null);
    useEffect(() => {
        if (playerRoomId && playerRoomId !== 'outside' && playerRoomId !== 'trash' && !isWelcomeModalOpen) {
            setUiState({ displayedRoomName: ROOMS[playerRoomId]?.name || 'Unknown Area' });
            if (roomAnnouncerTimeoutRef.current) clearTimeout(roomAnnouncerTimeoutRef.current);
            roomAnnouncerTimeoutRef.current = window.setTimeout(() => setUiState({ displayedRoomName: null }), 4000);
        } else {
            setUiState({ displayedRoomName: null });
        }
        return () => { if (roomAnnouncerTimeoutRef.current) clearTimeout(roomAnnouncerTimeoutRef.current); };
    }, [playerRoomId, isWelcomeModalOpen, setUiState]);

    return (
        <>
            <GamepadCursor isAnyModalOpen={isAnyModalOpen} />
            {showFps && <FpsCounter />}
            {victoryRoomId && <VictoryAnimation key={victoryRoomId} />}
            {showUnlockAnimation && <SuperAgentUnlockAnimation onComplete={handleUnlockAnimationComplete} />}
            {displayedRoomName && !isWelcomeModalOpen && <RoomNameIndicator roomName={displayedRoomName} />}
            <ToastNotification />
        </>
    );
};

export default Overlays;