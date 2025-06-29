
import { GoogleGenAI } from "@google/genai";
import type { Agent, Message, Scenario, AgentResponsePayload } from '../types';
import { LLMProvider } from '../types';

function parseJsonResponse(jsonString: string): AgentResponsePayload {
    try {
        let cleanJsonString = jsonString.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = cleanJsonString.match(fenceRegex);
        if (match && match[2]) {
          cleanJsonString = match[2].trim();
        }
        
        const data = JSON.parse(cleanJsonString);

        if (typeof data.speech === 'string') {
            if (data.move) {
                if (data.move.action !== 'move' ||
                    !['up', 'down', 'left', 'right'].includes(data.move.direction) ||
                    typeof data.move.distance !== 'number') {
                    delete data.move;
                }
            }
            return data as AgentResponsePayload;
        }
    } catch (e) {
        console.warn("Failed to parse LLM response as JSON, treating as plain text.", jsonString, e);
    }
    return { speech: jsonString };
}


function generatePrompt(agent: Agent, conversationHistory: Message[], task: string, subTask: string, scenario: Scenario, allAgents: Agent[]): string {
    const historyTranscript = conversationHistory.map(msg => {
        const messageAgent = allAgents.find(a => a.id === msg.agentId);
        const name = messageAgent ? messageAgent.name : "Unknown";
        return `${name}: ${msg.text}`;
    }).join('\n');

    const scenarioLine = scenario.prompt ? `The overall scenario for this discussion is: "${scenario.prompt}"\n` : '';

    const basePrompt = `You are participating in a group discussion.
${scenarioLine}
Your assigned persona is: ${agent.persona}
The main topic of discussion, initiated by the user, is: "${task}"

Conversation History:
---
${historyTranscript}
---

Your specific instruction for this turn is: ${subTask}`;

    if (scenario.movementEnabled) {
        return `${basePrompt}

You have the ability to move your avatar in a 2D space. The environment is a cafe (top area) and an outside street (bottom area).
- The total area is 1024px wide and 1200px high.
- The cafe interior is roughly the area where y < 570. It contains a counter and tables.
- The exit is a doorway at the bottom-center of the cafe, around {x: 512, y: 585}.
- "Outside" is the area where y > 600.
- When asked to move, try to move towards the correct location. For example, 'go outside' means moving your avatar towards a higher y-coordinate, through the exit.

Respond with a JSON object with two keys: "speech" (your spoken text) and an optional "move" object.
The "move" object must have "action": "move", "direction": "up" | "down" | "left" | "right", and "distance": number (e.g., 20).
If you don't want to move, omit the "move" key. The user can also command you to move.
Example response: {"speech": "Let's get some fresh air.", "move": {"action": "move", "direction": "down", "distance": 50}}
Another example: {"speech": "I need a moment to think."}

Respond with only the JSON object, nothing else.`;
    }

    return `${basePrompt}\n\nRespond directly as your character, in a single block of text, without repeating your name or instructions.`;
}

async function callLLM(agent: Agent, prompt: string, scenario: Scenario): Promise<AgentResponsePayload> {
    const { provider, apiKey, model } = agent.llm;
    const isMovementMode = scenario.movementEnabled;

    try {
        if (provider === LLMProvider.GEMINI) {
            if (!process.env.API_KEY) throw new Error("Gemini API key not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: isMovementMode ? { responseMimeType: "application/json" } : undefined,
            });
            
            const text = response.text;
            return isMovementMode ? parseJsonResponse(text) : { speech: text };
        } else { // OpenAI and OpenRouter
            if (!apiKey) throw new Error(`API key for ${provider} is missing.`);
            const url = provider === LLMProvider.OPENAI ? 'https://api.openai.com/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
            
            const headers: Record<string, string> = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
            if (provider === LLMProvider.OPENROUTER) {
                headers['HTTP-Referer'] = window.location.href;
                headers['X-Title'] = 'AI Agent Cafe';
            }

            const body: any = {
                model,
                messages: [{ role: 'user', content: prompt }],
            };
            if (isMovementMode) {
                body.response_format = { type: "json_object" };
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                let errorDetails;
                try {
                    const errorData = await response.json();
                    errorDetails = errorData.error?.message || JSON.stringify(errorData);
                } catch (e) {
                    errorDetails = await response.text();
                }
                throw new Error(errorDetails || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const text = data.choices[0]?.message?.content || '';
            return isMovementMode ? parseJsonResponse(text) : { speech: text };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error calling ${provider} for agent ${agent.name}:`, error);
        return { speech: `[Error communicating with ${provider}: ${errorMessage}]` };
    }
}

export async function getAgentResponse(
  agent: Agent,
  conversationHistory: Message[],
  task: string,
  subTask: string,
  scenario: Scenario,
  allAgents: Agent[]
): Promise<AgentResponsePayload> {
  const prompt = generatePrompt(agent, conversationHistory, task, subTask, scenario, allAgents);
  return callLLM(agent, prompt, scenario);
}

export async function testOpenAICompatible(agent: Agent): Promise<{ success: boolean; error?: string }> {
  const { provider, apiKey, model } = agent.llm;
  if (!apiKey) {
    return { success: false, error: 'API key is missing.' };
  }

  const url = provider === LLMProvider.OPENAI 
    ? 'https://api.openai.com/v1/chat/completions' 
    : 'https://openrouter.ai/api/v1/chat/completions';

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (provider === LLMProvider.OPENROUTER) {
      headers['HTTP-Referer'] = window.location.href; 
      headers['X-Title'] = 'AI Agent Cafe';
  }

  const body = JSON.stringify({
    model,
    messages: [{ role: 'user', content: 'Hi' }],
    max_tokens: 1,
  });

  try {
    const response = await fetch(url, { method: 'POST', headers, body });
    if (!response.ok) {
        let errorDetails = `Provider returned HTTP ${response.status}.`;
        try {
            const errorData = await response.json();
            errorDetails = errorData.error?.message || JSON.stringify(errorData);
        } catch (e) {
            const textError = await response.text();
            errorDetails = textError || `Provider returned a non-JSON error response.`;
        }
        throw new Error(errorDetails);
    }
    await response.json();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`API Key test failed for ${provider}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
    if (!apiKey) return [];
    
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch models: HTTP ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        return data.data
          .filter((model: any) => model.id.includes('gpt'))
          .map((model: any) => model.id)
          .sort();
    } catch (error) {
        console.error("Error fetching OpenAI models:", error);
        return [];
    }
}

export async function fetchOpenRouterModels(apiKey: string): Promise<string[]> {
    if (!apiKey) return [];
    
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch models: HTTP ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        return data.data.map((model: any) => model.id).sort();
    } catch (error) {
        console.error("Error fetching OpenRouter models:", error);
        return [];
    }
}