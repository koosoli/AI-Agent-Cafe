import { describe, it, expect } from 'vitest';
import { getRoomForPosition, isPositionValid } from './collisionService';
import { ZONES } from '../data/layout';

describe('collisionService', () => {
  describe('getRoomForPosition', () => {
    it('should return "cafe" for a position inside the cafe zone', () => {
      const pos = { left: 300, top: 1100 }; // A point inside the cafe
      expect(getRoomForPosition(pos.left, pos.top)).toBe('cafe');
    });

    it('should return "outside" for a position not in any zone', () => {
      const pos = { left: 1500, top: 1500 }; // Middle of the central plaza
      expect(getRoomForPosition(pos.left, pos.top)).toBe('outside');
    });

    it('should return "office" for a position on the edge of the office', () => {
      const officeZone = ZONES.office;
      const pos = { left: officeZone.x1 + 1, top: officeZone.y1 + 1 };
      expect(getRoomForPosition(pos.left, pos.top)).toBe('office');
    });
  });

  describe('isPositionValid', () => {
    it('should return false for a position inside a wall', () => {
      // Position inside the top wall of the cafe
      const pos = { left: ZONES.cafe.x1 + 60, top: ZONES.cafe.y1 + 10 };
      expect(isPositionValid(pos.left, pos.top, false)).toBe(false);
    });

    it('should return false for a position inside another obstacle (fountain)', () => {
      // Position inside the fountain in the central plaza
      const pos = { left: 1500, top: 1375 };
      expect(isPositionValid(pos.left, pos.top, false)).toBe(false);
    });

    it('should return true for a valid position in an open area', () => {
      const pos = { left: 1600, top: 1500 }; // An open area in the plaza
      expect(isPositionValid(pos.left, pos.top, false)).toBe(true);
    });

    it('should return true for a valid position inside a room but not on a wall', () => {
      const pos = { left: 300, top: 1100 }; // Center of the cafe
      expect(isPositionValid(pos.left, pos.top, false)).toBe(true);
    });

    it('should return true for any position when isDragging is true', () => {
      // Position inside the fountain, which would normally be invalid
      const pos = { left: 1500, top: 1375 };
      expect(isPositionValid(pos.left, pos.top, true)).toBe(true);
    });
  });
});