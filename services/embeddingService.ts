import type { AppState } from '../types.ts';
import { makeApiCall } from './apiService.ts';

const MAX_EMBEDDING_CACHE_SIZE = 500; // Limit to 500 embeddings to prevent memory leaks.
const embeddingCache = new Map<string, number[]>();

/**
 * Generates a vector embedding for a given text using OpenAI's API.
 * Caches results in memory to avoid redundant API calls.
 * @param text The text to embed.
 * @param services The application's service configuration.
 * @returns A promise resolving to an array of numbers representing the embedding, or null on failure.
 */
export async function getEmbedding(text: string, services: AppState['services']): Promise<number[] | null> {
    if (embeddingCache.has(text)) {
        // Move to end to mark as recently used
        const embedding = embeddingCache.get(text)!;
        embeddingCache.delete(text);
        embeddingCache.set(text, embedding);
        return embedding;
    }

    // The provided @google/genai guidelines do not include an embedding API.
    // As a fallback, this implementation uses OpenAI's embedding API if available.
    if (!services.openAiApiKey) {
        console.warn("getEmbedding requires an OpenAI API key, but none was found.");
        return null;
    }

    try {
        const response = await makeApiCall('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${services.openAiApiKey}`
            },
            body: JSON.stringify({
                input: text,
                model: 'text-embedding-ada-002' // A standard, cost-effective OpenAI embedding model
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI embedding request failed: ${response.status}. ${errorData.error?.message || 'Unknown error.'}`);
        }

        const data = await response.json();
        const embedding = data.data[0]?.embedding || null;
        
        if (embedding) {
            if (embeddingCache.size >= MAX_EMBEDDING_CACHE_SIZE) {
                // Evict the oldest entry to manage memory
                const oldestKey = embeddingCache.keys().next().value;
                embeddingCache.delete(oldestKey);
            }
            embeddingCache.set(text, embedding);
        }
        
        return embedding;

    } catch (error) {
        console.error("Error generating embedding with OpenAI:", error);
        return null;
    }
}