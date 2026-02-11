import { useCallback, useRef, useEffect } from 'react';
import { useAppStore } from './useAppContext.ts';
import type { AppState, Memory, MemoryType } from '../types.ts';
import { MemoryType as MemoryTypeEnum, LLMProvider } from '../types.ts';
import * as memoryService from '../services/memoryService.ts';
import * as llmService from '../services/llmService.ts';
import { getEmbedding } from '../services/embeddingService.ts';

const REFLECTION_THRESHOLD = 150;
// Reduced from 50 to 25 to make the reflection process more token-efficient.
const REFLECTION_MEMORY_COUNT = 25;

interface AddMemoryOptions {
    description?: string;
    type: MemoryType;
    relatedMemoryIds?: string[];
    fixedImportance?: number;
    name?: string;
    subType?: 'how-to' | 'guide' | 'script';
    parentId?: string;
    content?: string;
    sourceUrl?: string;
}

export const useMemoryManager = () => {
    const stateRef = useRef(useAppStore.getState());
    useEffect(() => {
      const unsubscribe = useAppStore.subscribe(newState => {
          stateRef.current = newState;
      });
      return unsubscribe;
    }, []);

    const { addMemory: addMemoryAction, setMemoryEmbedding, setInsightStatus, setAgentMemoryStream } = useAppStore.getState();
    const isReflecting = useRef<Set<string>>(new Set());

    const addMemory = useCallback(async (agentId: string, options: AddMemoryOptions) => {
        
        const _handleCoreMemory = async (options: AddMemoryOptions): Promise<Memory | null> => {
            if (!options.description) {
                console.error("Core memory requires a description.");
                return null;
            }
            const summaryPrompt = "You are a persona summarization tool. Refine the following description into a single, concise, and impactful sentence that captures the essence of the character. Respond with ONLY the refined sentence.";
            const response = await llmService.getRawResponseForModel('gemini-2.5-flash', LLMProvider.GEMINI, summaryPrompt, options.description, stateRef.current.services);
            return {
                id: `mem-${Date.now()}-${Math.random()}`,
                type: MemoryTypeEnum.CORE,
                description: response.text.trim(),
                importance: 10,
                timestamp: Date.now(),
                lastAccessed: Date.now(),
            };
        };
    
        const _handleSemanticMemory = async (agentId: string, options: AddMemoryOptions): Promise<Memory | null> => {
            if (!options.description) return null;
            const agent = stateRef.current.agents.find(a => a.id === agentId);
            // Sort by importance then timestamp to get the most relevant recent concepts
            const existingSemanticMemories = agent?.memoryStream
                .filter(m => m.type === MemoryTypeEnum.SEMANTIC)
                .sort((a, b) => b.importance - a.timestamp || b.timestamp - a.timestamp) 
                // Reduced from 30 to 20 to make knowledge graph checks more token-efficient.
                .slice(0, 20) || [];
            let parentId = options.parentId;

            // This block implements the proactive hierarchical memory linking inspired by MIRIX.
            if (existingSemanticMemories.length > 0) {
                const conceptList = existingSemanticMemories.map(m => `ID: ${m.id}, Concept: ${m.description}`).join('\n');
                const hierarchyPrompt = `You are a knowledge graph analysis tool. Your task is to determine if a new piece of information is a sub-topic of an existing concept. I will provide a new insight and a list of existing concepts with their IDs. If the new insight is a direct sub-topic or a specific example of ONE of the existing concepts, respond with ONLY the ID of that parent concept (e.g., 'mem-12345'). Do not explain. If it is not a sub-topic of any existing concept, respond with 'None'.`;
                const userContent = `New Insight: "${options.description}"\n\nExisting Concepts:\n${conceptList}`;
                try {
                    const llmResponse = await llmService.getRawResponseForModel('gemini-2.5-flash', LLMProvider.GEMINI, hierarchyPrompt, userContent, stateRef.current.services, {
                        thinkingConfig: { thinkingBudget: 0 }
                    });
                    const potentialParentId = llmResponse.text.trim();
                    if (existingSemanticMemories.some(m => m.id === potentialParentId)) {
                        parentId = potentialParentId;
                    }
                } catch (e) {
                    console.warn("Failed to determine parent for semantic memory:", e);
                }
            }

            const importance = options.fixedImportance ?? await memoryService.rateMemoryImportance(options.description, stateRef.current.userProfile, stateRef.current.services);
            return {
                id: `mem-${Date.now()}-${Math.random()}`,
                type: MemoryTypeEnum.SEMANTIC,
                description: options.description,
                importance,
                timestamp: Date.now(),
                lastAccessed: Date.now(),
                relatedMemoryIds: options.relatedMemoryIds,
                parentId,
            };
        };

        const _handleResourceMemory = async (options: AddMemoryOptions): Promise<Memory | null> => {
            let description = options.description;
            if (!description && options.content) {
                 try {
                    const summaryPrompt = `Summarize the following content in a single, concise sentence. This will be used as a memory description. CONTENT: "${options.content.substring(0, 500)}..."`;
                    const response = await llmService.getRawResponseForModel('gemini-2.5-flash', LLMProvider.GEMINI, '', summaryPrompt, stateRef.current.services);
                    description = response.text.trim();
                } catch (e) {
                    console.warn("Failed to generate summary for resource memory. Using content snippet.", e);
                    description = `Resource: ${options.content.substring(0, 100)}...`;
                }
            }
            if (!description) {
                console.error("Resource memory requires content or a description.");
                return null;
            }
            const importance = options.fixedImportance ?? await memoryService.rateMemoryImportance(options.description, stateRef.current.userProfile, stateRef.current.services);
            return {
                id: `mem-${Date.now()}-${Math.random()}`,
                type: options.type,
                description,
                importance,
                timestamp: Date.now(),
                lastAccessed: Date.now(),
                name: options.name,
                content: options.content,
                sourceUrl: options.sourceUrl,
            };
        };
    
        const _handleDefaultMemory = async (options: AddMemoryOptions): Promise<Memory | null> => {
            if (!options.description) return null;
            const importance = options.fixedImportance ?? await memoryService.rateMemoryImportance(options.description, stateRef.current.userProfile, stateRef.current.services);
            return {
                id: `mem-${Date.now()}-${Math.random()}`,
                type: options.type,
                description: options.description,
                importance,
                timestamp: Date.now(),
                lastAccessed: Date.now(),
                name: options.name,
                subType: options.subType,
            };
        };
    
        const triggerReflection = async (agentId: string, recentMemories: Memory[]) => {
            const agent = stateRef.current.agents.find(a => a.id === agentId);
            if (!agent) return;
            isReflecting.current.add(agentId);
            try {
                const reflections = await memoryService.synthesizeReflections(recentMemories, agent.memoryStream, stateRef.current);
                for (const reflection of reflections) {
                    const newSemanticMemory = await _handleSemanticMemory(agentId, {
                        type: MemoryTypeEnum.SEMANTIC,
                        description: reflection.newReflection,
                        relatedMemoryIds: reflection.supportingMemoryIds
                    });
                    if (newSemanticMemory) {
                        // eslint-disable-next-line @typescript-eslint/no-use-before-define
                        await _createAndEmbedMemory(agentId, newSemanticMemory);
                        setInsightStatus(agentId, true);
                    }
                }
            } catch (error) {
                console.error(`Failed to generate reflections for agent ${agentId}:`, error);
            } finally {
                const updatedMemoryStream = agent.memoryStream.map(mem => 
                    recentMemories.some(rm => rm.id === mem.id) ? { ...mem, importance: 1 } : mem
                );
                setAgentMemoryStream(agentId, updatedMemoryStream);
                isReflecting.current.delete(agentId);
            }
        };

        const _createAndEmbedMemory = async (agentId: string, mem: Memory) => {
            addMemoryAction(agentId, mem);
            if (stateRef.current.services.openAiApiKey) {
                getEmbedding(mem.description, stateRef.current.services)
                    .then(embedding => { if (embedding) setMemoryEmbedding(mem.id, embedding); })
                    .catch(err => console.error(`Failed to generate embedding for memory: ${mem.description}`, err));
            }
            
            if (stateRef.current.game.agentAutonomyEnabled) {
                const agent = stateRef.current.agents.find(a => a.id === agentId);
                if (!agent) return;
                const recentMemories = [...agent.memoryStream, mem].sort((a,b) => b.timestamp - a.timestamp).slice(0, REFLECTION_MEMORY_COUNT);
                const totalImportance = recentMemories.reduce((sum, m) => sum + m.importance, 0);
                if (totalImportance > REFLECTION_THRESHOLD && !isReflecting.current.has(agentId)) {
                    triggerReflection(agentId, recentMemories);
                }
            }
        };

        let newMemory: Memory | null = null;
        try {
            switch(options.type) {
                case MemoryTypeEnum.CORE:
                    newMemory = await _handleCoreMemory(options); break;
                case MemoryTypeEnum.SEMANTIC:
                    newMemory = await _handleSemanticMemory(agentId, options); break;
                case MemoryTypeEnum.RESOURCE:
                    newMemory = await _handleResourceMemory(options); break;
                default:
                    newMemory = await _handleDefaultMemory(options); break;
            }
        } catch(e) {
            console.error(`Error processing memory type ${options.type}:`, e);
            return;
        }
        if (newMemory) {
            await _createAndEmbedMemory(agentId, newMemory);
        }
    }, [addMemoryAction, setMemoryEmbedding, setInsightStatus, setAgentMemoryStream]);

    return { addMemory };
};
