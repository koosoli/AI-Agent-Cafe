import { describe, expect, it } from 'vitest';
import { LLMProvider } from '../types.ts';
import { llmServiceTestUtils } from './llmService.ts';

describe('resolveEffectiveProviderConfig', () => {
    it('falls back from default Gemini agents to OpenRouter when only OpenRouter is configured', () => {
        const result = llmServiceTestUtils.resolveEffectiveProviderConfig(
            {
                id: 'TUTOR1',
                llm: { provider: LLMProvider.GEMINI, model: 'gemini-2.5-flash' },
            } as any,
            {
                geminiApiKey: '',
                openAiApiKey: '',
                openRouterApiKey: 'router-key',
                localApiUrl: '',
                customApiUrl: '',
                openAIModels: [],
                openRouterModels: ['openai/gpt-4o-mini'],
                localAIModels: [],
                customAIModels: [],
            } as any,
        );

        expect(result).toEqual({
            provider: LLMProvider.OPENROUTER,
            model: 'openai/gpt-4o-mini',
            usedFallback: true,
        });
    });

    it('keeps Gemini when Gemini is configured for the agent', () => {
        const result = llmServiceTestUtils.resolveEffectiveProviderConfig(
            {
                id: 'TUTOR1',
                llm: { provider: LLMProvider.GEMINI, model: 'gemini-2.5-flash' },
            } as any,
            {
                geminiApiKey: 'gemini-key',
                openAiApiKey: '',
                openRouterApiKey: 'router-key',
                localApiUrl: '',
                customApiUrl: '',
                openAIModels: [],
                openRouterModels: ['openai/gpt-4o-mini'],
                localAIModels: [],
                customAIModels: [],
            } as any,
        );

        expect(result).toEqual({
            provider: LLMProvider.GEMINI,
            model: 'gemini-2.5-flash',
            usedFallback: false,
        });
    });
});
