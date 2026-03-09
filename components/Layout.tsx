import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import World from './World.tsx';
import ActiveQuestPanel from './ActiveQuestPanel.tsx';
import { AppHeader } from './AppHeader.tsx';
import AppFooter from './AppFooter.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';
import TouchControls from './TouchControls.tsx';
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
import { createMasteryDebrief } from '../services/learningGuidanceService.ts';

const Layout = React.forwardRef<HTMLDivElement>((props, viewportRef) => {
  const {
    agents, isLoading, currentSubtitle, worldArtifacts, activeParticipants,
  } = useAppStore(s => ({
    agents: s.agents,
    isLoading: s.isLoading,
    currentSubtitle: s.currentSubtitle,
    worldArtifacts: s.worldArtifacts,
    activeParticipants: s.activeParticipants,
  }), shallow);
  const {
    isAnyModalOpen,
    isFullscreen,
    isWelcomeModalOpen,
    selectedAgentId,
    targetAgentId,
    thinkingAgentId,
    thinkingMemories,
  } = useAppStore(s => ({
    isAnyModalOpen: s.ui.isAnyModalOpen,
    isFullscreen: s.ui.isFullscreen,
    isWelcomeModalOpen: s.ui.isWelcomeModalOpen,
    selectedAgentId: s.ui.selectedAgentId,
    targetAgentId: s.ui.targetAgentId,
    thinkingAgentId: s.ui.thinkingAgentId,
    thinkingMemories: s.ui.thinkingMemories,
  }), shallow);
  const { displayedArtifactId, onboardingState } = useAppStore(s => ({
    displayedArtifactId: s.game.displayedArtifactId,
    onboardingState: s.game.onboardingState,
  }), shallow);
  const { audioReady, currentTrack, musicMuted, sfxMuted, musicVolume, sfxVolume } = useAppStore(s => ({
    audioReady: s.audio.ready,
    currentTrack: s.audio.currentTrack,
    musicMuted: s.audio.musicMuted,
    sfxMuted: s.audio.sfxMuted,
    musicVolume: s.audio.musicVolume,
    sfxVolume: s.audio.sfxVolume,
  }), shallow);
  const inventory = useAppStore(s => s.inventory);
  
  const {
    setAgents, setUiState, setGameState, setAudioState, setInsightStatus
  } = useAppStore.getState();

  const [isPlayerBeingDragged, setIsPlayerBeingDragged] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{ x: number; y: number } | null>(null);
  const [touchMoveVector, setTouchMoveVector] = useState<{ x: number; y: number } | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateTouchCapability = () => {
      setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
    };
    updateTouchCapability();
    window.addEventListener('resize', updateTouchCapability);
    return () => window.removeEventListener('resize', updateTouchCapability);
  }, []);
  
  // --- Proximity Detection for Interactive Objects ---
  const proximityFlags = useAppStore(s => ({
      isNearArtEasel: s.ui.isNearArtEasel,
      isNearGroundingComputer: s.ui.isNearGroundingComputer,
      isNearVibeComputer: s.ui.isNearVibeComputer,
      isNearScreenplayTerminal: s.ui.isNearScreenplayTerminal,
      isNearModelComparisonTerminal: s.ui.isNearModelComparisonTerminal,
      isNearGameBoard: s.ui.isNearGameBoard,
  }), shallow);

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

    const newProximityStates = {
        isNearArtEasel: checkProximity('PLAYER_EASEL', PROXIMITY_DISTANCE),
        isNearGroundingComputer: checkProximity('GROUNDING_COMPUTER', PROXIMITY_DISTANCE),
        isNearVibeComputer: checkProximity('VIBE_COMPUTER', PROXIMITY_DISTANCE),
        isNearScreenplayTerminal: checkProximity('SCREENPLAY_TERMINAL', PROXIMITY_DISTANCE),
        isNearModelComparisonTerminal: checkProximity('MODEL_COMPARISON_TERMINAL', PROXIMITY_DISTANCE),
        isNearGameBoard: checkProximity('GAME_BOARD', PROXIMITY_DISTANCE)
    };
    
    // Only update if there's a change to avoid unnecessary re-renders
    const hasChanged = Object.keys(newProximityStates).some(key => 
        newProximityStates[key as keyof typeof newProximityStates] !== proximityFlags[key as keyof typeof proximityFlags]
    );

    if (hasChanged) {
        setUiState(newProximityStates);
    }

  }, [player?.position.left, player?.position.top, player?.roomId, setUiState, proximityFlags]);

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
        setUiState({ learningDebrief: createMasteryDebrief(roomId) });
        setTimeout(() => setGameState({ victoryRoomId: null }), 5000);
        const achievementMemory = `The user has demonstrated great skill and mastered the ${ROOMS[roomId]?.name || 'a room'}!`;
        ['TUTOR1', 'AK'].forEach(id => addMemory(id, { type: MemoryType.SEMANTIC, description: achievementMemory, fixedImportance: 8 }));
    }
  }, [setGameState, setUiState, addMemory]);

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

  usePlayerMovement(onPlayerMoveStart, moveTarget, touchMoveVector, clearMoveTarget, onPlayerMoveStart, isAnyModalOpen, skip, agentElementRefs);

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

  const adjustZoom = useCallback((direction: 1 | -1) => {
    const viewportElement = (viewportRef as React.RefObject<HTMLDivElement>).current;
    if (!viewportElement) return;

    setIsAutoViewEnabled(false);
    setIsMobileZoomLocked(true);

    const rect = viewportElement.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldX = (centerX / viewport.scale) - viewport.offset.x;
    const worldY = (centerY / viewport.scale) - viewport.offset.y;
    const scaleFactor = direction > 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.min(Math.max(0.1, viewport.scale * scaleFactor), 2.5);
    if (newScale === viewport.scale) return;

    const newOffsetX = (centerX / newScale) - worldX;
    const newOffsetY = (centerY / newScale) - worldY;
    setTargetViewport({ scale: newScale, offset: { x: newOffsetX, y: newOffsetY } });
  }, [setIsAutoViewEnabled, setIsMobileZoomLocked, setTargetViewport, viewport, viewportRef]);

  const handleCenterView = useCallback(() => {
    setTouchMoveVector(null);
    setMoveTarget(null);
    setIsAutoViewEnabled(true);
    setIsMobileZoomLocked(false);
    focusViewport?.();
  }, [focusViewport, setIsAutoViewEnabled, setIsMobileZoomLocked]);

  useEffect(() => {
    if (audioReady) {
        if (playerRoomId === 'outside') audioService.playAmbience(); else audioService.stopAmbience();
        const roomMusicKey = (playerRoomId && ROOMS[playerRoomId as keyof typeof ROOMS]?.musicTrack) || 'None';
        if (roomMusicKey !== currentTrack) setAudioState({ currentTrack: roomMusicKey });
        audioService.playMusic(roomMusicKey);
    }
  }, [playerRoomId, audioReady, currentTrack, setAudioState]);

  useEffect(() => {
    if (isAnyModalOpen) audioService.playMenuMusic();
    else if (audioReady) {
      audioService.stopMenuMusic();
      const roomMusicKey = (playerRoomId && ROOMS[playerRoomId as keyof typeof ROOMS]?.musicTrack) || 'None';
      audioService.playMusic(roomMusicKey);
      if (playerRoomId === 'outside') audioService.playAmbience();
      else audioService.stopAmbience();
    }
  }, [isAnyModalOpen, audioReady, playerRoomId]);

  // NEW EFFECT: Synchronize mute state with audio service
  useEffect(() => {
    audioService.setMusicMuted(musicMuted);
    audioService.setSfxMuted(sfxMuted);
  }, [musicMuted, sfxMuted]);

  useEffect(() => {
    audioService.setMusicVolume(musicVolume);
    audioService.setSfxVolume(sfxVolume);
  }, [musicVolume, sfxVolume]);

  useEffect(() => {
    const playBark = () => {
      const state = useAppStore.getState();
      if (state.isLoading || state.ui.isAnyModalOpen) return;
      
      const welcomeText = "Hey you, you look lost! Come over here and I'll explain how things work. You can walk with the arrow keys, WASD, or a controller.";
      
      // Set the visual greeting bubble
      state.setAgentGreeting('TUTOR1', { text: welcomeText, timestamp: Date.now() });
      
      // Play the sound effect and TTS
      audioService.playMessageSound();
      const { ttsEnabled, agentVoices, ttsVolume } = state.audio;
      const { elevenLabsApiKey, openAiApiKey, microsoftApiKey, microsoftApiRegion } = state.services;

      if (ttsEnabled) {
          const voiceURI = agentVoices['TUTOR1'] || null;
          if (voiceURI) {
              if (voiceURI.startsWith('openai:')) state.logApiUsage({ type: 'tts', provider: 'OpenAI', characters: welcomeText.length });
              else if (voiceURI.startsWith('elevenlabs:')) state.logApiUsage({ type: 'tts', provider: 'ElevenLabs', characters: welcomeText.length });
              else if (voiceURI.startsWith('microsoft:')) state.logApiUsage({ type: 'tts', provider: 'Microsoft', characters: welcomeText.length });
              
              speechService.speak(welcomeText, voiceURI, ttsVolume, openAiApiKey, elevenLabsApiKey, microsoftApiKey, microsoftApiRegion);
          }
      }
    };
    if (!isWelcomeModalOpen && audioReady && onboardingState === 'needed' && !onboardingBarkPlayed.current) {
      onboardingBarkPlayed.current = true;
      setTimeout(playBark, 1500);
    }
  }, [isWelcomeModalOpen, audioReady, onboardingState]);

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
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setUiState({ isFullscreen: !isFullscreen })}
      />
      <main className="w-full flex-grow flex items-center justify-center px-2 md:px-4 pb-2 md:pb-4 overflow-hidden relative">
        <ActiveQuestPanel roomId={playerRoomId} />
        <ErrorBoundary>
            <World
              ref={viewportRef}
              agents={agents.filter(a => !a.isLocked)}
              currentSubtitle={currentSubtitle}
              selectedAgentId={selectedAgentId}
              targetAgentId={targetAgentId}
              participantIds={activeParticipants.map(p => p.id)}
              thinkingAgentId={thinkingAgentId}
              thinkingMemories={thinkingMemories}
              viewport={viewport}
              playerRoomId={playerRoomId}
              displayedImageUrl={displayedImage?.type === 'image' ? displayedImage.imageUrl : null}
              worldArtifacts={worldArtifacts}
              moveTarget={moveTarget}
              agentElementRefs={agentElementRefs}
              onWorldArtifactClick={handleWorldArtifactClick}
              proximityFlags={proximityFlags}
              {...inputHandlers}
            />
        </ErrorBoundary>
        <TouchControls
          visible={isTouchDevice && !isWelcomeModalOpen}
          onMoveChange={setTouchMoveVector}
          onZoomIn={() => adjustZoom(1)}
          onZoomOut={() => adjustZoom(-1)}
          onCenterView={handleCenterView}
        />
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
