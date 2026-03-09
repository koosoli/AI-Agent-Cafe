import type { RoomRubric } from './masterySchema.ts';
import { trackRoomResultParseFailure } from './challengeTelemetryService.ts';
import { validateRoomResultPayload } from './masterySchema.ts';

export type MasterySignal = {
    cleanedText: string;
    mastered: boolean;
    feedback?: string;
    nextStep?: string;
    score?: number;
    rubric?: RoomRubric;
    stage?: number;
};

const RESULT_TAG_REGEX = /<room_result>([\s\S]*?)<\/room_result>/i;
const LEGACY_WIN_TOKEN = '_PLAYER_WINS_CHALLENGE_';

export const extractMasterySignal = (rawText: string): MasterySignal => {
    let cleanedText = rawText || '';
    let mastered = false;
    let feedback: string | undefined;
    let nextStep: string | undefined;
    let score: number | undefined;
    let rubric: RoomRubric | undefined;
    let stage: number | undefined;

    const resultTagMatch = cleanedText.match(RESULT_TAG_REGEX);
    if (resultTagMatch?.[1]) {
        try {
            const parsed = validateRoomResultPayload(JSON.parse(resultTagMatch[1]));
            if (parsed) {
                mastered = Boolean(parsed.mastered);
                feedback = parsed.feedback;
                nextStep = parsed.next_step;
                score = parsed.score;
                rubric = parsed.rubric;
                stage = parsed.stage;
            }
        } catch (error) {
            trackRoomResultParseFailure();
            console.warn('Could not parse <room_result> payload.', error);
        }
        cleanedText = cleanedText.replace(resultTagMatch[0], '').trim();
    }

    if (cleanedText.includes(LEGACY_WIN_TOKEN)) {
        mastered = true;
        cleanedText = cleanedText.replace(LEGACY_WIN_TOKEN, '').trim();
    }

    return { cleanedText, mastered, feedback, nextStep, score, rubric, stage };
};
