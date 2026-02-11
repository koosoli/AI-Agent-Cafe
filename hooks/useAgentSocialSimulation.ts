import { useEffect, useRef } from 'react';
import { useAppStore } from './useAppContext.ts';
import type { Agent } from '../types.ts';
import { USER_AGENT } from '../constants.ts';
import { GAME_CONFIG } from '../data/gameConfig.ts';
import { SpatialGrid } from '../services/spatialService.ts';

const GREETINGS = ['Hi!', 'Hello.', 'Good day.', 'Greetings.'];

export const useAgentSocialSimulation = () => {
  const stateRef = useRef(useAppStore.getState());
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(newState => {
        stateRef.current = newState;
    });
    return unsubscribe;
  }, []);

  const { setAgentGreeting } = useAppStore.getState();
  const socialLoopTimeout = useRef<number | null>(null);

  useEffect(() => {
    const runSocialLoop = () => {
      const { agents, ui, isLoading } = stateRef.current;
      if (ui.isAnyModalOpen || isLoading) {
        socialLoopTimeout.current = window.setTimeout(runSocialLoop, 500);
        return;
      }

      const now = Date.now();
      const currentAgents = agents.filter(a => a.id !== USER_AGENT.id && !a.isLocked);
      if (currentAgents.length === 0) {
        socialLoopTimeout.current = window.setTimeout(runSocialLoop, 500);
        return;
      }
      
      const spatialGrid = new SpatialGrid(GAME_CONFIG.GREETING_DISTANCE_THRESHOLD * 2);
      currentAgents.forEach(agent => spatialGrid.insert(agent));

      const greetedThisFrame = new Set<string>();

      currentAgents.forEach(agent => {
        if (greetedThisFrame.has(agent.id) || agent.roomId === 'roster') return;

        // Greetings only happen outside for now to reduce visual noise in rooms
        if (agent.roomId !== 'outside') {
            return;
        }

        const nearbyAgents = spatialGrid.query(agent.position.left, agent.position.top, GAME_CONFIG.GREETING_DISTANCE_THRESHOLD);

        for (const otherAgent of nearbyAgents) {
            if (otherAgent.id === agent.id || greetedThisFrame.has(otherAgent.id)) continue;
            // Ensure they are in the same room (though query should handle this, it's a good safeguard)
            if (agent.roomId !== otherAgent.roomId) continue;

            const hasInteractedRecently = (now - (agent.lastInteractionTimestamp || 0) < GAME_CONFIG.GREETING_COOLDOWN_MS) || (now - (otherAgent.lastInteractionTimestamp || 0) < GAME_CONFIG.GREETING_COOLDOWN_MS);
            const isBusy = agent.isChatting || otherAgent.isChatting || agent.greeting || otherAgent.greeting;

            if (!hasInteractedRecently && !isBusy) {
                const agentToGreet = agent;
                const partner = otherAgent;

                greetedThisFrame.add(agentToGreet.id);
                greetedThisFrame.add(partner.id);
                
                const greetingForAgent = agentToGreet.isAnimal ? (agentToGreet.animalSound || '...') : GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
                setAgentGreeting(agentToGreet.id, { text: greetingForAgent, timestamp: Date.now() });

                const isPartnerPlayer = partner.id === USER_AGENT.id;

                // AI shouldn't greet the player if the player is already being greeted by someone else.
                // However, the player can be greeted while another AI greets another AI.
                if (!isPartnerPlayer) {
                    const greetingForPartner = partner.isAnimal ? (partner.animalSound || '...') : GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
                     setAgentGreeting(partner.id, { text: greetingForPartner, timestamp: Date.now() });
                }
                
                break; // Move to the next agent after a successful greeting to prevent one agent greeting multiple others at once.
            }
        }
      });
      
      socialLoopTimeout.current = window.setTimeout(runSocialLoop, 500); // Run twice a second
    };

    socialLoopTimeout.current = window.setTimeout(runSocialLoop, 500);
    return () => {
        if(socialLoopTimeout.current) clearTimeout(socialLoopTimeout.current);
    }
  }, [setAgentGreeting]);
};