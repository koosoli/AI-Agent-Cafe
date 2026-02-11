import { useCallback, useRef, useEffect } from 'react';
import { useAppStore } from './useAppContext.ts';
import * as socialAnalysisService from '../services/socialAnalysisService.ts';
import type { Agent, Message } from '../types.ts';
import { USER_AGENT } from '../constants.ts';

export const RELATIONSHIP_CHANGE_MAP = {
    AGREEMENT: 5,
    DISAGREEMENT: -5,
    NEUTRAL: 0
};

export const useRelationshipManager = () => {
    const stateRef = useRef(useAppStore.getState());
    useEffect(() => {
        const unsubscribe = useAppStore.subscribe(newState => {
            stateRef.current = newState;
        });
        return unsubscribe;
    }, []);

    const updateRelationshipAction = useAppStore.getState().updateRelationship;

    const updateRelationship = useCallback(async (
        prevSpeakerId: string,
        currentSpeakerId: string,
        prevMessage: Message,
        currentMessage: Message
    ) => {
        // No self-relationship tracking
        if (prevSpeakerId === currentSpeakerId) return;

        try {
            const { agents, services } = stateRef.current;
            const classification = await socialAnalysisService.analyzeSocialInteraction(prevMessage, currentMessage, agents, services);
            const change = RELATIONSHIP_CHANGE_MAP[classification];

            if (change !== 0) {
                const prevSpeaker = agents.find(a => a.id === prevSpeakerId);
                const currentSpeaker = agents.find(a => a.id === currentSpeakerId);
                
                if(prevSpeaker && currentSpeaker) {
                  console.log(`Relationship change between ${currentSpeaker.name} and ${prevSpeaker.name}: ${change > 0 ? '+' : ''}${change} (${classification})`);
                }
                
                // This single dispatch now handles both agent-agent and agent-user relationships.
                // The reducer will correctly apply the one-way change for the user.
                updateRelationshipAction(
                    currentSpeakerId, // The one who just spoke and whose opinion might change
                    prevSpeakerId,    // The one they responded to
                    change
                );
            }
        } catch (error) {
            console.error("Failed to update relationship:", error);
        }

    }, [updateRelationshipAction]);

    return { updateRelationship };
};
