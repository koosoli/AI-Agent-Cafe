// This service determines if a character's position is valid and which room they are in.
import type { Agent } from '../types';
import { ZONES, DOOR_POSITIONS, OTHER_OBSTACLES, Rect, Door } from '../data/layout.ts';

const WALL_THICKNESS = 50;
const DOOR_WIDTH = 100;

const createBuildingWalls = (zone: Rect, doors: Door[]): Rect[] => {
    const { x1, y1, x2, y2 } = zone;
    const walls: Rect[] = [];

    const topDoors = doors.filter(d => d.side === 'top').sort((a, b) => a.x - b.x);
    const bottomDoors = doors.filter(d => d.side === 'bottom').sort((a, b) => a.x - b.x);

    // Top wall
    let currentX = x1;
    for (const door of topDoors) {
        if (door.x > currentX) walls.push({ x1: currentX, y1, x2: door.x, y2: y1 + WALL_THICKNESS });
        currentX = door.x + DOOR_WIDTH;
    }
    if (currentX < x2) walls.push({ x1: currentX, y1, x2, y2: y1 + WALL_THICKNESS });

    // Bottom wall
    currentX = x1;
    for (const door of bottomDoors) {
        if (door.x > currentX) walls.push({ x1: currentX, y1: y2 - WALL_THICKNESS, x2: door.x, y2 });
        currentX = door.x + DOOR_WIDTH;
    }
    if (currentX < x2) walls.push({ x1: currentX, y1: y2 - WALL_THICKNESS, x2, y2 });

    // Side walls (full height for simplicity, as doors are only top/bottom)
    walls.push({ x1, y1, x2: x1 + WALL_THICKNESS, y2 }); // Left
    walls.push({ x1: x2 - WALL_THICKNESS, y1, x2, y2 }); // Right

    return walls;
};


const BUILDING_WALLS: Rect[] = [
    ...createBuildingWalls(ZONES.cafe, DOOR_POSITIONS.cafe),
    ...createBuildingWalls(ZONES.office, DOOR_POSITIONS.office),
    ...createBuildingWalls(ZONES.studio, DOOR_POSITIONS.studio),
    ...createBuildingWalls(ZONES.art_studio, DOOR_POSITIONS.art_studio),
    ...createBuildingWalls(ZONES.philo_cafe, DOOR_POSITIONS.philo_cafe),
    ...createBuildingWalls(ZONES.dojo, DOOR_POSITIONS.dojo),
    ...createBuildingWalls(ZONES.library, DOOR_POSITIONS.library),
    ...createBuildingWalls(ZONES.dungeon, DOOR_POSITIONS.dungeon),
    ...createBuildingWalls(ZONES.classroom, DOOR_POSITIONS.classroom),
    ...createBuildingWalls(ZONES.lair, DOOR_POSITIONS.lair),
];

export const DOOR_OBSTACLES: Rect[] = Object.values(DOOR_POSITIONS).flat().map(d => ({
    x1: d.x, y1: d.y, x2: d.x + DOOR_WIDTH, y2: d.y + 50
}));


/**
 * Checks if a given position is valid (i.e., not inside an obstacle).
 * @param left The x-coordinate of the position.
 * @param top The y-coordinate of the position.
 * @param isDragging Whether the character is being dragged by the user.
 * @param agent The agent attempting to move.
 * @returns true if the position is valid, false otherwise.
 */
export function isPositionValid(left: number, top: number, isDragging: boolean = false, agent?: Agent): boolean {
  const characterWidth = 20; 
  const characterHeight = 10; 
  const charRect: Rect = {
    x1: left - characterWidth / 2,
    x2: left + characterWidth / 2,
    y1: top - characterHeight,
    y2: top,
  };

  // Animal-specific door collision
  if (agent?.isAnimal) {
    for (const obs of DOOR_OBSTACLES) {
        if (charRect.x1 < obs.x2 && charRect.x2 > obs.x1 &&
            charRect.y1 < obs.y2 && charRect.y2 > obs.y1) {
            return false;
        }
    }
  }

  for (const obs of OTHER_OBSTACLES) {
    if (charRect.x1 < obs.x2 && charRect.x2 > obs.x1 &&
        charRect.y1 < obs.y2 && charRect.y2 > obs.y1) {
      return false;
    }
  }
  
  if (isDragging) return true;

  // Check against all building walls. This prevents agents from walking through them.
  for (const wall of BUILDING_WALLS) {
    if (charRect.x1 < wall.x2 && charRect.x2 > wall.x1 &&
        charRect.y1 < wall.y2 && charRect.y2 > wall.y1) {
      return false;
    }
  }

  return true;
}

/**
 * Determines which room a given position is in.
 * @param left The x-coordinate of the position.
 * @param top The y-coordinate of the position.
 * @returns The name of the room, or 'outside' if not in any room.
 */
export function getRoomForPosition(left: number, top: number): string {
  for (const [roomName, zone] of Object.entries(ZONES)) {
    if (left > zone.x1 && left < zone.x2 && top > zone.y1 && top < zone.y2) {
      return roomName;
    }
  }
  return 'outside';
}

/**
 * Finds a random valid point within the agent's current room or a wider area if outside.
 * @param agent The agent to find a point for.
 * @returns A valid {x, y} coordinate or null if no valid point is found after several attempts.
 */
export function findRandomValidPoint(agent: Agent): { x: number, y: number } | null {
    const MAX_ATTEMPTS = 30;
    const roomZone = ZONES[agent.roomId];

    // If the agent is inside a defined room, find a point within that room.
    if (roomZone) {
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const x = roomZone.x1 + Math.random() * (roomZone.x2 - roomZone.x1);
            const y = roomZone.y1 + Math.random() * (roomZone.y2 - roomZone.y1);
            if (isPositionValid(x, y, false, agent)) {
                return { x, y };
            }
        }
    } else if (agent.roomId === 'outside') {
        // If the agent is outside, use a radius-based method.
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const distance = 50 + Math.random() * 150;
            const target = {
                x: agent.position.left + Math.cos(angle) * distance,
                y: agent.position.top + Math.sin(angle) * distance,
            };
            const targetRoom = getRoomForPosition(target.x, target.y);

            // Ensure the target is also 'outside' and valid.
            if (targetRoom === 'outside' && isPositionValid(target.x, target.y, false, agent)) {
                return target;
            }
        }
    }
    
    // If no valid point is found, or agent is in a non-standard zone.
    console.warn(`Could not find a valid wander point for ${agent.name} in ${agent.roomId} after ${MAX_ATTEMPTS} attempts.`);
    return null;
};