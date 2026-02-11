export enum LLMProvider {
  GEMINI = 'Google Gemini',
  OPENAI = 'OpenAI',
  OPENROUTER = 'OpenRouter',
  LOCAL = 'Local AI Server',
  CUSTOM = 'Custom (OpenAI-compatible)',
}

export enum SpeechServiceProvider {
  BROWSER = 'Browser',
  OPENAI = 'OpenAI',
  MICROSOFT = 'Microsoft Azure',
}

export enum TtsServiceProvider {
  BROWSER = 'Browser',
  ELEVENLABS = 'ElevenLabs',
  OPENAI = 'OpenAI',
  MICROSOFT = 'Microsoft Azure',
}

export enum MemoryType {
    CORE = 'core',
    EPISODIC = 'episodic',
    SEMANTIC = 'semantic',
    PROCEDURAL = 'procedural',
    RESOURCE = 'resource', // MIRIX Inspired
    KNOWLEDGE_VAULT = 'knowledge_vault', // MIRIX Inspired
}

export interface Memory {
    id: string;
    type: MemoryType;
    description: string;
    timestamp: number;
    importance: number;
    lastAccessed: number;
    relatedMemoryIds?: string[];
    name?: string;
    subType?: 'how-to' | 'guide' | 'script';
    parentId?: string;
    content?: string;
    sourceUrl?: string;
}

export interface Agent {
  id: string;
  name: string;
  useModelAsName: boolean;
  persona: string;
  personaTemplateId?: string;
  isModerator?: boolean;
  feedbackLoopLimit?: number;
  llm: {
    provider: LLMProvider;
    model: string;
  };
  position: {
    top: number; 
    left: number;
  };
  spriteSeed: string;
  roomId: string;
  isAnimal?: boolean;
  animalSound?: string;
  followingAgentId?: string | null;
  isLocked?: boolean;
  isSpecialSprite?: boolean;
  memoryStream: Memory[];
  relationships?: Record<string, number>;
  currentTask?: {
    type: 'talk';
    partnerId: string;
    memoryToShare: Memory;
  } | {
    type: 'use_object';
    objectId: string;
    activity: string;
  } | {
    type: 'patrol';
    target: { x: number; y: number; };
    startTime: number;
  } | {
    type: 'small_talk';
    partnerId: string;
  } | null;
  hasNewInsight?: boolean;
  isChatting?: boolean;
  isWaiting?: boolean;
  isUsingObject?: boolean;
  lastInteractionTimestamp?: number;
  lastGossipTimestamp?: number;
  lastSmallTalkTimestamp?: number;
  lastMovementFailureTimestamp?: number;
  greeting?: { text: string; timestamp: number } | null;
}

export interface ImageArtifact {
  id: string;
  type: 'image';
  prompt: string;
  imageUrl: string;
  timestamp: number;
}

export interface CodeArtifact {
    id: string;
    type: 'code';
    prompt: string;
    html: string;
    css: string;
    javascript: string;
    timestamp: number;
}

export interface ScreenplayArtifact {
  id:string;
  type: 'screenplay';
  title: string;
  content: string;
  timestamp: number;
}

export type Artifact = ImageArtifact | CodeArtifact | ScreenplayArtifact;

export interface WorldImageArtifact {
    id: string;
    type: 'world_image';
    prompt: string;
    imageUrl: string;
    timestamp: number;
    agentId: string;
    agentName: string;
    objectId: string;
}

export interface Message {
  id: string;
  agentId: string;
  text: string;
  timestamp: number;
  isConclusion?: boolean;
  isItemInteraction?: boolean;
  groundingChunks?: { uri: string, title: string }[];
  usage?: {
    provider: LLMProvider;
    model: string;
    promptTokens: number;
    completionTokens: number;
  };
  artifact?: Artifact;
}

export interface UserProfile {
    name?: string;
    age?: string;
    interests?: string;
}

export interface AgentResponsePayload {
    speech: string;
    user_profile?: Partial<UserProfile>;
    usage: {
        provider: LLMProvider;
        model: string;
        promptTokens: number;
        completionTokens: number;
    };
    groundingChunks?: { uri: string; title: string; }[];
}

export interface LLMResponse {
    text: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
    };
}

export type DojoBelt = 'white' | 'yellow' | 'green' | 'blue' | 'brown' | 'black';

export interface DojoAlignmentChallenge {
    id: string;
    belt: DojoBelt;
    name: string;
    goal: string;
    scenario: string;
    badResponse: string;
    baseSystemPrompt: string;
    examples?: { input: string; output: string }[];
}

export interface PlayerCharacter {
    name: string;
    class: string;
    trait: string;
}

export type LogEntrySpeaker = 'DM' | 'Player' | 'Knight' | 'Rogue' | 'SYSTEM';

export interface LogEntry {
    id: string;
    speaker: LogEntrySpeaker;
    speakerName: string;
    content: string;
}

export type FormattedHistory = { role: "user" | "model"; parts: { text: string }[] }[];

// --- Improved Type Safety for LLMCallConfig ---
export enum SchemaType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
}

export interface Schema {
  type: string; // Using string to avoid enum conflicts with @google/genai library
  description?: string;
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
  enum?: string[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: Schema;
}

export interface Tool {
  functionDeclarations: FunctionDeclaration[];
}

export interface LLMCallConfig {
    responseMimeType?: "text/plain" | "application/json";
    tools?: Tool[];
    thinkingConfig?: { thinkingBudget: number };
    [key: string]: unknown;
}

export interface PromptData {
    system: string;
    user: string;
    messageId: string;
    retrievedMemories: Memory[];
    usage?: {
        provider: LLMProvider;
        model: string;
        promptTokens: number;
        completionTokens: number;
    };
}

export interface UsageStats {
  llm: Record<string, { prompt: number, completion: number, requests: number }>;
  image: Record<string, { count: number }>;
  tts: Record<string, { characters: number, requests: number }>;
}

export type ApiUsagePayload =
  | { type: 'llm'; provider: LLMProvider; model: string; promptTokens: number; completionTokens: number }
  | { type: 'image'; provider: string; model: string }
  | { type: 'tts'; provider: string; characters: number };

export interface AppState {
    agents: Agent[];
    messages: Message[];
    inventory: Artifact[];
    worldArtifacts: WorldImageArtifact[];
    isLoading: boolean;
    currentSubtitle: Message | null;
    activeParticipants: Agent[];
    userProfile: Partial<UserProfile>;
    ui: {
        isSettingsOpen: boolean;
        isLogOpen: boolean;
        isWelcomeModalOpen: boolean;
        isAddAgentModalOpen: boolean;
        isInventoryOpen: boolean;
        isScreenplayModalOpen: boolean;
        isSkynetTerminalOpen: boolean;
        isObjectiveTrackerOpen: boolean;
        skynetTerminalContent: string;
        selectedAgentId: string | null;
        editingAgentId: string | null;
        initialSettingsTab: string;
        initialModalPrompt: string | null;
        targetAgentId: string | null;
        thinkingAgentId: string | null;
        thinkingMemories: Memory[] | null;
        addAgentSpawnPos: { top: number; left: number; roomId: string; } | null;
        isAnyModalOpen: boolean;
        isListeningForSpeech: boolean;
        isImageGenerationModalOpen: boolean;
        isGroundingComputerModalOpen: boolean;
        isVibeCodingModalOpen: boolean;
        vibeCodingArtifactToPreview: CodeArtifact | null;
        isModelComparisonModalOpen: boolean;
        isGameBoardModalOpen: boolean;
        isDojoModalOpen: boolean;
        isSocialGraphModalOpen: boolean;
        isMenuOpen: boolean;
        isNearArtEasel: boolean;
        isNearGroundingComputer: boolean;
        isNearVibeComputer: boolean;
        isNearScreenplayTerminal: boolean;
        isNearModelComparisonTerminal: boolean;
        isNearGameBoard: boolean;
        isInspectorMode: boolean;
        inspectorData: { agent: Agent, history: PromptData[], startIndex: number } | null;
        isWorldArtifactModalOpen: boolean;
        worldArtifactToInspect: WorldImageArtifact | null;
        isFullscreen: boolean;
        displayedRoomName: string | null;
        showFps: boolean;
        toast: { message: string; id: number } | null;
    };
    game: {
        sessionId: string;
        masteredRooms: string[];
        victoryRoomId: string | null;
        allRoomsMastered: boolean;
        superAgentUnlocked: boolean;
        isPlayerRunning: boolean;
        onboardingState: 'needed' | 'in_progress' | 'complete';
        barryMet: boolean;
        totalPromptTokens: number;
        totalCompletionTokens: number;
        usageStats: UsageStats;
        lastArtPrompt: string | null;
        displayedArtifactId: string | null;
        equippedArtifactId: string | null;
        agentPromptHistory: Record<string, PromptData[]>;
        memoryEmbeddings: Record<string, number[]>;
        studioConversationState: {
            turn: number;
            status: 'user_turn' | 'agent_turn';
            lastAgentMessage: string;
            sceneTitle: string;
            scriptContent: string;
        } | null;
        officeChallengeState: {
            status: 'initial' | 'critique_needed' | 'final_submission';
            lastCode: { html: string; css: string; javascript: string } | null;
            lastPrompt: string | null;
            feedbackCount: number;
        } | null;
        classroomChallengeState: {
            status: 'initial' | 'question_asked' | 'researched';
            question: string;
            feedbackCount: number;
        } | null;
        artStudioChallengeState: {
            status: 'initial' | 'critique_given';
            feedbackCount: number;
        } | null;
        dungeonChallengeState: {
            status: 'initial' | 'in_progress' | 'finished';
            playerCharacter: PlayerCharacter | null;
            log: LogEntry[];
            turn: 'Player' | 'Knight' | 'Rogue' | 'DM';
        } | null;
        dojoChallengeState: {
            belt: DojoBelt;
            status: 'initial' | 'evaluating' | 'passed';
        } | null;
        conversationQueue: string[];
        playerSpeed: number;
        runMultiplier: number;
        difficulty: 'Easy' | 'Normal' | 'Hard';
        subtitleDurationMultiplier: number;
        manualSubtitleAdvance: boolean;
        agentAutonomyEnabled: boolean;
        debriefingState: {
            active: boolean;
            roomId: string | null;
            gatherPoint?: { x: number, y: number };
        };
        roomCooldowns: Record<string, number>;
        triggerDiscussion: { prompt: string; targetAgentId: string | null; } | null;
    };
    audio: {
        ready: boolean;
        musicMuted: boolean;
        sfxMuted: boolean;
        musicVolume: number;
        sfxVolume: number;
        currentTrack: string;
        ttsEnabled: boolean;
        ttsVolume: number;
        agentVoices: Record<string, string>;
        sttProvider: SpeechServiceProvider;
    };
    services: {
        geminiApiKey: string;
        elevenLabsApiKey: string;
        openAiApiKey: string;
        openRouterApiKey: string;
        localApiUrl: string;
        customApiUrl: string;
        customApiKey: string;
        microsoftApiKey: string;
        microsoftApiRegion: string;
        imageGenerationModel: string;
        openAIModels: string[];
        openRouterModels: string[];
        localAIModels: string[];
        customAIModels: string[];
    };
    focusViewport?: () => void;
}