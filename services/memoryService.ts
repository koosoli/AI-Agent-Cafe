
import type { Agent, Memory, AppState, MemoryType, UserProfile } from '../types.ts';
import { LLMProvider, MemoryType as MemoryTypeEnum } from '../types.ts';
import * as llmService from './llmService.ts';
import { getEmbedding } from './embeddingService.ts';

// --- Memory Retrieval Constants ---
const RELEVANCE_WEIGHT = 1.5;
const IMPORTANCE_WEIGHT = 1.0;
const RECENCY_WEIGHT = 1.0;
const RECENCY_DECAY_RATE = 0.995;
const NUM_MEMORIES_TO_RETRIEVE = 5;

// --- Helper Functions ---
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const divisor = Math.sqrt(normA) * Math.sqrt(normB);
    return divisor === 0 ? 0 : dotProduct / divisor;
}


// --- Core Memory Functions ---

/**
 * Retrieves the most salient memories for an agent based on a query.
 * It scores memories based on relevance (cosine similarity), importance, and recency.
 * @param agent The agent whose memories are being queried.
 * @param query The search query string.
 * @param state The entire application state, containing necessary services and game data.
 * @returns A promise that resolves to an object grouping the most salient memories by type.
 */
export async function retrieveMemories(
    agent: Agent,
    query: string,
    state: AppState
): Promise<Record<MemoryType, Memory[]>> {
    const emptyResult = {
        [MemoryTypeEnum.CORE]: [],
        [MemoryTypeEnum.EPISODIC]: [],
        [MemoryTypeEnum.SEMANTIC]: [],
        [MemoryTypeEnum.PROCEDURAL]: [],
        [MemoryTypeEnum.RESOURCE]: [],
        [MemoryTypeEnum.KNOWLEDGE_VAULT]: [],
    };
    if (agent.memoryStream.length === 0) return emptyResult;

    const { services, game } = state;
    const { memoryEmbeddings } = game;
    const currentTime = Date.now();

    let queryEmbedding: number[] | null = null;
    if (services.openAiApiKey) {
      queryEmbedding = await getEmbedding(query, services);
    }

    const coreMemories = agent.memoryStream.filter(m => m.type === MemoryTypeEnum.CORE);
    const otherMemories = agent.memoryStream.filter(m => m.type !== MemoryTypeEnum.CORE);
    
    const scoredMemories = otherMemories.map(memory => {
        const recency = Math.pow(RECENCY_DECAY_RATE, (currentTime - memory.lastAccessed) / (1000 * 3600)); // Decay per hour
        const importance = memory.importance / 9;
        
        let relevance = 0;
        if (queryEmbedding && memoryEmbeddings) {
          const memoryEmbedding = memoryEmbeddings[memory.id];
          relevance = memoryEmbedding ? cosineSimilarity(queryEmbedding, memoryEmbedding) : 0;
        }
        
        const score = (relevance * RELEVANCE_WEIGHT) + (importance * IMPORTANCE_WEIGHT) + (recency * RECENCY_WEIGHT);
        return { ...memory, score };
    });

    let salientOtherMemories = scoredMemories.sort((a, b) => b.score - a.score).slice(0, NUM_MEMORIES_TO_RETRIEVE);
    
    const salientIds = new Set(salientOtherMemories.map(m => m.id));
    const memoriesToAdd: (Memory & { score: number })[] = [];

    salientOtherMemories.forEach(mem => {
        if (mem.type === MemoryTypeEnum.SEMANTIC && mem.parentId) {
            if (!salientIds.has(mem.parentId)) {
                const parent = agent.memoryStream.find(m => m.id === mem.parentId);
                if (parent) {
                    memoriesToAdd.push({ ...parent, score: 0 });
                    salientIds.add(parent.id);
                }
            }
        }
    });
    
    if (memoriesToAdd.length > 0) {
        salientOtherMemories = [...salientOtherMemories, ...memoriesToAdd];
    }
    
    return {
        [MemoryTypeEnum.CORE]: coreMemories,
        [MemoryTypeEnum.EPISODIC]: salientOtherMemories.filter(m => m.type === MemoryTypeEnum.EPISODIC),
        [MemoryTypeEnum.SEMANTIC]: salientOtherMemories.filter(m => m.type === MemoryTypeEnum.SEMANTIC),
        [MemoryTypeEnum.PROCEDURAL]: salientOtherMemories.filter(m => m.type === MemoryTypeEnum.PROCEDURAL),
        [MemoryTypeEnum.RESOURCE]: salientOtherMemories.filter(m => m.type === MemoryTypeEnum.RESOURCE),
        [MemoryTypeEnum.KNOWLEDGE_VAULT]: salientOtherMemories.filter(m => m.type === MemoryTypeEnum.KNOWLEDGE_VAULT),
    };
}

/**
 * Uses a token-free heuristic to rate the poignancy of a memory on a scale of 0-9.
 * This avoids making an LLM call for every memory creation, saving on API costs.
 * @param description The content of the memory to rate.
 * @param userProfile The current user profile for context.
 * @param services The application's service configuration.
 * @returns A promise resolving to a number from 0 to 9.
 */
export async function rateMemoryImportance(description: string, userProfile: Partial<UserProfile>, services: AppState['services']): Promise<number> {
    const desc = description.toLowerCase();
    
    // High importance keywords related to game progression
    const highImportanceKeywords = ['mastered', 'challenge', 'wins', 'super agent', 'architect', 'skynet', 'finale', 'objective'];
    if (highImportanceKeywords.some(kw => desc.includes(kw))) {
        return Promise.resolve(9);
    }
    
    // User-related memories are very important
    const user = userProfile.name?.toLowerCase();
    if (desc.includes('the user') || (user && user.trim() !== '' && desc.includes(user))) {
        return Promise.resolve(8);
    }
    
    // Memories about learning something new or forming a significant opinion
    const insightKeywords = ['realized', 'decided', 'learned', 'understood', 'insight', 'believe', 'think that'];
    if (insightKeywords.some(kw => desc.includes(kw))) {
        return Promise.resolve(7);
    }
    
    // Core interaction memories
    const interactionKeywords = ['said:', 'told me', 'heard from', 'talked to', 'asked me'];
     if (interactionKeywords.some(kw => desc.includes(kw))) {
        return Promise.resolve(5);
    }
    
    // Mundane actions
    const mundaneKeywords = ['entered the room', 'left the room', 'is walking', 'is using'];
    if (mundaneKeywords.some(kw => desc.includes(kw))) {
        return Promise.resolve(1);
    }
    
    // Default importance for everything else
    return Promise.resolve(3);
}


/**
 * Synthesizes new, higher-level "reflection" memories from a set of recent memories.
 * This is a core part of the agent's long-term learning and insight generation process.
 * @param recentMemories A list of recent memories to reflect upon.
 * @param allMemories The agent's entire memory stream for broader context.
 * @param state The entire application state.
 * @returns A promise resolving to an array of new reflection objects, each with content and supporting memory IDs.
 */
export async function synthesizeReflections(
    recentMemories: Memory[],
    allMemories: Memory[],
    state: AppState,
): Promise<{ newReflection: string; supportingMemoryIds: string[] }[]> {
    if (recentMemories.length === 0) return [];
    
    const { services, agents } = state;

    // 1. Ask the LLM to generate salient questions based on recent memories
    const recentMemoriesText = recentMemories.map(m => ` - ${m.description}`).join('\n');
    const questionPrompt = `Given ONLY the following recent memories, what are 1-2 most salient high-level questions we can answer about the subject in the statements?\n\n--- MEMORIES ---\n${recentMemoriesText}\n\n--- QUESTIONS ---\n1.`;
    
    let questionsText: string;
    try {
        const response = await llmService.getRawResponseForModel('gemini-2.5-flash', LLMProvider.GEMINI, '', questionPrompt, services);
        questionsText = response.text;
    } catch(e) {
        console.error("Failed to generate reflection questions:", e);
        return [];
    }

    const questions = questionsText.split('\n').map(q => q.trim().replace(/^\d+\.\s*/, '')).filter(Boolean);

    const newReflections: { newReflection: string; supportingMemoryIds: string[] }[] = [];

    // 2. For each question, retrieve relevant memories and synthesize an insight
    for (const question of questions) {
        // Retrieve memories relevant to this specific question
        const relevantMemories = await retrieveMemories({ ...agents[0], memoryStream: allMemories }, question, state);
        const flatRelevantMemories = Object.values(relevantMemories).flat();

        if (flatRelevantMemories.length < 3) continue;

        const evidenceText = flatRelevantMemories.map((m, i) => `Statement ${i+1}: ${m.description}`).join('\n');
        const insightPrompt = `You are a brilliant analyst. Based on the following statements, what are 5 high-level insights you can infer? Respond with a list of insights, each on a new line. Do NOT refer to the statement numbers.\n\n--- STATEMENTS ---\n${evidenceText}\n\n--- INSIGHTS ---\n-`;

        try {
            const response = await llmService.getRawResponseForModel('gemini-2.5-flash', LLMProvider.GEMINI, '', insightPrompt, services);
            const insights = response.text.split('\n').map(i => i.trim().replace(/^-/, '').trim()).filter(Boolean);
            
            if (insights.length > 0) {
                 // For simplicity, we'll just take the first, most prominent insight.
                newReflections.push({
                    newReflection: insights[0],
                    supportingMemoryIds: flatRelevantMemories.map(m => m.id),
                });
            }
        } catch(e) {
            console.error(`Failed to synthesize insight for question "${question}":`, e);
            continue;
        }
    }

    return newReflections;
}
