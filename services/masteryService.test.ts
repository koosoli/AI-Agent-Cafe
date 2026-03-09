import { describe, expect, it, vi } from 'vitest';
import { extractMasterySignal } from './masteryService.ts';
import { roomResultFixtures } from '../tests/fixtures/challengeFixtures.ts';

describe('extractMasterySignal', () => {
    it('marks mastery when only the legacy token is present', () => {
        const result = extractMasterySignal(roomResultFixtures.legacyWinOnly);

        expect(result.mastered).toBe(true);
        expect(result.cleanedText).toBe('Well done.');
        expect(result.feedback).toBeUndefined();
        expect(result.nextStep).toBeUndefined();
    });

    it('parses structured room results without the legacy token', () => {
        const result = extractMasterySignal(roomResultFixtures.structuredWinOnly);

        expect(result.mastered).toBe(true);
        expect(result.cleanedText).toBe('Strong revision.');
        expect(result.feedback).toBe('You addressed the critique.');
        expect(result.nextStep).toBe('Try a harder room.');
    });

    it('prefers structured feedback when both legacy and structured markers are present', () => {
        const result = extractMasterySignal(roomResultFixtures.mixedLegacyAndStructured);

        expect(result.mastered).toBe(true);
        expect(result.cleanedText).toBe('Excellent.');
        expect(result.feedback).toBe('Clear and grounded.');
        expect(result.nextStep).toBe('Push the argument further.');
    });

    it('degrades safely when structured JSON is malformed', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = extractMasterySignal(roomResultFixtures.malformedStructured);

        expect(result.mastered).toBe(false);
        expect(result.cleanedText).toBe('Hmm.');
        expect(result.feedback).toBeUndefined();
        expect(result.nextStep).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledOnce();

        warnSpy.mockRestore();
    });

    it('leaves plain text untouched when no mastery markers are present', () => {
        const result = extractMasterySignal(roomResultFixtures.plainTextOnly);

        expect(result.mastered).toBe(false);
        expect(result.cleanedText).toBe(roomResultFixtures.plainTextOnly);
        expect(result.feedback).toBeUndefined();
        expect(result.nextStep).toBeUndefined();
    });
});
