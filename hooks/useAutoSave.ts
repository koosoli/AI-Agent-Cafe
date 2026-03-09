import { useEffect } from 'react';
import { useAppStore } from './useAppContext.ts';
import { USER_AGENT } from '../constants.ts';

const AUTO_SAVE_DELAY_MS = 5000;

function getPersistedSnapshot(state = useAppStore.getState()) {
    const playerAgent = state.agents.find(agent => agent.id === USER_AGENT.id);

    return {
        playerAgent: playerAgent ? { name: playerAgent.name, spriteSeed: playerAgent.spriteSeed } : null,
        savedAgents: state.agents.filter(agent => agent.id !== USER_AGENT.id),
        inventory: state.inventory,
        worldArtifacts: state.worldArtifacts,
        messages: state.messages,
        userProfile: state.userProfile,
        audioSettings: {
            musicMuted: state.audio.musicMuted,
            sfxMuted: state.audio.sfxMuted,
            musicVolume: state.audio.musicVolume,
            sfxVolume: state.audio.sfxVolume,
            ttsEnabled: state.audio.ttsEnabled,
            ttsVolume: state.audio.ttsVolume,
            agentVoices: state.audio.agentVoices,
            sttProvider: state.audio.sttProvider,
        },
        serviceSettings: {
            geminiApiKey: state.services.geminiApiKey,
            elevenLabsApiKey: state.services.elevenLabsApiKey,
            openAiApiKey: state.services.openAiApiKey,
            openRouterApiKey: state.services.openRouterApiKey,
            localApiUrl: state.services.localApiUrl,
            customApiUrl: state.services.customApiUrl,
            customApiKey: state.services.customApiKey,
            microsoftApiKey: state.services.microsoftApiKey,
            microsoftApiRegion: state.services.microsoftApiRegion,
            imageGenerationModel: state.services.imageGenerationModel,
        },
        gameProgress: {
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
            roomCooldowns: state.game.roomCooldowns,
            roomChallengeProgress: state.game.roomChallengeProgress,
        },
        gameplaySettings: {
            playerSpeed: state.game.playerSpeed,
            runMultiplier: state.game.runMultiplier,
            difficulty: state.game.difficulty,
            subtitleDurationMultiplier: state.game.subtitleDurationMultiplier,
            manualSubtitleAdvance: state.game.manualSubtitleAdvance,
            agentAutonomyEnabled: state.game.agentAutonomyEnabled,
        },
    };
}

function serializeSnapshot(snapshot: ReturnType<typeof getPersistedSnapshot>) {
    return JSON.stringify(snapshot);
}

function writeSnapshot(snapshot: ReturnType<typeof getPersistedSnapshot>) {
    if (snapshot.playerAgent) {
        localStorage.setItem('playerAgent', JSON.stringify(snapshot.playerAgent));
    }

    localStorage.setItem('savedAgents', JSON.stringify(snapshot.savedAgents));
    localStorage.setItem('inventory', JSON.stringify(snapshot.inventory));
    localStorage.setItem('worldArtifacts', JSON.stringify(snapshot.worldArtifacts));
    localStorage.setItem('messages', JSON.stringify(snapshot.messages));
    localStorage.setItem('userProfile', JSON.stringify(snapshot.userProfile));
    localStorage.setItem('audioSettings', JSON.stringify(snapshot.audioSettings));
    localStorage.setItem('serviceSettings', JSON.stringify(snapshot.serviceSettings));
    localStorage.setItem('gameProgress', JSON.stringify(snapshot.gameProgress));
    localStorage.setItem('gameplaySettings', JSON.stringify(snapshot.gameplaySettings));
}

export const useAutoSave = () => {
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let pendingSnapshot = getPersistedSnapshot();
        let lastSerializedSnapshot = serializeSnapshot(pendingSnapshot);

        const flush = () => {
            timeoutId = null;
            if (useAppStore.getState().ui.isWelcomeModalOpen) {
                return;
            }
            writeSnapshot(pendingSnapshot);
            console.log("Session auto-saved.");
        };

        const scheduleFlush = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(flush, AUTO_SAVE_DELAY_MS);
        };

        const unsubscribe = useAppStore.subscribe((state) => {
            const nextSnapshot = getPersistedSnapshot(state);
            const nextSerializedSnapshot = serializeSnapshot(nextSnapshot);

            if (nextSerializedSnapshot === lastSerializedSnapshot) {
                return;
            }

            pendingSnapshot = nextSnapshot;
            lastSerializedSnapshot = nextSerializedSnapshot;
            scheduleFlush();
        });

        const handleBeforeUnload = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (!useAppStore.getState().ui.isWelcomeModalOpen) {
                writeSnapshot(pendingSnapshot);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            window.removeEventListener('beforeunload', handleBeforeUnload);
            unsubscribe();
        };
    }, []);
};
