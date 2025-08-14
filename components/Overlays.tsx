import React, { useEffect, useRef } from 'react';
import { shallow } from 'zustand/shallow';
import VictoryAnimation from './VictoryAnimation.tsx';
import SuperAgentUnlockAnimation from './SuperAgentUnlockAnimation.tsx';
import RoomNameIndicator from './RoomNameIndicator.tsx';
import GamepadCursor from './GamepadCursor.tsx';
import { useAppStore } from '../hooks/useAppContext.ts';
import { ROOMS } from '../data/rooms.ts';
import { USER_AGENT } from '../constants.ts';
import FpsCounter from './FpsCounter.tsx';

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
        </>
    );
};

export default Overlays;