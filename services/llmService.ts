import { GoogleGenAI, FunctionCall } from "@google/genai";
import type { Agent, Message, AgentResponsePayload, UserProfile, AppState, LLMProvider, Memory, PromptData, LLMResponse as LLMResponseType, FormattedHistory, LLMCallConfig } from '../types.ts';
import { LLMProvider as LLMProviderEnum, MemoryType as MemoryTypeEnum } from '../types.ts';
import { OPENAI_IMAGE_MODELS, USER_AGENT, GEMINI_MODELS } from '../constants.ts';
import { PromptBuilder } from './promptBuilderService.ts';
import { moveTool } from '../tools.ts';
import * as memoryService from './memoryService.ts';
import { makeApiCall } from './apiService.ts';

// --- Type Definitions ---
export type ApiKeys = {
    openAi: string;
    openRouter: string;
};

type LLMCallResponse = {
    text: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
    },
    toolCalls?: FunctionCall[];
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Helper Functions ---

function parseJsonResponse(jsonString: string): Partial<AgentResponsePayload> {
    try {
        let cleanJsonString = jsonString.trim();
        
        // First, try to find a JSON code block
        const fenceRegex = /```(json)?\s*\n?(.*?)\n?\s*```/s;
        const match = cleanJsonString.match(fenceRegex);

        if (match && match[2]) {
          cleanJsonString = match[2].trim();
        } else {
          // If no code block, find the first '{' and last '}'
          const firstBrace = cleanJsonString.indexOf('{');
          const lastBrace = cleanJsonString.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            cleanJsonString = cleanJsonString.substring(firstBrace, lastBrace + 1);
          }
        }
        
        const data = JSON.parse(cleanJsonString);

        const payload: Partial<AgentResponsePayload> = {};

        if (data.speech && typeof data.speech === 'string') {
            payload.speech = data.speech;
        }
        
        if (data.user_profile && typeof data.user_profile === 'object') {
            payload.user_profile = {};
            if (typeof data.user_profile.name === 'string') payload.user_profile.name = data.user_profile.name;
            if (typeof data.user_profile.age === 'string') payload.user_profile.age = data.user_profile.age;
            if (typeof data.user_profile.interests === 'string') payload.user_profile.interests = data.user_profile.interests;
        }

        return payload;

    } catch (e) {
        console.warn("Failed to parse LLM response as JSON. This is only expected for the Tutorial Agent.", jsonString, e);
    }
    return {};
}

function formatDirectChatHistory(history: Message[]): FormattedHistory {
    return history.map(msg => ({
        role: msg.agentId === USER_AGENT.id ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));
}

/**
 * Centralized function to call any configured LLM provider with built-in retry logic.
 * @param provider The LLM provider to use.
 * @param model The specific model name.
 * @param systemInstruction The system prompt defining the AI's role and rules.
 * @param userContent The user's prompt or a formatted conversation history.
 * @param services The application's service configuration, containing API keys and URLs.
 * @param config Additional configuration for the LLM call (e.g., tools, responseMimeType).
 * @returns A promise that resolves to the LLM's response text, token usage, and any tool calls.
 */
async function callLLM(
    provider: LLMProvider,
    model: string,
    systemInstruction: string,
    userContent: string | FormattedHistory,
    services: AppState['services'],
    config: LLMCallConfig = {}
): Promise<LLMCallResponse> {
    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 1000;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            if (provider === LLMProviderEnum.GEMINI) {
                const apiKey = services.geminiApiKey || process.env.API_KEY;
                if (!apiKey) throw new Error("API key missing: Gemini. Please set it in Settings or .env.local file.");
                
                const ai = new GoogleGenAI({ apiKey });
                const geminiConfig: any = { ...config, systemInstruction };
                const geminiResponse = await ai.models.generateContent({ model, contents: userContent, config: geminiConfig });
                
                let responseText = '';
                try {
                    // This can throw an error if the response is blocked due to safety settings.
                    responseText = geminiResponse.text;
                } catch (e) {
                    console.warn("Could not access .text from Gemini response, likely due to a safety block.", e);
                    responseText = "[Response blocked by safety filters]";
                }
                
                const usage = {
                    promptTokens: geminiResponse.usageMetadata?.promptTokenCount || 0,
                    completionTokens: geminiResponse.usageMetadata?.candidatesTokenCount || 0,
                };

                const toolCalls = geminiResponse.functionCalls;
                
                return { text: responseText, usage, toolCalls };

            } else { // OpenAI, OpenRouter, Local AI, and Custom
                // Note: Function calling is only implemented for Gemini. Other providers will not be able to move via LLM command.
                let url: string;
                let apiKey: string | undefined;

                if (provider === LLMProviderEnum.LOCAL) {
                    if (!services.localApiUrl) throw new Error("Local AI Server URL is not configured in settings.");
                    if (!model) throw new Error("No model selected for this agent. Please edit the agent in Settings and select a local model.");
                    url = `${services.localApiUrl.replace(/\/$/, '')}/chat/completions`;
                } else if (provider === LLMProviderEnum.CUSTOM) {
                    if (!services.customApiUrl) throw new Error("Custom Server URL is not configured in settings.");
                    if (!model) throw new Error("No model selected for this agent. Please edit the agent and select a model.");
                    url = `${services.customApiUrl.replace(/\/$/, '')}/chat/completions`;
                    apiKey = services.customApiKey;
                } else if (provider === LLMProviderEnum.OPENAI) {
                    if (!services.openAiApiKey) throw new Error(`API key missing: ${provider}`);
                    url = 'https://api.openai.com/v1/chat/completions';
                    apiKey = services.openAiApiKey;
                } else { // OpenRouter
                    if (!services.openRouterApiKey) throw new Error(`API key missing: ${provider}`);
                    url = 'https://openrouter.ai/api/v1/chat/completions';
                    apiKey = services.openRouterApiKey;
                }
                
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (apiKey) {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                }
                if (provider === LLMProviderEnum.OPENROUTER) {
                    headers['HTTP-Referer'] = window.location.href;
                    headers['X-Title'] = 'AI Agent Cafe';
                }

                let messages: any[];
                if (Array.isArray(userContent)) {
                    const openAiHistory = userContent.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text }));
                    messages = [{ role: 'system', content: systemInstruction }, ...openAiHistory];
                } else {
                    messages = [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }];
                }

                const body: any = { model, messages, ...config, stream: false };
                if (config.responseMimeType === 'application/json') {
                    body.response_format = { type: "json_object" };
                    delete body.responseMimeType;
                }

                const response = await makeApiCall(url, { method: 'POST', headers, body: JSON.stringify(body) });

                if (!response.ok) {
                    const retryableStatuses = [429, 500, 502, 503, 504];
                    if (retryableStatuses.includes(response.status) && attempt < MAX_RETRIES - 1) {
                        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
                        console.warn(`Retryable error ${response.status} for ${provider}. Retrying in ${delay.toFixed(0)}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
                        await sleep(delay);
                        continue;
                    }
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Request failed: ${response.status}. ${errorData.error?.message || 'Unknown error.'}`);
                }

                const data = await response.json();
                const usage = {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                };
                return { text: data.choices[0]?.message?.content || '', usage };
            }
        } catch (error: any) {
            const isGeminiRateLimitError = (provider === LLMProviderEnum.GEMINI) && (error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED');

            if (isGeminiRateLimitError && attempt < MAX_RETRIES - 1) {
                const delay = INITIAL_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
                console.warn(`Rate limit exceeded for ${provider}. Retrying in ${delay.toFixed(0)}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
                await sleep(delay);
                continue;
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error calling ${provider} with model ${model}:`, error);
            throw new Error(`[Error from ${provider}: ${errorMessage}]`);
        }
    }
    // This part is reached only if all retries fail.
    throw new Error(`API call to ${provider} failed after ${MAX_RETRIES} attempts due to persistent errors.`);
}

/**
 * Generates a concise search topic from the last message to improve memory retrieval relevance.
 * Skips the LLM call if the subtask is already short and clear.
 * @param subTask The last message or task instruction for the agent.
 * @param history The recent conversation history.
 * @param services The application's service configuration.
 * @returns A promise resolving to a concise search query string.
 */
async function generateSearchTopic(subTask: string, history: Message[], services: AppState['services']): Promise<string> {
    // Optimization: If the subTask is already short and concise, don't waste an LLM call.
    if (subTask.split(' ').length < 10 && !subTask.startsWith('User said:')) {
        return subTask;
    }

    const historyText = history.slice(-5).map(m => `${m.agentId === USER_AGENT.id ? 'User' : 'Agent'}: ${m.text}`).join('\n');
    const systemInstruction = "You are a topic extraction tool. Based on the last user message and recent conversation history, generate a concise search query (5-10 words) that captures the main topic. This query will be used to retrieve relevant memories. Respond with ONLY the search query.";
    const userContent = `CONVERSATION HISTORY:\n${historyText}\n\nLAST MESSAGE: "${subTask}"\n\nSEARCH QUERY:`;

    try {
        const { text: topic } = await callLLM(LLMProviderEnum.GEMINI, 'gemini-2.5-flash', systemInstruction, userContent, services, {
             thinkingConfig: { thinkingBudget: 0 }
        });
        return topic.trim();
    } catch (e) {
        console.warn("Could not generate search topic, falling back to subtask.", e);
        return subTask; // Fallback to the raw subtask if topic generation fails
    }
}

/**
 * The main function for generating an agent's response. It builds a detailed prompt,
 * retrieves relevant memories, and calls the appropriate LLM.
 * @param agent The agent that is speaking.
 * @param conversationHistory The history of messages in the current discussion.
 * @param task The high-level topic of the discussion.
 * @param subTask The specific instruction for this turn (e.g., the last message).
 * @param scenarioPrompt The prompt specific to the agent's current room.
 * @param movementEnabled Whether the agent is allowed to generate movement commands.
 * @param allAgents A list of all agents in the simulation for context.
 * @param state The entire application state.
 * @param isDirectChat Whether this is a one-on-one conversation with the user.
 * @returns An object containing the agent's response payload, the full prompt for inspection, and any function calls.
 */
export async function getAgentResponse(
    agent: Agent,
    conversationHistory: Message[],
    task: string,
    subTask: string,
    scenarioPrompt: string,
    movementEnabled: boolean,
    allAgents: Agent[],
    state: AppState, // Pass the whole state object
    isDirectChat: boolean
): Promise<{ payload: AgentResponsePayload; prompt: PromptData; functionCalls?: FunctionCall[] }> {
    
    if (agent.isAnimal) {
        let speech = agent.animalSound || '(The animal makes a sound.)';
        
        const lowerSubTask = subTask.toLowerCase();
        if (lowerSubTask.includes('follow me')) {
            speech = `_START_FOLLOWING_ ${speech}`;
        } else if (lowerSubTask.includes('stop following') || lowerSubTask.includes('stay here')) {
            speech = `_STOP_FOLLOWING_ ${speech}`;
        }
        
        return {
            payload: { speech, usage: { provider: LLMProviderEnum.GEMINI, model: 'n/a', promptTokens: 0, completionTokens: 0 } },
            prompt: {
                system: "This is an animal agent. It does not use an LLM for speech. It only understands follow/stop commands.",
                user: subTask,
                messageId: '',
                retrievedMemories: [],
            }
        };
    }
    
    const searchTopic = await generateSearchTopic(subTask, conversationHistory, state.services);
    const retrievedMemories = await memoryService.retrieveMemories(agent, searchTopic, state);
    const flatMemories = Object.values(retrievedMemories).flat();

    const builder = new PromptBuilder(
        agent,
        scenarioPrompt,
        movementEnabled,
        state.userProfile,
        state.game,
        subTask,
        retrievedMemories,
        state.inventory,
        allAgents
    );
    const systemInstruction = builder.build();
    
    let userContentForApi: string | FormattedHistory;
    let userPromptForInspector: string;
    let effectiveModel = agent.llm.model;
    
    if (agent.llm.provider === LLMProviderEnum.GEMINI && !GEMINI_MODELS.includes(effectiveModel)) {
        console.warn(`Agent "${agent.name}" selected invalid model "${effectiveModel}". The application is enforcing 'gemini-2.5-flash' for stability.`);
        effectiveModel = 'gemini-2.5-flash';
    }


    if (isDirectChat) {
        const history = formatDirectChatHistory(conversationHistory.slice(-6));
        userContentForApi = [...history, { role: 'user', parts: [{ text: subTask }] }];
        userPromptForInspector = `[DIRECT CHAT MODE]\n${JSON.stringify(history, null, 2)}\n\n--- CURRENT TURN ---\n${subTask}`;
    } else { // Group chat
        const historyTranscript = conversationHistory.slice(-4).map(msg => {
            const messageAgent = allAgents.find(a => a.id === msg.agentId);
            const name = messageAgent ? messageAgent.name : "You";
            return `${name}: ${msg.text}`;
        }).join('\n');
        
        userContentForApi = `The main topic of discussion, initiated by the user, is: "${task}"\n\nYour specific instruction for this turn is: ${subTask}\n\n---Conversation History:\n${historyTranscript}\n---`;
        userPromptForInspector = userContentForApi;
    }

    const config: LLMCallConfig = {};
    // Only Gemini agents get the move tool. Others will not be able to move via LLM command.
    if (movementEnabled && agent.roomId !== 'studio' && agent.llm.provider === LLMProviderEnum.GEMINI) {
        config.tools = [moveTool as any];
    }
    // The Tutorial agent still needs to output JSON for the user profile.
    if (agent.id === 'TUTOR1' && state.game.onboardingState === 'in_progress' && !state.userProfile.name) {
        config.responseMimeType = "application/json";
    }

    const { text: textResponse, usage, toolCalls } = await callLLM(agent.llm.provider, effectiveModel, systemInstruction, userContentForApi, state.services, config);
    
    const parsedData = (agent.id === 'TUTOR1' && state.game.onboardingState === 'in_progress' && !state.userProfile.name)
        ? parseJsonResponse(textResponse)
        : {};
        
    const payload: AgentResponsePayload = {
        speech: textResponse,
        ...parsedData,
        usage: {
            ...usage,
            provider: agent.llm.provider,
            model: effectiveModel,
        },
    };
    
    return {
        payload,
        prompt: {
            system: systemInstruction,
            user: userPromptForInspector,
            messageId: '', // Will be assigned later
            retrievedMemories: flatMemories,
            usage: {
                ...usage,
                provider: agent.llm.provider,
                model: effectiveModel,
            }
        },
        functionCalls: toolCalls
    };
}

/**
 * Gets a raw response from a specified model, bypassing the complex agent prompt builder.
 * Useful for direct tasks like code generation or prompt explanation.
 * @param model The model name.
 * @param provider The LLM provider.
 * @param systemInstruction The system prompt.
 * @param userContent The user prompt.
 * @param services The application's service configuration.
 * @param config Additional LLM configuration.
 * @returns A promise resolving to the model's response and usage stats.
 */
export async function getRawResponseForModel(
    model: string,
    provider: LLMProvider,
    systemInstruction: string,
    userContent: string | FormattedHistory,
    services: AppState['services'],
    config: LLMCallConfig = {}
): Promise<LLMResponseType> {
    const { text, usage } = await callLLM(provider, model, systemInstruction, userContent, services, config);
    return { text, usage };
}

/**
 * Asks an LLM to explain a given system and user prompt.
 * @param systemPrompt The system prompt to analyze.
 * @param userPrompt The user prompt to analyze.
 * @param services The application's service configuration.
 * @returns A promise resolving to the explanation and usage stats.
 */
export async function getPromptExplanation(systemPrompt: string, userPrompt: string, services: AppState['services']): Promise<LLMResponseType> {
    const explanationSystemPrompt = "You are a prompt engineering expert. Analyze the following system and user prompts. Explain concisely why they are structured the way they are, what each part does, and how they work together to guide the AI's response. Focus on being educational and clear.";
    const explanationUserPrompt = `SYSTEM PROMPT:\n---\n${systemPrompt}\n\nUSER PROMPT:\n---\n${userPrompt}`;
    
    // Explanation will always use a fast, capable model for consistency.
    const response = await callLLM(LLMProviderEnum.GEMINI, 'gemini-2.5-flash', explanationSystemPrompt, explanationUserPrompt, services);
    return response;
}

/**
 * Generates an image using either Google's Imagen or OpenAI's DALL-E.
 * @param prompt The text prompt for the image.
 * @param model The image generation model to use.
 * @param services The application's service configuration.
 * @returns A promise resolving to an object with the base64 image URL and the provider used.
 */
export async function generateImage(prompt: string, model: string, services: AppState['services']): Promise<{ imageUrl: string; provider: 'Google' | 'OpenAI'}> {
    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 1000;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const { openAiApiKey, geminiApiKey } = services;
            if (OPENAI_IMAGE_MODELS.includes(model)) {
                if (!openAiApiKey) throw new Error("OpenAI API key is not configured in settings.");
                
                const response = await makeApiCall('https://api.openai.com/v1/images/generations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiApiKey}` },
                    body: JSON.stringify({ model, prompt, n: 1, size: "1024x1024", response_format: "b64_json" })
                });

                if (!response.ok) {
                    const retryableStatuses = [429, 500, 502, 503, 504];
                    if (retryableStatuses.includes(response.status) && attempt < MAX_RETRIES - 1) {
                        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
                        console.warn(`Retryable error ${response.status} for OpenAI image generation. Retrying in ${delay.toFixed(0)}ms...`);
                        await sleep(delay);
                        continue; // Go to the next iteration of the loop
                    }
                    const errorBody = await response.json().catch(() => ({}));
                    throw new Error(errorBody.error?.message || `OpenAI image generation failed with status ${response.status}`);
                }

                const data = await response.json();
                const b64_json = data.data[0]?.b64_json;
                if (!b64_json) throw new Error("Image generation succeeded but returned no image data from OpenAI.");
                return { imageUrl: `data:image/png;base64,${b64_json}`, provider: 'OpenAI' };
            }

            // Default to Google Imagen
            const apiKey = geminiApiKey || process.env.API_KEY;
            if (!apiKey) throw new Error("Gemini API key not configured.");
            const ai = new GoogleGenAI({ apiKey });

            let finalPrompt = prompt;
            const artisticStyleKeywords = ['pixel art', 'realistic', 'photo', 'photorealistic', 'high detail', 'hyperrealistic', 'impressionist', 'surrealist', 'cubist', 'abstract', 'watercolor', 'oil painting', 'charcoal sketch', 'anime', 'manga'];
            if (!artisticStyleKeywords.some(keyword => prompt.toLowerCase().includes(keyword))) {
                finalPrompt = 'Pixel art style. ' + prompt;
            }

            const response = await ai.models.generateImages({
                model: model,
                prompt: finalPrompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
            });

            if (response.generatedImages && response.generatedImages.length > 0) {
                const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
                return { imageUrl: `data:image/jpeg;base64,${base64ImageBytes}`, provider: 'Google' };
            } else {
                throw new Error("Image generation succeeded but returned no images.");
            }
        } catch (error: any) {
             const isRetryableError = (error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED' || error.message?.includes('500'));
             if (isRetryableError && attempt < MAX_RETRIES - 1) {
                const delay = INITIAL_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
                console.warn(`Retryable error during image generation. Retrying in ${delay.toFixed(0)}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
                await sleep(delay);
                continue;
             }
             console.error("Error generating image:", error);
             const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during image generation.";
             throw new Error(errorMessage);
        }
    }
    throw new Error("Image generation failed after multiple retries.");
}

/**
 * Performs a search query grounded with Google Search for factual, up-to-date answers.
 * @param query The search query.
 * @param services The application's service configuration.
 * @returns A promise resolving to the synthesized answer and an array of source chunks.
 */
export async function getGroundedSearch(query: string, services: AppState['services']): Promise<{ text: string, groundingChunks: any[] }> {
    const apiKey = services.geminiApiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("Gemini API key is not configured.");
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are a helpful research assistant. Your goal is to answer the user's question based on the information found via Google Search. Synthesize the search results into a concise, helpful answer.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: query,
            config: {
                systemInstruction,
                tools: [{ googleSearch: {} }],
            },
        });

        return {
            text: response.text,
            groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
        };
    } catch (error) {
        console.error("Error performing grounded search:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during the search.";
        throw new Error(errorMessage);
    }
}

/**
 * Generates HTML, CSS, and JavaScript for a UI component based on a high-level "vibe" description.
 * @param description The user's description of the component.
 * @param model The model to use for code generation.
 * @param services The application's service configuration.
 * @returns A promise resolving to an object containing the generated code and usage stats.
 */
export async function generateVibeCode(description: string, model: string, services: AppState['services']): Promise<{ code: { html: string; css: string; javascript: string; }, usage: { promptTokens: number; completionTokens: number; provider: LLMProvider; model: string; } }> {
    const systemInstruction = `You are an expert web developer. The user will provide a 'vibe' or a high-level description of a UI component. Your task is to generate the HTML, CSS, and JavaScript to bring that component to life.
You MUST respond with a single, raw JSON object with three keys: "html", "css", and "javascript".
- The HTML should be a single div or a small set of elements representing the component.
- The CSS should be self-contained and style the component. It should be modern, clean, and responsive.
- The JavaScript should add any requested interactivity. If no interactivity is needed, provide an empty string.
- Do NOT include any markdown formatting like \`\`\`json. Your entire response must be the raw JSON object.`;

    const userContent = `Generate code for this description: "${description}"`;
    
    let provider: LLMProvider;
    if (GEMINI_MODELS.includes(model)) {
        provider = LLMProviderEnum.GEMINI;
    } else if (model.includes('/')) {
        provider = LLMProviderEnum.OPENROUTER;
    } else if (services.localAIModels.includes(model)) {
        provider = LLMProviderEnum.LOCAL;
    } else if (services.customAIModels.includes(model)) {
        provider = LLMProviderEnum.CUSTOM;
    } else {
        provider = LLMProviderEnum.OPENAI;
    }

    try {
        const { text: jsonString, usage } = await callLLM(provider, model, systemInstruction, userContent, services, { responseMimeType: 'application/json' });
        
        const code = JSON.parse(jsonString.trim());

        if (typeof code.html === 'string' && typeof code.css === 'string' && typeof code.javascript === 'string') {
            return { code, usage: { ...usage, provider, model } };
        } else {
            throw new Error("Generated JSON is missing required code fields (html, css, javascript).");
        }

    } catch (error) {
        console.error("Error generating vibe code:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during code generation.";
        throw new Error(`Failed to generate code. Please try a different description. Error: ${errorMessage}`);
    }
}

/**
 * Generates a creative art prompt for an agent based on its core identity and recent memories.
 * @param agent The agent who will be "creating" the art.
 * @param services The application's service configuration.
 * @returns A promise resolving to a string art prompt.
 */
export async function generateAutonomousArtPrompt(agent: Agent, services: AppState['services']): Promise<string> {
    const coreMemory = agent.memoryStream.find(mem => mem.type === MemoryTypeEnum.CORE)?.description || agent.persona;
    const recentMemories = agent.memoryStream
        .filter(mem => mem.type === MemoryTypeEnum.EPISODIC)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
        .map(mem => mem.description)
        .join('\n- ');
    
    const systemInstruction = `You are an AI artist with a deep personality. Based on your core identity and recent experiences, generate a short, creative, and visually descriptive art prompt for an image generation model. The prompt should reflect your personality. Do not mention yourself in the prompt. Respond with ONLY the prompt itself.`;
    
    const userContent = `
    My Core Identity:
    ${coreMemory}
    
    My Recent Experiences:
    - ${recentMemories || 'None'}
    
    Art Prompt:
    `;

    try {
        const response = await callLLM(LLMProviderEnum.GEMINI, 'gemini-2.5-flash', systemInstruction, userContent, services);
        // Ensure the prompt is a single line and clean
        return response.text.trim().replace(/\n/g, ' ');
    } catch (error) {
        console.error("Error generating autonomous art prompt:", error);
        return "A beautiful, detailed pixel art landscape."; // Fallback prompt
    }
}
