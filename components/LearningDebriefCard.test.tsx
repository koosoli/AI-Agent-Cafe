import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import LearningDebriefCard from './LearningDebriefCard.tsx';
import { useAppStore } from '../hooks/useAppContext.ts';
import { challengeFixtureAgents, createFixtureState } from '../tests/fixtures/challengeFixtures.ts';

const applyStoreState = (overrides: {
    learningDebrief?: NonNullable<ReturnType<typeof useAppStore.getState>['ui']['learningDebrief']>;
} = {}) => {
    const current = useAppStore.getState();
    const baseState = createFixtureState();

    useAppStore.setState({
        agents: challengeFixtureAgents,
        messages: [],
        game: { ...current.game, ...baseState.game },
        ui: {
            ...current.ui,
            learningDebrief: overrides.learningDebrief ?? null,
        },
    });
};

describe('LearningDebriefCard', () => {
    beforeEach(() => {
        applyStoreState();
    });

    afterEach(() => {
        cleanup();
        applyStoreState();
    });

    it('renders rubric and score when present', () => {
        applyStoreState({
            learningDebrief: {
                id: 1,
                roomId: 'office',
                tone: 'coach',
                title: 'Tech Office Coach',
                summary: 'You said: "make it cooler" UI/UX Designer replied: "Needs stronger hierarchy."',
                lesson: 'Your layout improved, but the hierarchy is still weak.',
                nextStep: 'Name the spacing and heading changes explicitly.',
                score: 7,
                rubric: {
                    clarity: 3,
                    usability: 4,
                },
            },
        });

        render(<LearningDebriefCard />);

        expect(screen.getByText('Tech Office Coach')).toBeInTheDocument();
        expect(screen.getByText('Score 7/10')).toBeInTheDocument();
        expect(screen.getByText('clarity')).toBeInTheDocument();
        expect(screen.getByText('usability')).toBeInTheDocument();
        expect(screen.getByText('3/5')).toBeInTheDocument();
        expect(screen.getByText('4/5')).toBeInTheDocument();
    });

    it('dismisses the card through the shared store', () => {
        applyStoreState({
            learningDebrief: {
                id: 2,
                roomId: 'classroom',
                tone: 'mastered',
                title: 'Classroom Review',
                summary: 'You synthesized the sources well.',
                lesson: 'Turn live evidence into your own explanation.',
                nextStep: 'Try a harder research question.',
            },
        });

        render(<LearningDebriefCard />);
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

        expect(useAppStore.getState().ui.learningDebrief).toBeNull();
    });
});
