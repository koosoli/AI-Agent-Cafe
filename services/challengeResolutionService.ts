import { ROOMS } from '../data/rooms.ts';
import type { AppState, LearningDebrief } from '../types.ts';
import { trackChallengeResolution } from './challengeTelemetryService.ts';
import { getChallengeAttemptCount } from './challengeStateService.ts';
import { createCoachDebrief, createSystemDebrief, getRoomConnectionText } from './learningGuidanceService.ts';
import { extractMasterySignal, type MasterySignal } from './masteryService.ts';

type ChallengeResolutionOptions = {
    state: Pick<AppState, 'agents' | 'messages' | 'game'>;
    roomId: string;
    agentName: string;
    rawText: string;
    userText?: string;
    masteryTitle?: string;
    masteryFallbackFeedback?: string;
    masteryFallbackNextStep?: string;
};

export type ChallengeResolution = {
    signal: MasterySignal;
    cleanedText: string;
    mastered: boolean;
    learningDebrief: LearningDebrief;
};

export const resolveChallengeResponse = ({
    state,
    roomId,
    agentName,
    rawText,
    userText,
    masteryTitle,
    masteryFallbackFeedback,
    masteryFallbackNextStep,
}: ChallengeResolutionOptions): ChallengeResolution => {
    const signal = extractMasterySignal(rawText);
    const connectionText = getRoomConnectionText(roomId);

    const baseDebrief = signal.mastered
        ? createSystemDebrief(
            roomId,
            'mastered',
            masteryTitle || `${ROOMS[roomId]?.name || 'Room'} Review`,
            signal.feedback || masteryFallbackFeedback || `You cleared this lesson in ${ROOMS[roomId]?.name || 'this room'}.`,
            signal.nextStep || masteryFallbackNextStep || connectionText || 'Open the tracker, review the lesson, and move on to a new room.',
        )
        : createCoachDebrief(state, roomId, agentName, userText, signal.cleanedText);
    const learningDebrief = {
        ...baseDebrief,
        lesson: !signal.mastered && signal.feedback ? signal.feedback : baseDebrief.lesson,
        nextStep: signal.nextStep || baseDebrief.nextStep,
        score: signal.score,
        rubric: signal.rubric,
    };
    trackChallengeResolution(roomId, {
        mastered: signal.mastered,
        hadRubricPayload: rawText.includes('"rubric"'),
        rubricParsed: Boolean(signal.rubric),
        revisionsBeforeMastery: getChallengeAttemptCount(state, roomId),
    });

    return {
        signal,
        cleanedText: signal.cleanedText,
        mastered: signal.mastered,
        learningDebrief,
    };
};
