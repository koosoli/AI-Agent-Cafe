

export interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type Door = { x: number, y: number, side: 'top' | 'bottom' };

export const ZONES: Record<string, Rect> = {
  // Repositioned and resized for the new world
  cafe:       { x1: 200, y1: 1000, x2: 900, y2: 1600 },
  office:     { x1: 2100, y1: 1000, x2: 2800, y2: 1600 },
  studio:     { x1: 200, y1: 1900, x2: 900, y2: 2500 },
  art_studio: { x1: 1150, y1: 1900, x2: 1850, y2: 2500 },
  philo_cafe: { x1: 2100, y1: 1900, x2: 2800, y2: 2500 },
  
  library:    { x1: 200, y1: 250, x2: 900, y2: 850 },
  dojo:       { x1: 2100, y1: 300, x2: 2800, y2: 800 },
  
  dungeon:    { x1: 3100, y1: 1200, x2: 3800, y2: 1800 },
  classroom:  { x1: 3100, y1: 300, x2: 3800, y2: 800 },
  lair:       { x1: 3100, y1: 2000, x2: 3800, y2: 2600 },
  
  trash:      { x1: 4300, y1: 2700, x2: 4700, y2: 2850 },
};

export const INTERACTIVE_OBJECTS = {
    PLAYER_EASEL: { id: 'PLAYER_EASEL', name: 'Art Easel', left: 1475, top: 2250, width: 75, height: 150, roomId: 'art_studio' },
    AGENT_EASEL_1: { id: 'AGENT_EASEL_1', name: 'Artwork', left: 1200, top: 2200, width: 75, height: 150, roomId: 'art_studio' },
    AGENT_EASEL_2: { id: 'AGENT_EASEL_2', name: 'Artwork', left: 1725, top: 2200, width: 75, height: 150, roomId: 'art_studio' },
    AGENT_EASEL_3: { id: 'AGENT_EASEL_3', name: 'Artwork', left: 1525, top: 2100, width: 75, height: 150, roomId: 'art_studio' },
    GROUNDING_COMPUTER: { id: 'GROUNDING_COMPUTER', name: 'Grounding Terminal', left: 3450, top: 550, width: 50, height: 70, roomId: 'classroom' },
    VIBE_COMPUTER: { id: 'VIBE_COMPUTER', name: 'Vibe-Coding Terminal', left: 2260, top: 1080, width: 50, height: 70, roomId: 'office' },
    MODEL_COMPARISON_TERMINAL: { id: 'MODEL_COMPARISON_TERMINAL', name: 'Model Comparison Terminal', left: 2175, top: 1400, width: 50, height: 70, roomId: 'office' },
    SCREENPLAY_TERMINAL: { id: 'SCREENPLAY_TERMINAL', name: 'Typewriter', left: 525, top: 2030, width: 50, height: 70, roomId: 'studio' },
    GAME_BOARD: { id: 'GAME_BOARD', name: 'D&D Game Board', left: 3425, top: 1475, width: 50, height: 50, roomId: 'dungeon' },
};


export const DOOR_POSITIONS: Record<string, Door[]> = {
    dojo:       [ { x: 2450, y: ZONES.dojo.y2 - 50, side: 'bottom' }, { x: 2450, y: ZONES.dojo.y1, side: 'top' } ],
    cafe:       [ { x: 550, y: ZONES.cafe.y1, side: 'top' }, { x: 550, y: ZONES.cafe.y2 - 50, side: 'bottom' } ],
    library:    [ { x: 550, y: ZONES.library.y2 - 50, side: 'bottom' }, { x: 550, y: ZONES.library.y1, side: 'top' } ],
    office:     [ { x: 2450, y: ZONES.office.y1, side: 'top' }, { x: 2450, y: ZONES.office.y2 - 50, side: 'bottom' } ],
    studio:     [ { x: 550, y: ZONES.studio.y2 - 50, side: 'bottom' }, { x: 550, y: ZONES.studio.y1, side: 'top' } ],
    art_studio: [ { x: 1500, y: ZONES.art_studio.y1, side: 'top' }, { x: 1500, y: ZONES.art_studio.y2 - 50, side: 'bottom' } ],
    philo_cafe: [ { x: 2450, y: ZONES.philo_cafe.y2 - 50, side: 'bottom' }, { x: 2450, y: ZONES.philo_cafe.y1, side: 'top' } ],
    dungeon:    [ { x: 3415, y: ZONES.dungeon.y2 - 50, side: 'bottom' } ],
    classroom:  [ { x: 3415, y: ZONES.classroom.y1, side: 'top' }, { x: 3415, y: ZONES.classroom.y2 - 50, side: 'bottom' } ],
    lair:       [ { x: 3415, y: ZONES.lair.y1, side: 'top' } ],
};

export const OTHER_OBSTACLES: Rect[] = [
    // --- World Borders (impassable) ---
    { x1: 0, y1: 0, x2: 5000, y2: 10 }, 
    { x1: 0, y1: 2990, x2: 5000, y2: 3000 },
    { x1: 0, y1: 0, x2: 10, y2: 3000 },
    { x1: 4990, y1: 0, x2: 5000, y2: 3000 },
    
    // --- Decorations ---
    { x1: 1450, y1: 1325, x2: 1550, y2: 1425 }, // Fountain
    { x1: 1320, y1: 1100, x2: 1420, y2: 1124 }, // Bench NW of plaza
    { x1: 1580, y1: 1100, x2: 1680, y2: 1124 }, // Bench NE of plaza
    { x1: 1320, y1: 1600, x2: 1420, y2: 1624 }, // Bench SW of plaza
    { x1: 1580, y1: 1600, x2: 1680, y2: 1624 }, // Bench SE of plaza

    // Zen Garden
    { x1: 1300, y1: 500, x2: 1700, y2: 700 }, // Pond
    { x1: 1200, y1: 400, x2: 1230, y2: 450 }, // Stone Lantern 1
    { x1: 1750, y1: 600, x2: 1780, y2: 650 }, // Stone Lantern 2

    // --- Interior Furniture ---
    // Prompting Dojo (2100, 300, 2800, 800)
    { x1: 2400, y1: 525, x2: 2500, y2: 575 }, // Center platform
    { x1: 2170, y1: 650, x2: 2200, y2: 720 }, // Training Dummy 1
    { x1: 2700, y1: 650, x2: 2730, y2: 720 }, // Training Dummy 2
    
    // Cafe (200, 1000, 900, 1600)
    { x1: 260, y1: 1060, x2: 340, y2: 1410 }, // Counter (Vertical)
    { x1: 340, y1: 1410, x2: 460, y2: 1490 }, // Counter (Horizontal)
    { x1: 270, y1: 1100, x2: 310, y2: 1150 }, // Coffee Machine
    { x1: 700, y1: 1120, x2: 760, y2: 1180 }, // Table 1
    { x1: 710, y1: 1080, x2: 750, y2: 1120 }, // Chair 1a
    { x1: 710, y1: 1180, x2: 750, y2: 1220 }, // Chair 1b
    { x1: 700, y1: 1370, x2: 760, y2: 1430 }, // Table 2
    { x1: 710, y1: 1330, x2: 750, y2: 1370 }, // Chair 2a
    { x1: 710, y1: 1430, x2: 750, y2: 1470 }, // Chair 2b

    // Library (200, 250, 900, 850)
    { x1: 250, y1: 350, x2: 280, y2: 750 }, // Bookshelf Left
    { x1: 820, y1: 350, x2: 850, y2: 750 }, // Bookshelf Right
    { x1: 400, y1: 750, x2: 450, y2: 800 }, // Table Bottom Left
    { x1: 700, y1: 750, x2: 750, y2: 800 }, // Table Bottom Right

    // Office (2100, 1000, 2800, 1600)
    { x1: 2150, y1: 1150, x2: 2310, y2: 1200 }, // Desk Top-Left
    { x1: 2640, y1: 1150, x2: 2800, y2: 1200 }, // Desk Top-Right
    
    // Studio (200, 1900, 900, 2500)
    { x1: 450, y1: 2100, x2: 650, y2: 2150 }, // Table
    
    // Philo Cafe (2100, 1900, 2800, 2500)
    { x1: 2350, y1: 2300, x2: 2400, y2: 2350 }, // Table 1
    { x1: 2600, y1: 2100, x2: 2650, y2: 2150 }, // Table 2
    { x1: 2720, y1: 2200, x2: 2750, y2: 2400 }, // Bookshelf
    
    // Dungeon (3100, 1200, 3800, 1800)
    { x1: 3300, y1: 1400, x2: 3600, y2: 1600 }, // D&D Table
    
    // Classroom (3100, 300, 3800, 800)
    { x1: 3350, y1: 360, x2: 3550, y2: 370 }, // Blackboard
    { x1: 3200, y1: 550, x2: 3270, y2: 590 }, // Student Desk 1
    { x1: 3600, y1: 550, x2: 3670, y2: 590 }, // Student Desk 2
    { x1: 3200, y1: 650, x2: 3270, y2: 690 }, // Student Desk 3
    { x1: 3600, y1: 650, x2: 3670, y2: 690 }, // Student Desk 4
    
    // Lair (3100, 2000, 3800, 2600)
    { x1: 3180, y1: 2100, x2: 3230, y2: 2250 }, // Server Rack 1
    { x1: 3180, y1: 2300, x2: 3230, y2: 2450 }, // Server Rack 2
    { x1: 3670, y1: 2100, x2: 3720, y2: 2250 }, // Server Rack 3
    { x1: 3670, y1: 2300, x2: 3720, y2: 2450 }, // Server Rack 4
    { x1: 3400, y1: 2270, x2: 3500, y2: 2300 }, // Main terminal desk

    // Corrected Interactive Object Collision Boxes
    { x1: INTERACTIVE_OBJECTS.PLAYER_EASEL.left, y1: INTERACTIVE_OBJECTS.PLAYER_EASEL.top, x2: INTERACTIVE_OBJECTS.PLAYER_EASEL.left + INTERACTIVE_OBJECTS.PLAYER_EASEL.width, y2: INTERACTIVE_OBJECTS.PLAYER_EASEL.top + INTERACTIVE_OBJECTS.PLAYER_EASEL.height },
    { x1: INTERACTIVE_OBJECTS.AGENT_EASEL_1.left, y1: INTERACTIVE_OBJECTS.AGENT_EASEL_1.top, x2: INTERACTIVE_OBJECTS.AGENT_EASEL_1.left + INTERACTIVE_OBJECTS.AGENT_EASEL_1.width, y2: INTERACTIVE_OBJECTS.AGENT_EASEL_1.top + INTERACTIVE_OBJECTS.AGENT_EASEL_1.height },
    { x1: INTERACTIVE_OBJECTS.AGENT_EASEL_2.left, y1: INTERACTIVE_OBJECTS.AGENT_EASEL_2.top, x2: INTERACTIVE_OBJECTS.AGENT_EASEL_2.left + INTERACTIVE_OBJECTS.AGENT_EASEL_2.width, y2: INTERACTIVE_OBJECTS.AGENT_EASEL_2.top + INTERACTIVE_OBJECTS.AGENT_EASEL_2.height },
    { x1: INTERACTIVE_OBJECTS.AGENT_EASEL_3.left, y1: INTERACTIVE_OBJECTS.AGENT_EASEL_3.top, x2: INTERACTIVE_OBJECTS.AGENT_EASEL_3.left + INTERACTIVE_OBJECTS.AGENT_EASEL_3.width, y2: INTERACTIVE_OBJECTS.AGENT_EASEL_3.top + INTERACTIVE_OBJECTS.AGENT_EASEL_3.height },
    { x1: INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.left, y1: INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.top, x2: INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.left + INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.width, y2: INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.top + INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.height },
    { x1: INTERACTIVE_OBJECTS.VIBE_COMPUTER.left, y1: INTERACTIVE_OBJECTS.VIBE_COMPUTER.top, x2: INTERACTIVE_OBJECTS.VIBE_COMPUTER.left + INTERACTIVE_OBJECTS.VIBE_COMPUTER.width, y2: INTERACTIVE_OBJECTS.VIBE_COMPUTER.top + INTERACTIVE_OBJECTS.VIBE_COMPUTER.height },
    { x1: INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.left, y1: INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.top, x2: INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.left + INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.width, y2: INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.top + INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.height },
    { x1: INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.left, y1: INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.top, x2: INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.left + INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.width, y2: INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.top + INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.height },
    { x1: INTERACTIVE_OBJECTS.GAME_BOARD.left, y1: INTERACTIVE_OBJECTS.GAME_BOARD.top, x2: INTERACTIVE_OBJECTS.GAME_BOARD.left + INTERACTIVE_OBJECTS.GAME_BOARD.width, y2: INTERACTIVE_OBJECTS.GAME_BOARD.top + INTERACTIVE_OBJECTS.GAME_BOARD.height },
];


export const ADD_AGENT_LOCATIONS: Record<string, { top: number, left: number, roomId: string }> = {
    cafe: { top: 1530, left: 830, roomId: 'cafe'},
    office: { top: 1530, left: 2730, roomId: 'office'},
    studio: { top: 2430, left: 830, roomId: 'studio'},
    art_studio: { top: 2430, left: 1220, roomId: 'art_studio'},
    philo_cafe: { top: 2430, left: 2170, roomId: 'philo_cafe'},
    library: { top: 780, left: 830, roomId: 'library'},
    dojo: { top: 730, left: 2170, roomId: 'dojo'},
    dungeon: { top: 1730, left: 3170, roomId: 'dungeon'},
    classroom: { top: 730, left: 3170, roomId: 'classroom' },
    lair: { top: 2530, left: 3170, roomId: 'lair' },
};