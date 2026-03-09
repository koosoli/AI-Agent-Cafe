export type RoomRubric = Record<string, number>;

export type ValidatedRoomResult = {
    mastered?: boolean;
    feedback?: string;
    next_step?: string;
    score?: number;
    rubric?: RoomRubric;
    stage?: number;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const normalizeOptionalString = (value: unknown) => (
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
);

const normalizeOptionalInteger = (value: unknown, min: number, max: number) => (
    Number.isInteger(value) && typeof value === 'number' && value >= min && value <= max ? value : undefined
);

const normalizeRubric = (value: unknown): RoomRubric | undefined => {
    if (!isPlainObject(value)) return undefined;

    const entries = Object.entries(value)
        .filter(([key, score]) => key.trim().length > 0 && Number.isInteger(score) && typeof score === 'number' && score >= 0 && score <= 5);

    if (entries.length === 0) return undefined;

    return Object.fromEntries(entries) as RoomRubric;
};

export const validateRoomResultPayload = (value: unknown): ValidatedRoomResult | null => {
    if (!isPlainObject(value)) return null;

    const mastered = typeof value.mastered === 'boolean' ? value.mastered : undefined;
    const feedback = normalizeOptionalString(value.feedback);
    const next_step = normalizeOptionalString(value.next_step);
    const score = normalizeOptionalInteger(value.score, 0, 10);
    const rubric = normalizeRubric(value.rubric);
    const stage = normalizeOptionalInteger(value.stage, 0, 2);

    return { mastered, feedback, next_step, score, rubric, stage };
};
