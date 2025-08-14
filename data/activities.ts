// This file maps agent IDs to their preferred interactive objects in the world.
// This drives the autonomous agent behavior system.

export const AGENT_ACTIVITY_PREFERENCES: Record<string, { objectId: string, activity: string }> = {
    // Artists go to the easel
    'DAVINCI1': { objectId: 'ART_EASEL', activity: 'painting' },
    'VANGOGH1': { objectId: 'ART_EASEL', activity: 'painting' },
    'DALI1':    { objectId: 'ART_EASEL', activity: 'painting' },

    // Coders go to the vibe computer
    'FC1':   { objectId: 'VIBE_COMPUTER', activity: 'coding' },
    'BC1':   { objectId: 'VIBE_COMPUTER', activity: 'coding' },
    'UIUX1': { objectId: 'MODEL_COMPARISON_TERMINAL', activity: 'coding' },

    // Writers go to the screenplay terminal
    'VD1':   { objectId: 'SCREENPLAY_TERMINAL', activity: 'writing' },
    'LW1':   { objectId: 'SCREENPLAY_TERMINAL', activity: 'writing' },
    'PROD1': { objectId: 'SCREENPLAY_TERMINAL', activity: 'writing' },
    'SD1':   { objectId: 'SCREENPLAY_TERMINAL', activity: 'writing' },

    // D&D players go to the game board
    'DM1':     { objectId: 'GAME_BOARD', activity: 'dnd' },
    'KNIGHT1': { objectId: 'GAME_BOARD', activity: 'dnd' },
    'ROGUE1':  { objectId: 'GAME_BOARD', activity: 'dnd' },
    
    // Teacher goes to the grounding computer (for research)
    'TEACH1': { objectId: 'GROUNDING_COMPUTER', activity: 'research' }
};
