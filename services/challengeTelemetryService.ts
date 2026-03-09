type RoomTelemetry = {
    masteries: number;
    coachDebriefs: number;
    rubricPayloads: number;
    rubricParseFailures: number;
    revisionsBeforeMastery: number[];
};

type ChallengeTelemetry = {
    invalidRoomResultCount: number;
    roomStats: Record<string, RoomTelemetry>;
};

const STORAGE_KEY = 'challengeTelemetry';

const emptyRoomTelemetry = (): RoomTelemetry => ({
    masteries: 0,
    coachDebriefs: 0,
    rubricPayloads: 0,
    rubricParseFailures: 0,
    revisionsBeforeMastery: [],
});

const emptyTelemetry = (): ChallengeTelemetry => ({
    invalidRoomResultCount: 0,
    roomStats: {},
});

const readTelemetry = (): ChallengeTelemetry => {
    if (typeof window === 'undefined' || !window.localStorage) return emptyTelemetry();

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyTelemetry();
        const parsed = JSON.parse(raw) as ChallengeTelemetry;
        return {
            invalidRoomResultCount: parsed.invalidRoomResultCount || 0,
            roomStats: parsed.roomStats || {},
        };
    } catch {
        return emptyTelemetry();
    }
};

const writeTelemetry = (telemetry: ChallengeTelemetry) => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(telemetry));
};

const updateTelemetry = (updater: (current: ChallengeTelemetry) => ChallengeTelemetry) => {
    const next = updater(readTelemetry());
    writeTelemetry(next);
};

export const trackRoomResultParseFailure = () => {
    updateTelemetry(current => ({
        ...current,
        invalidRoomResultCount: current.invalidRoomResultCount + 1,
    }));
};

export const trackChallengeResolution = (
    roomId: string,
    options: {
        mastered: boolean;
        hadRubricPayload: boolean;
        rubricParsed: boolean;
        revisionsBeforeMastery: number;
    },
) => {
    updateTelemetry(current => {
        const roomStats = current.roomStats[roomId] || emptyRoomTelemetry();
        const nextRoomStats: RoomTelemetry = {
            ...roomStats,
            masteries: roomStats.masteries + (options.mastered ? 1 : 0),
            coachDebriefs: roomStats.coachDebriefs + (options.mastered ? 0 : 1),
            rubricPayloads: roomStats.rubricPayloads + (options.hadRubricPayload ? 1 : 0),
            rubricParseFailures: roomStats.rubricParseFailures + (options.hadRubricPayload && !options.rubricParsed ? 1 : 0),
            revisionsBeforeMastery: options.mastered
                ? [...roomStats.revisionsBeforeMastery, options.revisionsBeforeMastery]
                : roomStats.revisionsBeforeMastery,
        };

        return {
            ...current,
            roomStats: {
                ...current.roomStats,
                [roomId]: nextRoomStats,
            },
        };
    });
};

export const getChallengeTelemetrySnapshot = () => readTelemetry();
