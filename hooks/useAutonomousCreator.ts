
import { useCallback } from 'react';
import { useAppStore } from './useAppContext.ts';
import * as llmService from '../services/llmService.ts';
import type { WorldImageArtifact } from '../types.ts';
import { INTERACTIVE_OBJECTS } from '../data/layout.ts';
import { shallow } from 'zustand/shallow';

export const useAutonomousCreator = () => {
    const { agents, services, worldArtifacts } = useAppStore(s => ({
        agents: s.agents,
        services: s.services,
        worldArtifacts: s.worldArtifacts,
    }), shallow);
    const { logApiUsage, addWorldArtifact, setInsightStatus, setAgentIsUsingObject, setAgentTask } = useAppStore.getState();


    const handleAutonomousPainting = useCallback(async (agentId: string) => {
        const agent = agents.find(a => a.id === agentId);
        if (!agent) {
            console.error(`Autonomous painting triggered for non-existent agent: ${agentId}`);
            return;
        }

        try {
            // 1. Generate a prompt based on the agent's persona and memories
            const artPrompt = await llmService.generateAutonomousArtPrompt(agent, services);
            
            // 2. Generate the image using the best available model
            const imageModel = services.imageGenerationModel || 'imagen-3.0-generate-002';
            const { imageUrl, provider } = await llmService.generateImage(artPrompt, imageModel, services);
            logApiUsage({ type: 'image', provider, model: imageModel });
            
            // 3. Find an empty easel in the Art Studio
            const agentEasels = [
                INTERACTIVE_OBJECTS.AGENT_EASEL_1,
                INTERACTIVE_OBJECTS.AGENT_EASEL_2,
                INTERACTIVE_OBJECTS.AGENT_EASEL_3,
            ];

            const existingArtifactObjectIds = new Set(worldArtifacts.map(a => a.objectId));
            const emptyEasel = agentEasels.find(easel => !existingArtifactObjectIds.has(easel.id));

            if (emptyEasel) {
                // 4. Create and dispatch the new world artifact
                const newArtifact: WorldImageArtifact = {
                    id: `world-art-${Date.now()}`,
                    type: 'world_image',
                    prompt: artPrompt,
                    imageUrl,
                    timestamp: Date.now(),
                    agentId: agent.id,
                    agentName: agent.name,
                    objectId: emptyEasel.id,
                };
                addWorldArtifact(newArtifact);
                
                // 5. Provide visual feedback for the creation
                // The task loop in useAgentBehavior will clear the isUsingObject status.
                // We just need to trigger the insight popup.
                setInsightStatus(agentId, true);
                console.log(`${agent.name} created a new painting on ${emptyEasel.id}.`);

            } else {
                console.log(`${agent.name} created art but no empty easel was found.`);
                // If no easel, still end the task so the agent doesn't get stuck.
                setAgentIsUsingObject(agentId, false);
                setAgentTask(agentId, null);
            }

        } catch (error) {
            console.error(`Error during autonomous painting for agent ${agentId}:`, error);
            // Ensure agent is not stuck in the using object state on error
            setAgentIsUsingObject(agentId, false);
            setAgentTask(agentId, null);
        }
    }, [agents, services, worldArtifacts, logApiUsage, addWorldArtifact, setInsightStatus, setAgentIsUsingObject, setAgentTask]);

    // This hook could be expanded for other creation types (coding, writing) in the future.
    return { handleAutonomousPainting };
};