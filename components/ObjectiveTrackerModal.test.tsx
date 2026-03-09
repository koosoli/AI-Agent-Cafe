import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ObjectiveTrackerModal from './ObjectiveTrackerModal.tsx';
import { useAppStore } from '../hooks/useAppContext.ts';
import { challengeFixtureAgents, createFixtureState } from '../tests/fixtures/challengeFixtures.ts';

const resetTrackerStore = (gameOverrides: Partial<ReturnType<typeof createFixtureState>['game']> = {}) => {
    const current = useAppStore.getState();
    const baseState = createFixtureState();

    useAppStore.setState({
        agents: challengeFixtureAgents,
        messages: [],
        game: { ...current.game, ...baseState.game, ...gameOverrides },
        ui: {
            ...current.ui,
            learningDebrief: null,
        },
    });
};

describe('ObjectiveTrackerModal', () => {
    beforeEach(() => {
        resetTrackerStore();
    });

    afterEach(() => {
        cleanup();
        resetTrackerStore();
    });

    it('shows revision badges for challenge rooms that track feedback loops', () => {
        resetTrackerStore({
            officeChallengeState: {
                status: 'critique_needed',
                lastCode: null,
                lastPrompt: 'retro dashboard',
                feedbackCount: 2,
            },
        });

        render(<ObjectiveTrackerModal isOpen={true} onClose={() => {}} />);

        expect(screen.getByText('2 revisions')).toBeInTheDocument();
    });
});
