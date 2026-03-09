import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ActiveQuestPanel from './ActiveQuestPanel.tsx';
import { useAppStore } from '../hooks/useAppContext.ts';
import { challengeFixtureAgents, createFixtureState } from '../tests/fixtures/challengeFixtures.ts';

const QUEST_PANEL_SEEN_KEY = 'questPanelSeen';

const resetStore = () => {
    const current = useAppStore.getState();
    const baseState = createFixtureState();
    useAppStore.setState({
        agents: challengeFixtureAgents,
        messages: [],
        game: { ...current.game, ...baseState.game },
    });
};

describe('ActiveQuestPanel', () => {
    beforeEach(() => {
        localStorage.removeItem(QUEST_PANEL_SEEN_KEY);
        resetStore();
    });

    afterEach(() => {
        cleanup();
        localStorage.removeItem(QUEST_PANEL_SEEN_KEY);
        resetStore();
    });

    it('starts hidden behind the info icon for first-time users and persists first open', () => {
        render(<ActiveQuestPanel roomId="cafe" />);

        const openButton = screen.getByRole('button', { name: 'Open room challenge popup' });
        expect(openButton).toBeInTheDocument();
        expect(screen.queryByText('AI Cafe')).not.toBeInTheDocument();

        fireEvent.click(openButton);

        expect(screen.getByText('AI Cafe')).toBeInTheDocument();
        expect(localStorage.getItem(QUEST_PANEL_SEEN_KEY)).toBe('true');
    });
});
