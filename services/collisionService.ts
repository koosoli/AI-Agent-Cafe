// This service determines if a character's position is valid or blocked by an obstacle.

interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// All coordinates are top-left based.
// Padding has been added to account for the size of the character sprites.
const OBSTACLES: Rect[] = [
  // Top wall area (includes padding for character height)
  { x1: 0, y1: 0, x2: 1024, y2: 64 + 30 },
  // Left wall
  { x1: 0, y1: 0, x2: 32 + 20, y2: 600 },
  // Right wall
  { x1: 1024 - 32 - 20, y1: 0, x2: 1024, y2: 600 },
  // Bottom wall (left part)
  { x1: 0, y1: 570 - 40, x2: 1024 / 2 - 50, y2: 600 },
  // Bottom wall (right part)
  { x1: 1024 / 2 + 50, y1: 570 - 40, x2: 1024, y2: 600 },

  // Counter
  { x1: 150 - 20, y1: 120 - 50, x2: 750 + 20, y2: 210 + 20 },
  // Fridge
  { x1: 50 - 20, y1: 40 - 50, x2: 130 + 20, y2: 160 + 20 },
  // Table 1 & chairs
  { x1: 140 - 20, y1: 320 - 50, x2: 340 + 20, y2: 400 + 20 },
  // Table 2 & chairs
  { x1: 480 - 20, y1: 250 - 50, x2: 620 + 20, y2: 370 + 20 },
  // Table 3 & chairs
  { x1: 700 - 20, y1: 380 - 50, x2: 840 + 20, y2: 460 + 20 },
];

const WORLD_BOUNDS: Rect = { x1: 20, y1: 20, x2: 1024 - 20, y2: 1200 - 40 };

/**
 * Checks if a given position is valid (i.e., not out of bounds or inside an obstacle).
 * @param left The x-coordinate of the position.
 * @param top The y-coordinate of the position.
 * @returns true if the position is valid, false otherwise.
 */
export function isPositionValid(left: number, top: number): boolean {
  // Check world bounds first
  if (left < WORLD_BOUNDS.x1 || left > WORLD_BOUNDS.x2 || top < WORLD_BOUNDS.y1 || top > WORLD_BOUNDS.y2) {
    return false;
  }

  // Check against all obstacles
  for (const rect of OBSTACLES) {
    if (left > rect.x1 && left < rect.x2 && top > rect.y1 && top < rect.y2) {
      return false; // Collision detected
    }
  }

  return true; // Position is valid
}
