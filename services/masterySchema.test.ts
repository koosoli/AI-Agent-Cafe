import { describe, expect, it } from 'vitest';
import { validateRoomResultPayload } from './masterySchema.ts';

describe('validateRoomResultPayload', () => {
    it('returns normalized supported fields for a valid payload', () => {
        expect(validateRoomResultPayload({
            mastered: true,
            feedback: ' Strong work. ',
            next_step: ' Try another room. ',
            score: 8,
            stage: 2,
            rubric: {
                clarity: 4,
                evidence: 3,
            },
            ignored: 'value',
        })).toEqual({
            mastered: true,
            feedback: 'Strong work.',
            next_step: 'Try another room.',
            score: 8,
            stage: 2,
            rubric: {
                clarity: 4,
                evidence: 3,
            },
        });
    });

    it('returns null for non-object payloads', () => {
        expect(validateRoomResultPayload('invalid')).toBeNull();
        expect(validateRoomResultPayload(null)).toBeNull();
        expect(validateRoomResultPayload([])).toBeNull();
    });

    it('drops invalid optional fields instead of failing', () => {
        expect(validateRoomResultPayload({
            mastered: 'yes',
            feedback: '',
            next_step: 7,
            score: 99,
            stage: 9,
            rubric: {
                clarity: 9,
                novelty: '4',
            },
        })).toEqual({
            mastered: undefined,
            feedback: undefined,
            next_step: undefined,
            score: undefined,
            stage: undefined,
            rubric: undefined,
        });
    });
});
