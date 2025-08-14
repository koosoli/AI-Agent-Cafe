import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import World from './World.tsx';
import { AppHeader } from './AppHeader.tsx';
import AppFooter from './AppFooter.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';
import { useAppStore } from '../hooks/useAppContext.ts';
import { useConversationManager } from '../hooks/useConversationManager.ts';
import { usePlayerMovement } from '../hooks/usePlayerMovement.ts';
import { useInputManager } from '../hooks/useInputManager.ts';
import { useViewportManager } from '../hooks/useViewportManager.ts';
import { useAgentBehavior } from '../hooks/useAgentBehavior.ts';
import { useAgentMotivation } from '../hooks/useAgentMotivation.ts';
import { useMemoryManager } from '../hooks/useMemoryManager.ts';
import { useAgentSocialSimulation } from '../hooks/useAgentSocialSimulation.ts';
import * as audioService from '../services/audioService.ts';
import * as speechService from '../services/speechService.ts';
import { getRoomForPosition, isPositionValid } from '../services/collisionService.ts';
import { USER_AGENT } from '../constants.ts';
import { ROOMS } from '../data/rooms.ts';
import { INTERACTIVE_OBJECTS } from '../data/layout.ts';
import type { Agent, WorldImageArtifact, Artifact } from '../types.ts';
import { MemoryType } from '../types.ts';

const Layout = React.forwardRef<HTMLDivElement>((props, viewportRef) => {
  const {
    agents, isLoading, currentSubtitle, ui, game, audio, inventory, worldArtifacts, activeParticipants,
  } = useAppStore(s => ({
    agents: s.agents,
    isLoading: s.isLoading,
    currentSubtitle: s.currentSubtitle,
    ui: s.ui,
    game: s.game,
    audio: s.audio,
    inventory: s.inventory,
    worldArtifacts: s.worldArtifacts,
    activeParticipants: s.activeParticipants,
  }), shallow);
  
  const {
    setAgents, setUiState, setGameState, setAudioState, setInsightStatus
  } = useAppStore.getState();

  const { isAnyModalOpen, targetAgentId } = ui;
  const { displayedArtifactId } = game;

  const [isPlayerBeingDragged, setIsPlayerBeingDragged] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{ x: number; y: number } | null>(null);
  
  const userInputRef = useRef<HTMLTextAreaElement>(null);
  const agentElementRefs = useRef(new Map<string, HTMLDivElement | null>());
  const onboardingBarkPlayed = useRef(false);

  const player = useMemo(() => agents.find(a => a.id === USER_AGENT.id), [agents]);
  const playerRoomId = player?.roomId;

  // --- Logic Hooks ---
  const { addMemory } = useMemoryManager();
  useAgentMotivation();
  useAgentBehavior();
  useAgentSocialSimulation();
  const { viewport, setViewport, setTargetViewport, setIsAutoViewEnabled, setIsMobileZoomLocked } = useViewportManager(viewportRef as React.RefObject<HTMLDivElement>, isPlayerBeingDragged);
  const clearMoveTarget = useCallback(() => setMoveTarget(null), []);
  const onPlayerMoveStart = useCallback(() => setIsAutoViewEnabled(true), [setIsAutoViewEnabled]);
  const focusViewport = useAppStore(s => s.focusViewport);
  
  // --- Proximity Detection for Interactive Objects ---
  useEffect(() => {
    if (!player) return;

    const checkProximity = (objectKey: keyof typeof INTERACTIVE_OBJECTS, distance: number) => {
        const obj = INTERACTIVE_OBJECTS[objectKey];
        if (player.roomId !== obj.roomId) return false;

        const objCenterX = obj.left + obj.width / 2;
        const objCenterY = obj.top + obj.height / 2;
        const dx = player.position.left - objCenterX;
        const dy = player.position.top - objCenterY;
        return Math.hypot(dx, dy) < distance;
    };

    const PROXIMITY_DISTANCE = 150;

    const proximityStates = {
        isNearArtEasel: checkProximity('PLAYER_EASEL', PROXIMITY_DISTANCE),
        isNearGroundingComputer: checkProximity('GROUNDING_COMPUTER', PROXIMITY_DISTANCE),
        isNearVibeComputer: checkProximity('VIBE_COMPUTER', PROXIMITY_DISTANCE),
        isNearScreenplayTerminal: checkProximity('SCREENPLAY_TERMINAL', PROXIMITY_DISTANCE),
        isNearModelComparisonTerminal: checkProximity('MODEL_COMPARISON_TERMINAL', PROXIMITY_DISTANCE),
        isNearGameBoard: checkProximity('GAME_BOARD', PROXIMITY_DISTANCE)
    };
    
    // Only update if there's a change to avoid unnecessary re-renders
    const currentState = useAppStore.getState().ui;
    const hasChanged = Object.keys(proximityStates).some(key => 
        proximityStates[key as keyof typeof proximityStates] !== currentState[key as keyof typeof proximityStates]
    );

    if (hasChanged) {
        setUiState(proximityStates);
    }

  }, [player?.position.left, player?.position.top, player?.roomId, setUiState]);

  const handleAgentMove = useCallback((agentId: string, newPos: { left: number, top: number }, isDragging = false) => {
    const currentAgents = useAppStore.getState().agents;
    const agent = currentAgents.find(a => a.id === agentId);
    if (!agent) return;
    const newRoomId = getRoomForPosition(newPos.left, newPos.top);

    if (isPositionValid(newPos.left, newPos.top, isDragging, agent)) {
        const newAgents = currentAgents.map(a =>
            a.id === agentId
            ? { ...a, position: newPos, roomId: newRoomId }
            : a
        );
        setAgents(newAgents);
    }
  }, [setAgents]);

  const handleAgentRelativeMove = useCallback((agentId: string, direction: 'up' | 'down' | 'left' | 'right', distance: number) => {
    const agent = useAppStore.getState().agents.find(a => a.id === agentId);
    if (!agent) return;
    const moveAmount = Math.max(20, Math.min(200, distance));
    let dx = 0, dy = 0;
    if (direction === 'up') dy = -moveAmount;
    else if (direction === 'down') dy = moveAmount;
    else if (direction === 'left') dx = -moveAmount;
    else if (direction === 'right') dx = moveAmount;
    handleAgentMove(agentId, { left: agent.position.left + dx, top: agent.position.top + dy }, false);
  }, [handleAgentMove]);

  const handleRoomMastered = useCallback((roomId: string) => {
    const currentState = useAppStore.getState();
    if (!currentState.game.masteredRooms.includes(roomId)) {
        audioService.playVictorySound();
        const newMasteredRooms = [...currentState.game.masteredRooms, roomId];
        setGameState({ masteredRooms: newMasteredRooms, victoryRoomId: roomId });
        setTimeout(() => setGameState({ victoryRoomId: null }), 5000);
        const achievementMemory = `The user has demonstrated great skill and mastered the ${ROOMS[roomId]?.name || 'a room'}!`;
        ['TUTOR1', 'AK'].forEach(id => addMemory(id, { type: MemoryType.SEMANTIC, description: achievementMemory, fixedImportance: 8 }));
    }
  }, [setGameState, addMemory]);

  const handleStartFollowing = useCallback((agentId: string) => {
    setAgents(useAppStore.getState().agents.map(a => a.id === agentId ? { ...a, followingAgentId: USER_AGENT.id, isWaiting: false } : a));
  }, [setAgents]);

  const handleStopFollowing = useCallback((agentId: string) => {
    setAgents(useAppStore.getState().agents.map(a => a.id === agentId ? { ...a, followingAgentId: null, isWaiting: false } : a));
  }, [setAgents]);
  
  const handleStartWaiting = useCallback((agentId: string) => {
    setAgents(useAppStore.getState().agents.map(a => a.id === agentId ? { ...a, isWaiting: true, isWaitingUntil: Date.now() + 300000 } : a));
  }, [setAgents]);

  const { startDiscussion, interjectInDiscussion, cancelDiscussion, skip } = useConversationManager({
    onAgentRelativeMove: handleAgentRelativeMove,
    onRoomMastered: handleRoomMastered,
    onStartFollowing: handleStartFollowing,
    onStopFollowing: handleStopFollowing,
    onStartWaiting: handleStartWaiting,
  });

  usePlayerMovement(clearMoveTarget, moveTarget, clearMoveTarget, onPlayerMoveStart, ui.isAnyModalOpen, skip, agentElementRefs);

  const handleUseItemOnAgent = useCallback((agent: Agent, artifact: Artifact) => {
    const { addMessage } = useAppStore.getState();
    let prompt = '', logMsg = '';
    if (artifact.type === 'image') {
      prompt = `The user shows you an image they generated with the prompt: "${artifact.prompt}". What is your reaction?`;
      logMsg = `(You show ${agent.name} an image: "${artifact.prompt}")`;
    } //... add other artifact types
    addMessage({ id: `msg-${Date.now()}`, agentId: USER_AGENT.id, text: logMsg, timestamp: Date.now(), isItemInteraction: true, artifact });
    startDiscussion(prompt, agent.id, { isItemInteraction: true });
  }, [startDiscussion]);

  const onAgentClick = useCallback((id: string) => {
    const state = useAppStore.getState();
    if (state.game.equippedArtifactId) {
        const agent = state.agents.find(a => a.id === id);
        const artifact = state.inventory.find(art => art.id === state.game.equippedArtifactId);
        if (agent && artifact) { handleUseItemOnAgent(agent, artifact); return; }
    }
    setUiState({ selectedAgentId: id });
  }, [setUiState, handleUseItemOnAgent]);

  const onAgentDoubleClick = useCallback((agentId: string) => {
    setUiState({ editingAgentId: agentId, isSettingsOpen: true, initialSettingsTab: agentId === USER_AGENT.id ? 'Gameplay' : 'Agents' });
  }, [setUiState]);

  const handleInteractiveObjectClick = useCallback((type: string) => {
    if (type === 'art_easel') setUiState({ isImageGenerationModalOpen: true });
    else if (type === 'grounding_computer') setUiState({ isGroundingComputerModalOpen: true });
    else if (type === 'vibe_computer') setUiState({ isVibeCodingModalOpen: true });
    else if (type === 'screenplay_terminal') setUiState({ isScreenplayModalOpen: true });
    else if (type === 'model_comparison_terminal') setUiState({ isModelComparisonModalOpen: true });
    else if (type === 'game_board') {
      if (!useAppStore.getState().game.dungeonChallengeState) setGameState({ dungeonChallengeState: { status: 'initial', playerCharacter: null, log: [], turn: 'Player' } });
      setUiState({ isGameBoardModalOpen: true });
    }
  }, [setUiState, setGameState]);
  
  const inputHandlers = useInputManager({
    viewportRef: viewportRef as React.RefObject<HTMLDivElement>, viewport, setViewport, setTargetViewport, setIsAutoViewEnabled, setIsMobileZoomLocked, setMoveTarget, onPlayerMoveStart, handleFocus: focusViewport || (() => {}), handleAgentMove, setIsPlayerBeingDragged, userInputRef,
    onArtEaselClick: () => handleInteractiveObjectClick('art_easel'),
    onGroundingComputerClick: () => handleInteractiveObjectClick('grounding_computer'),
    onVibeComputerClick: () => handleInteractiveObjectClick('vibe_computer'),
    onScreenplayTerminalClick: () => handleInteractiveObjectClick('screenplay_terminal'),
    onModelComparisonTerminalClick: () => handleInteractiveObjectClick('model_comparison_terminal'),
    onGameBoardClick: () => handleInteractiveObjectClick('game_board'),
    onAgentClick: onAgentClick,
    onAgentDoubleClick: onAgentDoubleClick,
  });

  const handleUserInputSubmit = useCallback((prompt: string) => {
    const state = useAppStore.getState();

    // Prioritize interactive objects over general chat
    if (state.ui.isNearArtEasel) {
        setGameState({ lastArtPrompt: prompt });
        setUiState({ isImageGenerationModalOpen: true, initialModalPrompt: prompt });
        if (focusViewport) focusViewport();
        return;
    }
    if (state.ui.isNearGroundingComputer) {
        setUiState({ isGroundingComputerModalOpen: true, initialModalPrompt: prompt });
        if (focusViewport) focusViewport();
        return;
    }
    if (state.ui.isNearVibeComputer) {
        setUiState({ isVibeCodingModalOpen: true, initialModalPrompt: prompt });
        if (focusViewport) focusViewport();
        return;
    }
    if (state.ui.isNearModelComparisonTerminal) {
        setUiState({ isModelComparisonModalOpen: true, initialModalPrompt: prompt });
        if (focusViewport) focusViewport();
        return;
    }
    if (state.ui.isNearScreenplayTerminal) {
        startDiscussion(prompt, null); // This initializes the script
        setUiState({ isScreenplayModalOpen: true, initialModalPrompt: prompt });
        if (focusViewport) focusViewport();
        return;
    }
    if (state.ui.isNearGameBoard) {
        // When talking to the game board, ensure the game state is initialized.
        if (!state.game.dungeonChallengeState || state.game.dungeonChallengeState.status === 'finished') {
            setGameState({ dungeonChallengeState: { status: 'initial', playerCharacter: null, log: [], turn: 'Player' } });
        }
        setUiState({ isGameBoardModalOpen: true, initialModalPrompt: prompt });
        if (focusViewport) focusViewport();
        return;
    }

    // Default agent/discussion logic
    if (state.ui.targetAgentId === 'SKYNET1') {
        setUiState({ isSkynetTerminalOpen: true, initialModalPrompt: prompt });
    } else if (isLoading) {
        interjectInDiscussion(prompt);
    } else {
        startDiscussion(prompt, targetAgentId);
    }
    if (focusViewport) focusViewport();
  }, [startDiscussion, interjectInDiscussion, targetAgentId, focusViewport, setGameState, setUiState, isLoading]);

  const handleWorldArtifactClick = useCallback((artifact: WorldImageArtifact) => {
    setUiState({ isWorldArtifactModalOpen: true, worldArtifactToInspect: artifact });
  }, [setUiState]);

  useEffect(() => {
    if (audio.ready) {
        if (playerRoomId === 'outside') audioService.playAmbience(); else audioService.stopAmbience();
        const roomMusicKey = (playerRoomId && ROOMS[playerRoomId as keyof typeof ROOMS]?.musicTrack as keyof typeof audioService.MUSIC_TRACKS) || 'None';
        const newTrackUrl = audioService.MUSIC_TRACKS[roomMusicKey] || '';
        if (newTrackUrl !== audio.currentTrack) setAudioState({ currentTrack: newTrackUrl });
        audioService.playMusic(newTrackUrl);
    }
  }, [playerRoomId, audio.ready, audio.currentTrack, setAudioState]);

  useEffect(() => {
    if (isAnyModalOpen) audioService.playMenuMusic();
    else if (audio.ready) {
      audioService.stopMenuMusic();
      const roomMusicKey = (playerRoomId && ROOMS[playerRoomId as keyof typeof ROOMS]?.musicTrack as keyof typeof audioService.MUSIC_TRACKS) || 'None';
      audioService.playMusic(audioService.MUSIC_TRACKS[roomMusicKey] || '');
      if (playerRoomId === 'outside') audioService.playAmbience();
      else audioService.stopAmbience();
    }
  }, [isAnyModalOpen, audio.ready, playerRoomId]);

  // NEW EFFECT: Synchronize mute state with audio service
  useEffect(() => {
    audioService.setMusicMuted(audio.musicMuted);
    audioService.setSfxMuted(audio.sfxMuted);
  }, [audio.musicMuted, audio.sfxMuted]);

  useEffect(() => {
    const playBark = async () => {
      const state = useAppStore.getState();
      if (state.isLoading || state.ui.isAnyModalOpen) return;
      const welcomeText = "Hey you, you look lost! Come over here and I'll explain how things work. You can walk with the arrow keys, WASD, or a controller.";
      state.setAgentGreeting('TUTOR1', { text: welcomeText, timestamp: Date.now() });
      if (state.audio.ttsEnabled) { /* ... speech logic ... */ }
    };
    if (!ui.isWelcomeModalOpen && audio.ready && game.onboardingState === 'needed' && !onboardingBarkPlayed.current) {
      onboardingBarkPlayed.current = true;
      setTimeout(playBark, 1500);
    }
  }, [ui.isWelcomeModalOpen, audio.ready, game.onboardingState]);

  useEffect(() => {
    agents.forEach(agent => {
        if (agent.hasNewInsight) {
            const timer = setTimeout(() => setInsightStatus(agent.id, false), 4000);
            return () => clearTimeout(timer);
        }
    });
  }, [agents, setInsightStatus]);

  const displayedImage = useMemo(() => {
    if (!displayedArtifactId) return null;
    return inventory.find(art => art.id === displayedArtifactId);
  }, [inventory, displayedArtifactId]);

  return (
    <>
      <AppHeader
        isFullscreen={ui.isFullscreen}
        onToggleFullscreen={() => setUiState({ isFullscreen: !ui.isFullscreen })}
      />
      <main className="w-full flex-grow flex items-center justify-center px-2 md:px-4 pb-2 md:pb-4 overflow-hidden relative">
        <ErrorBoundary>
            <World
              ref={viewportRef}
              agents={agents.filter(a => !a.isLocked)}
              currentSubtitle={currentSubtitle}
              selectedAgentId={ui.selectedAgentId}
              targetAgentId={ui.targetAgentId}
              participantIds={activeParticipants.map(p => p.id)}
              thinkingAgentId={ui.thinkingAgentId}
              thinkingMemories={ui.thinkingMemories}
              viewport={viewport}
              playerRoomId={playerRoomId}
              displayedImageUrl={displayedImage?.type === 'image' ? displayedImage.imageUrl : null}
              worldArtifacts={worldArtifacts}
              moveTarget={moveTarget}
              agentElementRefs={agentElementRefs}
              onWorldArtifactClick={handleWorldArtifactClick}
              {...inputHandlers}
            />
        </ErrorBoundary>
      </main>
      <AppFooter
        userInputRef={userInputRef}
        onSubmit={handleUserInputSubmit}
        onCancel={cancelDiscussion}
      />
    </>
  );
});

export default Layout;