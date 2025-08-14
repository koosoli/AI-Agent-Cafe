import { GoogleGenAI } from "@google/genai";
import type { LLMProvider } from '../types.ts';
import { LLMProvider as LLMProviderEnum } from '../types.ts';

/**
 * A centralized fetch wrapper. In a production environment with a backend, 
 * this function would be the single point of modification to route all API calls through a secure server-side proxy.
 * @param url The URL to fetch.
 * @param options The RequestInit options.
 * @returns A Promise that resolves to the Response.
 */
export async function makeApiCall(url: string, options: RequestInit): Promise<Response> {
    // In this client-only version, it's a direct fetch.
    return fetch(url, options);
}

/**
 * Tests the validity of a Google Gemini API key by making a simple request.
 * @param apiKey The API key to test.
 * @returns An object indicating success or failure with an error message.
 */
export async function testGeminiApiKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
  if (!apiKey) {
    return { success: false, error: 'API key is missing.' };
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Hi'
    });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Gemini API Key test failed:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Tests an OpenAI-compatible API key (OpenAI or OpenRouter).
 * @param provider The provider to test (OpenAI or OpenRouter).
 * @param apiKey The API key.
 * @param model An optional model to use for the test.
 * @returns An object indicating success or failure with an error message.
 */
export async function testOpenAICompatible(provider: LLMProvider, apiKey: string, model?: string): Promise<{ success: boolean; error?: string }> {
  if (!apiKey) {
    return { success: false, error: 'API key is missing.' };
  }

  const url = provider === LLMProviderEnum.OPENAI 
    ? 'https://api.openai.com/v1/chat/completions' 
    : 'https://openrouter.ai/api/v1/chat/completions';

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (provider === LLMProviderEnum.OPENROUTER) {
      headers['HTTP-Referer'] = window.location.href; 
      headers['X-Title'] = 'AI Agent Cafe';
  }

  const body = JSON.stringify({
    model: model || (provider === LLMProviderEnum.OPENAI ? 'gpt-3.5-turbo' : 'mistralai/mistral-7b-instruct:free'),
    messages: [{ role: 'user', content: 'Hi' }],
    max_tokens: 1,
  });

  try {
    const response = await makeApiCall(url, { method: 'POST', headers, body });
    if (!response.ok) {
        let errorBodyText;
        try {
            const errorData = await response.json();
            errorBodyText = errorData.error?.message || JSON.stringify(errorData);
        } catch (e) {
            errorBodyText = await response.text();
        }
        throw new Error(`Request failed with HTTP ${response.status} (${response.statusText}). Provider message: ${errorBodyText || 'No error message in response body.'}`);
    }
    await response.json();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`API Key test failed for ${provider}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Fetches models from a local AI server.
 * @param url The base URL of the local server.
 * @returns A promise resolving to an array of model names.
 */
async function fetchLocalAIModels(url: string): Promise<string[]> {
    if (!url) return [];
    
    const modelsUrl = `${url.replace(/\/$/, '')}/models`;
    try {
        const response = await makeApiCall(modelsUrl, {});
        if (!response.ok) {
            console.warn(`Could not fetch models from ${modelsUrl}. Status: ${response.status}. This may be normal for some servers.`);
            return [];
        }
        const data = await response.json();
        const modelList = data.data || data.models;
        if (modelList && Array.isArray(modelList)) {
            return modelList.map((model: any) => model.id || model.name).sort();
        }
        return [];
    } catch (error) {
        console.error("Error fetching local AI models:", error);
        return [];
    }
}

/**
 * Tests the connection to a local AI server.
 * @param url The base URL of the local server.
 * @returns An object indicating success, a status message, and a list of detected models.
 */
export async function testLocalAI(url: string): Promise<{ success: boolean; message: string; models: string[] }> {
  if (!url) {
    return { success: false, message: 'Server URL is missing.', models: [] };
  }
  const testUrl = `${url.replace(/\/$/, '')}/chat/completions`;
  try {
    const response = await makeApiCall(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'test-model-for-connection',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
        stream: false,
      }),
    });
    if (!response.ok && ![404, 422, 500].includes(response.status) ) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Connection failed: ${response.status}. ${errorData.error?.message || 'Unknown error.'}`);
    }
    const models = await fetchLocalAIModels(url);
    if (models.length > 0) {
        return { success: true, message: `Connection successful! Found ${models.length} models.`, models };
    } else {
        return { success: true, message: 'Connection successful! Could not auto-detect models. Please enter model names manually.', models: [] };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown network error.';
    return { success: false, message: errorMessage, models: [] };
  }
}

/**
 * Fetches models from a custom AI server.
 * @param url The base URL of the server.
 * @param apiKey The API key.
 * @returns A promise resolving to an array of model names.
 */
async function fetchCustomAIModels(url: string, apiKey: string): Promise<string[]> {
    if (!url) return [];
    const modelsUrl = `${url.replace(/\/$/, '')}/models`;
    const headers: Record<string, string> = apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {};
    try {
        const response = await makeApiCall(modelsUrl, { headers });
        if (!response.ok) {
            console.warn(`Could not fetch models from ${modelsUrl}. Status: ${response.status}.`);
            return [];
        }
        const data = await response.json();
        const modelList = data.data || data.models;
        if (modelList && Array.isArray(modelList)) {
            return modelList.map((model: any) => model.id || model.name).sort();
        }
        return [];
    } catch (error) {
        console.error("Error fetching custom AI models:", error);
        return [];
    }
}

/**
 * Tests the connection to a custom AI server.
 * @param url The base URL of the custom server.
 * @param apiKey The API key for the server.
 * @param testModel A model name to use for the connection test.
 * @returns An object indicating success, a status message, and a list of detected models.
 */
export async function testCustomAI(url: string, apiKey: string, testModel: string): Promise<{ success: boolean; message: string; models: string[] }> {
    if (!url) return { success: false, message: 'Server URL is missing.', models: [] };
    if (!testModel) return { success: false, message: 'Please provide a model name for the test.', models: [] };
    const testUrl = `${url.replace(/\/$/, '')}/chat/completions`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    try {
        const response = await makeApiCall(testUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ model: testModel, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1, stream: false }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Connection test failed: ${response.status}. ${errorData.error?.message || 'Unknown error.'}`);
        }
        const models = await fetchCustomAIModels(url, apiKey);
        if (models.length > 0) {
            return { success: true, message: `Connection successful! Found ${models.length} models.`, models };
        } else {
            return { success: true, message: 'Connection successful! Test model is valid. Other models could not be auto-detected.', models: [] };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown network error.';
        return { success: false, message: errorMessage, models: [] };
    }
}

/**
 * Fetches available GPT models from the OpenAI API.
 * @param apiKey The OpenAI API key.
 * @returns A promise resolving to an array of model names.
 */
export async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
    if (!apiKey) return [];
    try {
        const response = await makeApiCall('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${apiKey}` } });
        if (!response.ok) throw new Error(`Failed to fetch models: HTTP ${response.status}`);
        const data = await response.json();
        return data.data.filter((m: any) => m.id.includes('gpt')).map((m: any) => m.id).sort();
    } catch (error) {
        console.error("Error fetching OpenAI models:", error);
        return [];
    }
}

/**
 * Fetches available models from the OpenRouter API.
 * @param apiKey The OpenRouter API key.
 * @returns A promise resolving to an array of model names.
 */
export async function fetchOpenRouterModels(apiKey: string): Promise<string[]> {
    if (!apiKey) return [];
    try {
        const response = await makeApiCall('https://openrouter.ai/api/v1/models', { headers: { 'Authorization': `Bearer ${apiKey}` } });
        if (!response.ok) throw new Error(`Failed to fetch models: HTTP ${response.status}`);
        const data = await response.json();
        return data.data.map((model: any) => model.id).sort();
    } catch (error) {
        console.error("Error fetching OpenRouter models:", error);
        return [];
    }
}
