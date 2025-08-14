
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MasteryHud from './MasteryHud';
import { ROOMS } from '../data/rooms';

const MASTERABLE_ROOM_IDS = Object.keys(ROOMS).filter(id => !['outside', 'roster', 'trash'].includes(id));

describe('MasteryHud', () => {
  afterEach(cleanup);

  it('renders the correct number of stars', () => {
    render(<MasteryHud masteredRooms={[]} />);
    const stars = screen.getAllByTestId(/star-/);
    expect(stars).toHaveLength(MASTERABLE_ROOM_IDS.length);
  });

  it('renders no filled stars when no rooms are mastered', () => {
    render(<MasteryHud masteredRooms={[]} />);
    MASTERABLE_ROOM_IDS.forEach(roomId => {
        const star = screen.getByTestId(`star-${roomId}`);
        expect(star.classList).toContain('text-gray-600');
        expect(star.classList).not.toContain('text-yellow-400');
    });
  });

  it('renders a filled star for a mastered room', () => {
    render(<MasteryHud masteredRooms={['cafe']} />);
    const cafeStar = screen.getByTestId('star-cafe');
    expect(cafeStar.classList).toContain('text-yellow-400');
    expect(cafeStar.classList).not.toContain('text-gray-600');
  });

  it('renders correct number of filled and unfilled stars', () => {
    render(<MasteryHud masteredRooms={['cafe', 'office']} />);
    const filledStars = screen.queryAllByTestId(/star-/).filter(s => s.classList.contains('text-yellow-400'));
    const unfilledStars = screen.queryAllByTestId(/star-/).filter(s => s.classList.contains('text-gray-600'));
    
    expect(filledStars).toHaveLength(2);
    expect(unfilledStars).toHaveLength(MASTERABLE_ROOM_IDS.length - 2);
  });
});
