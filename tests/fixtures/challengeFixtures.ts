import type { AppState, Agent, Message } from '../../types.ts';
import { LLMProvider, MemoryType } from '../../types.ts';

const createAgent = (id: string, name: string, roomId: string, overrides: Partial<Agent> = {}): Agent => ({
    id,
    name,
    useModelAsName: false,
    persona: `${name} persona`,
    isModerator: false,
    llm: {
        provider: LLMProvider.GEMINI,
        model: 'gemini-2.5-flash',
    },
    position: { top: 0, left: 0 },
    spriteSeed: `${id}-sprite`,
    roomId,
    memoryStream: [{
        id: `${id}-core`,
        type: MemoryType.CORE,
        description: `${name} core identity`,
        timestamp: 0,
        importance: 10,
        lastAccessed: 0,
    }],
    ...overrides,
});

export const challengeFixtureAgents: Agent[] = [
    createAgent('TUTOR1', 'Tutorial Agent', 'cafe', { isModerator: true }),
    createAgent('AK', 'Barry', 'cafe'),
    createAgent('UIUX1', 'UI/UX Designer', 'office', { isModerator: true }),
    createAgent('DIRECTOR1', 'Visionary Director', 'studio', { isModerator: true }),
    createAgent('LEO1', 'Leonardo da Vinci', 'art_studio', { isModerator: true }),
    createAgent('NORA1', 'Nora', 'philo_cafe', { isModerator: true }),
    createAgent('SHAKES1', 'William Shakespeare', 'library', { isModerator: true }),
    createAgent('DOJO1', 'Dojo Sensei', 'dojo', { isModerator: true }),
    createAgent('DM1', 'Dungeon Master', 'dungeon', { isModerator: true }),
    createAgent('KNIGHT1', 'Sir Kaelan', 'dungeon'),
    createAgent('ROGUE1', 'Vexia', 'dungeon'),
    createAgent('TEACH1', 'Experienced Teacher', 'classroom', { isModerator: true }),
    createAgent('SKYNET1', 'Skynet', 'lair', { isModerator: true }),
];

type FixtureStateOverrides = {
    agents?: Agent[];
    messages?: Message[];
    game?: Partial<AppState['game']>;
};

export const createFixtureState = (overrides: FixtureStateOverrides = {}): Pick<AppState, 'agents' | 'messages' | 'game'> => ({
    agents: challengeFixtureAgents,
    messages: [],
    game: {
        sessionId: 'fixture-session',
        masteredRooms: [],
        victoryRoomId: null,
        allRoomsMastered: false,
        superAgentUnlocked: false,
        isPlayerRunning: false,
        onboardingState: 'needed',
        barryMet: false,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        usageStats: { llm: {}, image: {}, tts: {} },
        lastArtPrompt: null,
        displayedArtifactId: null,
        equippedArtifactId: null,
        agentPromptHistory: {},
        memoryEmbeddings: {},
        studioConversationState: null,
        officeChallengeState: null,
        classroomChallengeState: null,
        artStudioChallengeState: null,
        dungeonChallengeState: null,
        dojoChallengeState: null,
        roomChallengeProgress: {},
        conversationQueue: [],
        playerSpeed: 0,
        runMultiplier: 0,
        difficulty: 'Normal',
        subtitleDurationMultiplier: 1,
        manualSubtitleAdvance: false,
        agentAutonomyEnabled: false,
        debriefingState: { active: false, roomId: null },
        roomCooldowns: {},
        triggerDiscussion: null,
        ...(overrides.game || {}),
    },
    ...(overrides.agents ? { agents: overrides.agents } : {}),
    ...(overrides.messages ? { messages: overrides.messages } : {}),
});

export const createRoomMessage = (agentId: string, text = 'hello', timestamp = 1): Message => ({
    id: `${agentId}-${timestamp}`,
    agentId,
    text,
    timestamp,
});

export const roomResultFixtures = {
    legacyWinOnly: 'Well done. _PLAYER_WINS_CHALLENGE_',
    structuredWinOnly: 'Strong revision. <room_result>{"mastered":true,"feedback":"You addressed the critique.","next_step":"Try a harder room."}</room_result>',
    mixedLegacyAndStructured: 'Excellent. _PLAYER_WINS_CHALLENGE_ <room_result>{"mastered":true,"feedback":"Clear and grounded.","next_step":"Push the argument further."}</room_result>',
    malformedStructured: 'Hmm. <room_result>{"mastered":true,"feedback":"broken"</room_result>',
    plainTextOnly: 'Keep going. Your answer needs more specificity.',
} as const;
