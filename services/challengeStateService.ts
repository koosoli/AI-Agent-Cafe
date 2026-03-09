import type { AppState } from '../types.ts';

const STAGED_ROOMS = new Set(['philo_cafe', 'library', 'lair']);

export type NormalizedChallengeSnapshot = {
    status: string | null;
    attemptCount: number;
    stage: number;
};

const getRoomAgentIds = (state: Pick<AppState, 'agents'>, roomId: string) => (
    new Set(state.agents.filter(agent => agent.roomId === roomId).map(agent => agent.id))
);

const hasRoomConversation = (state: Pick<AppState, 'agents' | 'messages'>, roomId: string) => {
    const roomAgentIds = getRoomAgentIds(state, roomId);
    if (roomAgentIds.size === 0) return false;
    return state.messages.some(message => roomAgentIds.has(message.agentId));
};

const normalizeStage = (value: number | undefined) => (
    Number.isInteger(value) && typeof value === 'number' && value >= 0 && value <= 2 ? value : 0
);

const getPersistedStage = (state: Pick<AppState, 'game'>, roomId: string) => (
    normalizeStage(state.game.roomChallengeProgress[roomId]?.stage)
);

export const sanitizeRoomChallengeProgress = (state: Pick<AppState, 'agents' | 'messages' | 'game'>) => (
    Object.fromEntries(
        Object.entries(state.game.roomChallengeProgress).flatMap(([roomId, progress]) => {
            if (!STAGED_ROOMS.has(roomId)) return [];

            const stage = normalizeStage(progress?.stage);
            if (stage <= 0) return [];
            if (!hasRoomConversation(state, roomId)) return [];

            return [[roomId, { stage }]];
        }),
    ) as AppState['game']['roomChallengeProgress']
);

export const getChallengeSnapshot = (state: Pick<AppState, 'agents' | 'messages' | 'game'>, roomId: string): NormalizedChallengeSnapshot => {
    switch (roomId) {
        case 'office':
            return {
                status: state.game.officeChallengeState?.status || null,
                attemptCount: state.game.officeChallengeState?.feedbackCount || 0,
                stage: 0,
            };
        case 'art_studio':
            return {
                status: state.game.artStudioChallengeState?.status || null,
                attemptCount: state.game.artStudioChallengeState?.feedbackCount || 0,
                stage: 0,
            };
        case 'classroom':
            return {
                status: state.game.classroomChallengeState?.status || null,
                attemptCount: state.game.classroomChallengeState?.feedbackCount || 0,
                stage: 0,
            };
        case 'dojo':
            return {
                status: state.game.dojoChallengeState?.status || null,
                attemptCount: 0,
                stage: 0,
            };
        case 'dungeon':
            return {
                status: state.game.dungeonChallengeState?.status || null,
                attemptCount: state.game.dungeonChallengeState?.log.filter(entry => entry.speaker === 'Player').length || 0,
                stage: 0,
            };
        default:
            return {
                status: null,
                attemptCount: 0,
                stage: STAGED_ROOMS.has(roomId) && hasRoomConversation(state, roomId) ? getPersistedStage(state, roomId) : 0,
            };
    }
};

export const getChallengeAttemptCount = (state: Pick<AppState, 'agents' | 'messages' | 'game'>, roomId: string) => (
    getChallengeSnapshot(state, roomId).attemptCount
);

export const getChallengeStage = (state: Pick<AppState, 'agents' | 'messages' | 'game'>, roomId: string) => (
    getChallengeSnapshot(state, roomId).stage
);
