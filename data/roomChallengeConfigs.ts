export type RoomChallengeConfig = {
    connectionText?: string;
    stageLabels?: string[];
    revisionTracking?: boolean;
};

export const ROOM_CHALLENGE_CONFIGS: Record<string, RoomChallengeConfig> = {
    office: {
        connectionText: 'This revision loop mirrors the Art Studio: generate, absorb critique, then tighten the prompt deliberately.',
        revisionTracking: true,
    },
    art_studio: {
        connectionText: 'What you learn here carries back into the Office and Dojo: precise constraints and intentional examples change the model output.',
        revisionTracking: true,
    },
    dojo: {
        connectionText: 'The instruction design you practiced here is the same skill you use when revising prompts in the Art Studio and Tech Office.',
    },
    classroom: {
        connectionText: 'Grounded explanation is the habit that makes your arguments stronger in the Philo Cafe and more defensible against Skynet.',
        revisionTracking: true,
    },
    philo_cafe: {
        connectionText: 'The structure you practice here also helps in Skynet\'s Lair: claims, reasons, and responses to objections.',
        stageLabels: ['Claim', 'Rebuttal', 'Defense'],
    },
    library: {
        connectionText: 'Interpretation here builds the same core skill as the Philo Cafe: make a claim, support it, and show why it matters.',
        stageLabels: ['Interpretation', 'Evidence', 'Analysis'],
    },
    lair: {
        connectionText: 'The logic that works here is stronger if you bring in the grounded evidence habits from the Classroom and the rebuttal habits from the Philo Cafe.',
        stageLabels: ['Thesis', 'Logic Chain', 'Final Defense'],
    },
};

export const getRoomChallengeConfig = (roomId: string) => ROOM_CHALLENGE_CONFIGS[roomId];
