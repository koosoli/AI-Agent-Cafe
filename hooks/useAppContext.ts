import { createWithEqualityFn } from 'zustand/traditional';
import { immer } from 'zustand/middleware/immer';
import type { AppState, Agent, Message, UserProfile, ApiUsagePayload, Artifact, Memory, WorldImageArtifact, CodeArtifact } from '../types.ts';
import { SpeechServiceProvider, LLMProvider, MemoryType } from '../types.ts';
import { USER_AGENT, IMAGEN_MODELS } from '../constants.ts';
import { DEFAULT_AGENTS } from '../data/agents.ts';
import { GAME_CONFIG } from '../data/gameConfig.ts';
import * as memoryService from '../services/memoryService.ts';
import { getEmbedding } from '../services/embeddingService.ts';

// Helper to safely parse JSON from localStorage
const safeJsonParse = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        if (!item) return defaultValue;
        return JSON.parse(item);
    } catch (e) {
        console.warn(`Could not parse localStorage item "${key}". Using default value.`, e);
        return defaultValue;
    }
};

// Function to get a minimal initial state for instant loading
const getMinimalInitialState = (): AppState => ({
    agents: [USER_AGENT, ...JSON.parse(JSON.stringify(DEFAULT_AGENTS))],
    messages: [],
    inventory: [],
    worldArtifacts: [],
    isLoading: true, // Start loading until hydrated
    currentSubtitle: null,
    activeParticipants: [],
    userProfile: {},
    ui: {
        isSettingsOpen: false, isLogOpen: false, isWelcomeModalOpen: true, isAddAgentModalOpen: false,
        isInventoryOpen: false, isScreenplayModalOpen: false, isSkynetTerminalOpen: false, isObjectiveTrackerOpen: false,
        skynetTerminalContent: '', selectedAgentId: null, editingAgentId: null, initialSettingsTab: 'General',
        initialModalPrompt: null, targetAgentId: null, thinkingAgentId: null, thinkingMemories: null, addAgentSpawnPos: null, isAnyModalOpen: true,
        isListeningForSpeech: false, isImageGenerationModalOpen: false, isGroundingComputerModalOpen: false,
        isVibeCodingModalOpen: false, vibeCodingArtifactToPreview: null, isModelComparisonModalOpen: false, isGameBoardModalOpen: false, isDojoModalOpen: false,
        isSocialGraphModalOpen: false, isMenuOpen: false, isNearArtEasel: false, isNearGroundingComputer: false,
        isNearVibeComputer: false, isNearScreenplayTerminal: false, isNearModelComparisonTerminal: false,
        isNearGameBoard: false, isInspectorMode: false, inspectorData: null, isWorldArtifactModalOpen: false, worldArtifactToInspect: null,
        isFullscreen: false, displayedRoomName: null, showFps: false,
    },
    game: {
        sessionId: `session-${Date.now()}`, masteredRooms: [], victoryRoomId: null, allRoomsMastered: false,
        superAgentUnlocked: false, isPlayerRunning: false, onboardingState: 'needed', barryMet: false, totalPromptTokens: 0,
        totalCompletionTokens: 0, usageStats: { llm: {}, image: {}, tts: {} }, lastArtPrompt: null, displayedArtifactId: null, equippedArtifactId: null,
        agentPromptHistory: {}, memoryEmbeddings: {}, studioConversationState: null, officeChallengeState: null,
        classroomChallengeState: null, artStudioChallengeState: null, dungeonChallengeState: null, dojoChallengeState: null,
        conversationQueue: [], playerSpeed: GAME_CONFIG.PLAYER_SPEED, runMultiplier: GAME_CONFIG.RUN_MULTIPLIER, difficulty: 'Normal', subtitleDurationMultiplier: 1.0,
        manualSubtitleAdvance: false, agentAutonomyEnabled: false, debriefingState: { active: false, roomId: null }, roomCooldowns: {},
        triggerDiscussion: null,
    },
    audio: {
        ready: false, musicMuted: false, sfxMuted: false, musicVolume: 0.05, sfxVolume: 1.0, currentTrack: '',
        ttsEnabled: false, ttsVolume: 1.0, agentVoices: {}, sttProvider: SpeechServiceProvider.BROWSER,
    },
    services: {
        geminiApiKey: '', elevenLabsApiKey: '', openAiApiKey: '', openRouterApiKey: '', localApiUrl: 'http://localhost:1234/v1', customApiUrl: '',
        customApiKey: '', microsoftApiKey: '', microsoftApiRegion: '', imageGenerationModel: IMAGEN_MODELS[0],
        openAIModels: [], openRouterModels: [], localAIModels: [], customAIModels: [],
    },
    focusViewport: () => {},
});


// Define the actions interface
interface AppActions {
    // Combined update actions
    setAgents: (newAgents: Agent[]) => void;
    setMessages: (messages: Message[]) => void;
    addMessage: (message: Message) => void;
    setIsLoading: (isLoading: boolean) => void;
    setCurrentSubtitle: (subtitle: Message | null) => void;
    setActiveParticipants: (participants: Agent[]) => void;
    setUserProfile: (profile: Partial<UserProfile>) => void;
    setUiState: (uiState: Partial<AppState['ui']>) => void;
    setGameState: (gameState: Partial<AppState['game']>) => void;
    logApiUsage: (payload: ApiUsagePayload) => void;
    setAudioState: (audioState: Partial<AppState['audio']>) => void;
    setServiceState: (serviceState: Partial<AppState['services']>) => void;
    addArtifact: (artifact: Artifact) => void;
    removeArtifact: (artifactId: string) => void;
    addMemory: (agentId: string, memory: Memory) => void;
    updateAgentMemory: (agentId: string, memory: Memory) => void;
    setMemoryEmbedding: (memoryId: string, embedding: number[]) => void;
    setAgentMemoryStream: (agentId: string, memoryStream: Memory[]) => void;
    loadSession: (sessionData: Partial<AppState>) => void;
    setAgentTask: (agentId: string, task: Agent['currentTask'], failureTimestamp?: number) => void;
    setInsightStatus: (agentId: string, status: boolean) => void;
    setChattingStatus: (agentIds: string[], status: boolean) => void;
    setAgentIsUsingObject: (agentId: string, status: boolean) => void;
    setEquippedArtifact: (artifactId: string | null) => void;
    addWorldArtifact: (artifact: WorldImageArtifact) => void;
    setWorldArtifacts: (artifacts: WorldImageArtifact[]) => void;
    updateRelationship: (agentA_Id: string, agentB_Id: string, change: number) => void;
    setAgentGreeting: (agentId: string, greeting: { text: string; timestamp: number } | null) => void;
    hydrateState: () => void;
}

// Create the Zustand store
export const useAppStore = createWithEqualityFn<AppState & AppActions>()(
  immer((set, get) => ({
    ...getMinimalInitialState(),

    // --- Actions ---
    hydrateState: () => {
        const initialState = getMinimalInitialState();
        set(state => {
            // Hydrate agents first
            const savedAgents = safeJsonParse('savedAgents', null);
            if (savedAgents && Array.isArray(savedAgents)) {
                // Ensure the default USER_AGENT is always present at the start of the array
                state.agents = [USER_AGENT, ...savedAgents];
            }

            // Hydrate all other state slices from localStorage, falling back to initial state
            state.inventory = safeJsonParse('inventory', initialState.inventory);
            state.worldArtifacts = safeJsonParse('worldArtifacts', initialState.worldArtifacts);
            state.messages = safeJsonParse<Message[]>('messages', initialState.messages);
            state.userProfile = safeJsonParse('userProfile', initialState.userProfile);

            Object.assign(state.audio, safeJsonParse('audioSettings', initialState.audio));
            Object.assign(state.services, safeJsonParse('serviceSettings', initialState.services));
            Object.assign(state.game, safeJsonParse('gameProgress', {}), safeJsonParse('gameplaySettings', {}));
            Object.assign(state.ui, safeJsonParse('uiSettings', {}));


            // Robustly merge saved player data into the agent list
            const playerAgentData = safeJsonParse('playerAgent', { name: USER_AGENT.name, spriteSeed: USER_AGENT.spriteSeed });
            const playerIndex = state.agents.findIndex(a => a.id === USER_AGENT.id);
            if (playerIndex !== -1) {
                state.agents[playerIndex] = { ...state.agents[playerIndex], ...playerAgentData };
            }

            // Unlock Architect if the flag is set in saved game progress
            const architectIndex = state.agents.findIndex(a => a.id === 'ARCHITECT1');
            if (architectIndex !== -1 && state.game.superAgentUnlocked) {
                state.agents[architectIndex].isLocked = false;
            }

            state.isLoading = false; // Mark hydration as complete
        });
    },
    setAgents: (newAgents) => set(state => { 
        state.agents = newAgents;
        const newAgentIds = new Set(newAgents.map(a => a.id));
        if (state.ui.selectedAgentId && !newAgentIds.has(state.ui.selectedAgentId)) state.ui.selectedAgentId = null;
        if (state.ui.targetAgentId && !newAgentIds.has(state.ui.targetAgentId)) state.ui.targetAgentId = null;
        if (state.ui.editingAgentId && !newAgentIds.has(state.ui.editingAgentId)) state.ui.editingAgentId = null;
    }),
    setMessages: (messages) => set({ messages }),
    addMessage: (message) => set(state => { state.messages.push(message) }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setCurrentSubtitle: (currentSubtitle) => set({ currentSubtitle }),
    setActiveParticipants: (activeParticipants) => set({ activeParticipants }),
    setUserProfile: (userProfile) => set(state => { state.userProfile = { ...state.userProfile, ...userProfile } }),
    setUiState: (uiState) => set(state => { 
        state.ui = { ...state.ui, ...uiState };
        state.ui.isAnyModalOpen = state.ui.isSettingsOpen || state.ui.isLogOpen || state.ui.isWelcomeModalOpen || state.ui.isAddAgentModalOpen || state.ui.isInventoryOpen || state.ui.isScreenplayModalOpen || state.ui.isSkynetTerminalOpen || state.ui.isDojoModalOpen || state.ui.isGameBoardModalOpen || !!state.ui.inspectorData || state.ui.isWorldArtifactModalOpen || state.ui.isSocialGraphModalOpen || state.ui.isObjectiveTrackerOpen || state.ui.isImageGenerationModalOpen || state.ui.isGroundingComputerModalOpen || state.ui.isVibeCodingModalOpen || !!state.ui.vibeCodingArtifactToPreview || state.ui.isModelComparisonModalOpen || state.ui.isMenuOpen;
    }),
    setGameState: (gameState) => set(state => { state.game = { ...state.game, ...gameState } }),
    setAudioState: (audioState) => set(state => { state.audio = { ...state.audio, ...audioState } }),
    setServiceState: (serviceState) => set(state => { state.services = { ...state.services, ...serviceState } }),
    addArtifact: (artifact) => set(state => { state.inventory.push(artifact) }),
    removeArtifact: (artifactId) => set(state => { state.inventory = state.inventory.filter(a => a.id !== artifactId) }),
    addMemory: (agentId, memory) => set(state => {
        const agent = state.agents.find(a => a.id === agentId);
        if (agent) agent.memoryStream.push(memory);
    }),
    updateAgentMemory: (agentId, memory) => set(state => {
        const agent = state.agents.find(a => a.id === agentId);
        if (agent) {
            const memIndex = agent.memoryStream.findIndex(m => m.id === memory.id);
            if (memIndex > -1) agent.memoryStream[memIndex] = memory;
        }
    }),
    setMemoryEmbedding: (memoryId, embedding) => set(state => { state.game.memoryEmbeddings[memoryId] = embedding }),
    setAgentMemoryStream: (agentId, memoryStream) => set(state => {
        const agent = state.agents.find(a => a.id === agentId);
        if (agent) agent.memoryStream = memoryStream;
    }),
    setAgentTask: (agentId, task, failureTimestamp) => set(state => {
        const agent = state.agents.find(a => a.id === agentId);
        if (agent) {
            agent.currentTask = task;
            if (task?.type === 'talk') agent.lastInteractionTimestamp = Date.now();
            if (failureTimestamp) agent.lastMovementFailureTimestamp = failureTimestamp;
        }
    }),
    setInsightStatus: (agentId, status) => set(state => {
        const agent = state.agents.find(a => a.id === agentId);
        if (agent) agent.hasNewInsight = status;
    }),
    setChattingStatus: (agentIds, status) => set(state => {
        state.agents.forEach(agent => {
            if (agentIds.includes(agent.id)) agent.isChatting = status;
        });
    }),
    setAgentIsUsingObject: (agentId, status) => set(state => {
        const agent = state.agents.find(a => a.id === agentId);
        if (agent) agent.isUsingObject = status;
    }),
    setEquippedArtifact: (artifactId) => set(state => { state.game.equippedArtifactId = artifactId }),
    addWorldArtifact: (artifact) => set(state => { state.worldArtifacts.push(artifact) }),
    setWorldArtifacts: (artifacts) => set({ worldArtifacts: artifacts }),
    updateRelationship: (agentA_Id: string, agentB_Id: string, change: number) => set(state => {
        const agentA = state.agents.find(a => a.id === agentA_Id);
        if (agentA) {
            if (!agentA.relationships) agentA.relationships = {};
            const oldScore = agentA.relationships[agentB_Id] || 0;
            agentA.relationships[agentB_Id] = Math.max(-100, Math.min(100, oldScore + change));
        }
        if (agentB_Id !== USER_AGENT.id) {
            const agentB = state.agents.find(a => a.id === agentB_Id);
            if (agentB) {
                if (!agentB.relationships) agentB.relationships = {};
                const oldScore = agentB.relationships[agentA_Id] || 0;
                agentB.relationships[agentA_Id] = Math.max(-100, Math.min(100, oldScore + change));
            }
        }
    }),
    setAgentGreeting: (agentId, greeting) => set(state => {
        const agent = state.agents.find(a => a.id === agentId);
        if (agent) {
            agent.greeting = greeting;
            agent.lastInteractionTimestamp = Date.now();
        }
    }),
    logApiUsage: (stats) => set(state => {
        const { usageStats } = state.game;
        switch (stats.type) {
            case 'llm': {
                const key = `${stats.provider}:${stats.model}`;
                if (!usageStats.llm[key]) usageStats.llm[key] = { prompt: 0, completion: 0, requests: 0 };
                usageStats.llm[key].prompt += stats.promptTokens || 0;
                usageStats.llm[key].completion += stats.completionTokens || 0;
                usageStats.llm[key].requests += 1;
                state.game.totalPromptTokens += stats.promptTokens || 0;
                state.game.totalCompletionTokens += stats.completionTokens || 0;
                break;
            }
            case 'image': {
                const key = `${stats.provider}:${stats.model}`;
                if (!usageStats.image[key]) usageStats.image[key] = { count: 0 };
                usageStats.image[key].count += 1;
                break;
            }
            case 'tts': {
                const key = stats.provider;
                if (!usageStats.tts[key]) usageStats.tts[key] = { characters: 0, requests: 0 };
                usageStats.tts[key].characters += stats.characters || 0;
                usageStats.tts[key].requests += 1;
                break;
            }
        }
    }),
    loadSession: (payload) => set(state => {
        const initialState = getMinimalInitialState();
        
        // Merge loaded state with default state to prevent errors on new versions
        const mergedState = {
            ...initialState,
            ...payload,
            ui: { ...initialState.ui, ...(payload.ui || {}), isWelcomeModalOpen: false, isAnyModalOpen: false },
            game: { ...initialState.game, ...(payload.game || {}) },
            audio: { ...initialState.audio, ...(payload.audio || {}) },
            services: { ...initialState.services, ...(payload.services || {}) },
        };

        // Mutate the draft state directly
        Object.assign(state, mergedState);
    })
  })),
  Object.is
);