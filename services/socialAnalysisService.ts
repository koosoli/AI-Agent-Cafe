import type { Agent, AppState, Message, Memory } from '../types.ts';
import { LLMProvider as LLMProviderEnum, MemoryType as MemoryTypeEnum } from '../types.ts';
import { getRawResponseForModel } from './llmService.ts';

/**
 * Analyzes a conversation turn to classify the social interaction (agreement, disagreement, neutral).
 * Used for dynamically updating agent relationships.
 * @param prevMessage The previous message in the conversation.
 * @param currentMessage The current message (the response).
 * @param allAgents A list of all agents in the simulation.
 * @param services The application's service configuration.
 * @returns A promise resolving to the classification string.
 */
export async function analyzeSocialInteraction(
  prevMessage: Message,
  currentMessage: Message,
  allAgents: Agent[],
  services: AppState['services']
): Promise<'AGREEMENT' | 'DISAGREEMENT' | 'NEUTRAL'> {
    const lastSpeaker = allAgents.find(a => a.id === prevMessage.agentId);
    const currentSpeaker = allAgents.find(a => a.id === currentMessage.agentId);

    if (!lastSpeaker || !currentSpeaker) return 'NEUTRAL';

    const systemInstruction = "You are a social interaction analysis tool. Your task is to classify a conversation turn. Given the previous speaker's last message and the current speaker's response, determine if the response indicates AGREEMENT, DISAGREEMENT, or is NEUTRAL. Respond with ONLY one of these three words.";
    
    const userContent = `
    Previous Speaker (${lastSpeaker.name}): "${prevMessage.text}"
    Current Speaker (${currentSpeaker.name}): "${currentMessage.text}"

    Classification:
    `;
    
    try {
        const response = await getRawResponseForModel('gemini-2.5-flash', LLMProviderEnum.GEMINI, systemInstruction, userContent, services, {
            thinkingConfig: { thinkingBudget: 0 }
        });
        const result = response.text.trim().toUpperCase();
        if (result === 'AGREEMENT' || result === 'DISAGREEMENT' || result === 'NEUTRAL') {
            return result;
        }
        return 'NEUTRAL';
    } catch (error) {
        console.error("Error analyzing social interaction:", error);
        return 'NEUTRAL';
    }
}

/**
 * Simulates an agent's likely reaction to gossip based on personality.
 * @param agentA The agent sharing the information.
 * @param agentB The agent hearing the information.
 * @param memory The piece of information being shared.
 * @param services The application's service configuration.
 * @returns A promise resolving to the likely reaction classification.
 */
export async function analyzeGossipReaction(
  agentA: Agent, // The gossiper
  agentB: Agent, // The listener
  memory: Memory,
  services: AppState['services']
): Promise<'AGREEMENT' | 'DISAGREEMENT' | 'NEUTRAL'> {
    const agentAPersona = agentA.memoryStream.find(m => m.type === MemoryTypeEnum.CORE)?.description || agentA.persona;
    const agentBPersona = agentB.memoryStream.find(m => m.type === MemoryTypeEnum.CORE)?.description || agentB.persona;
    
    const systemInstruction = "You are a social dynamics analyzer. Agent A tells Agent B some information. Based on their personalities, would Agent B's immediate reaction likely be one of AGREEMENT (they believe it/find it interesting/are receptive), DISAGREEMENT (they are skeptical/dislike the information), or NEUTRAL? This information transfer strengthens or weakens their social bond. Respond with ONLY one of the three classification words.";

    const userContent = `
    Agent A's Persona: "${agentAPersona}"
    Agent B's Persona: "${agentBPersona}"

    Information Shared by Agent A: "${memory.description}"

    Classification of Agent B's Reaction:
    `;
    
    try {
        const response = await getRawResponseForModel('gemini-2.5-flash', LLMProviderEnum.GEMINI, systemInstruction, userContent, services, {
            thinkingConfig: { thinkingBudget: 0 }
        });
        const result = response.text.trim().toUpperCase();
        if (result === 'AGREEMENT' || result === 'DISAGREEMENT' || result === 'NEUTRAL') {
            return result;
        }
        return 'NEUTRAL';
    } catch (error) {
        console.error("Error analyzing gossip reaction:", error);
        return 'NEUTRAL';
    }
}
