import { useEffect } from 'react';
import { useAppStore } from './useAppContext.ts';
import { USER_AGENT } from '../constants.ts';

// Helper debounce function
const debounce = (func: () => void, delay: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(func, delay);
    };
};

const saveState = () => {
    const state = useAppStore.getState();
    if (state.ui.isWelcomeModalOpen) return; // Don't save during initial welcome

    // Player Agent
    const playerAgent = state.agents.find(a => a.id === USER_AGENT.id);
    if(playerAgent) localStorage.setItem('playerAgent', JSON.stringify({ name: playerAgent.name, spriteSeed: playerAgent.spriteSeed }));
    
    // AI Agents
    const agentsToSave = state.agents.filter(a => a.id !== USER_AGENT.id);
    localStorage.setItem('savedAgents', JSON.stringify(agentsToSave));

    // Core App State
    localStorage.setItem('inventory', JSON.stringify(state.inventory));
    localStorage.setItem('worldArtifacts', JSON.stringify(state.worldArtifacts));
    localStorage.setItem('messages', JSON.stringify(state.messages));
    localStorage.setItem('userProfile', JSON.stringify(state.userProfile));

    // Grouped Settings
    const audioSettings = {
        musicMuted: state.audio.musicMuted,
        sfxMuted: state.audio.sfxMuted,
        musicVolume: state.audio.musicVolume,
        sfxVolume: state.audio.sfxVolume,
        ttsEnabled: state.audio.ttsEnabled,
        ttsVolume: state.audio.ttsVolume,
        agentVoices: state.audio.agentVoices,
        sttProvider: state.audio.sttProvider
    };
    localStorage.setItem('audioSettings', JSON.stringify(audioSettings));

    const serviceSettings = {
        geminiApiKey: state.services.geminiApiKey,
        elevenLabsApiKey: state.services.elevenLabsApiKey,
        openAiApiKey: state.services.openAiApiKey,
        openRouterApiKey: state.services.openRouterApiKey,
        localApiUrl: state.services.localApiUrl,
        customApiUrl: state.services.customApiUrl,
        customApiKey: state.services.customApiKey,
        microsoftApiKey: state.services.microsoftApiKey,
        microsoftApiRegion: state.services.microsoftApiRegion,
        imageGenerationModel: state.services.imageGenerationModel
    };
    localStorage.setItem('serviceSettings', JSON.stringify(serviceSettings));

    const gameProgress = {
        masteredRooms: state.game.masteredRooms,
        onboardingState: state.game.onboardingState,
        allRoomsMastered: state.game.allRoomsMastered,
        superAgentUnlocked: state.game.superAgentUnlocked,
        barryMet: state.game.barryMet,
        totalPromptTokens: state.game.totalPromptTokens,
        totalCompletionTokens: state.game.totalCompletionTokens,
        usageStats: state.game.usageStats,
        agentPromptHistory: state.game.agentPromptHistory,
        displayedArtifactId: state.game.displayedArtifactId,
        roomCooldowns: state.game.roomCooldowns
    };
    localStorage.setItem('gameProgress', JSON.stringify(gameProgress));

    const gameplaySettings = {
        playerSpeed: state.game.playerSpeed,
        runMultiplier: state.game.runMultiplier,
        difficulty: state.game.difficulty,
        subtitleDurationMultiplier: state.game.subtitleDurationMultiplier,
        manualSubtitleAdvance: state.game.manualSubtitleAdvance,
        agentAutonomyEnabled: state.game.agentAutonomyEnabled
    };
    localStorage.setItem('gameplaySettings', JSON.stringify(gameplaySettings));
    
    console.log("Session auto-saved.");
};

// Debounce the save function to avoid saving on every single state change
const debouncedSaveState = debounce(saveState, 3000);

// Custom hook to activate the auto-save functionality
export const useAutoSave = () => {
    useEffect(() => {
        const unsubscribe = useAppStore.subscribe(debouncedSaveState);
        return () => unsubscribe(); // Cleanup subscription on unmount
    }, []);
};