type RoomResultPayload = {
    mastered?: boolean;
    feedback?: string;
    next_step?: string;
};

export type MasterySignal = {
    cleanedText: string;
    mastered: boolean;
    feedback?: string;
    nextStep?: string;
};

const RESULT_TAG_REGEX = /<room_result>([\s\S]*?)<\/room_result>/i;
const LEGACY_WIN_TOKEN = '_PLAYER_WINS_CHALLENGE_';

export const extractMasterySignal = (rawText: string): MasterySignal => {
    let cleanedText = rawText || '';
    let mastered = false;
    let feedback: string | undefined;
    let nextStep: string | undefined;

    const resultTagMatch = cleanedText.match(RESULT_TAG_REGEX);
    if (resultTagMatch?.[1]) {
        try {
            const parsed = JSON.parse(resultTagMatch[1]) as RoomResultPayload;
            mastered = Boolean(parsed.mastered);
            feedback = parsed.feedback;
            nextStep = parsed.next_step;
        } catch (error) {
            console.warn('Could not parse <room_result> payload.', error);
        }
        cleanedText = cleanedText.replace(resultTagMatch[0], '').trim();
    }

    if (cleanedText.includes(LEGACY_WIN_TOKEN)) {
        mastered = true;
        cleanedText = cleanedText.replace(LEGACY_WIN_TOKEN, '').trim();
    }

    return { cleanedText, mastered, feedback, nextStep };
};
