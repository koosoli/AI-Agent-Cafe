import { afterEach, describe, expect, it, vi } from 'vitest';
import { LLMProvider } from '../types.ts';
import { DEFAULT_OPENROUTER_MODELS, testOpenAICompatible } from './apiService.ts';

describe('testOpenAICompatible', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('uses a live OpenRouter model instead of a stale hardcoded fallback when no model is provided', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                data: [
                    { id: 'some/other-model' },
                    { id: 'openai/gpt-4o-mini' },
                ],
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                choices: [{ message: { content: 'ok' } }],
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

        vi.stubGlobal('fetch', fetchMock);

        const result = await testOpenAICompatible(LLMProvider.OPENROUTER, 'test-key');

        expect(result).toEqual({ success: true });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/models');
        expect(fetchMock.mock.calls[1][0]).toBe('https://openrouter.ai/api/v1/chat/completions');
        expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toMatchObject({
            model: 'openai/gpt-4o-mini',
            max_tokens: 1,
        });
    });

    it('falls back to the first default OpenRouter model when model discovery returns nothing', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                choices: [{ message: { content: 'ok' } }],
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

        vi.stubGlobal('fetch', fetchMock);

        const result = await testOpenAICompatible(LLMProvider.OPENROUTER, 'test-key');

        expect(result).toEqual({ success: true });
        expect(JSON.parse(fetchMock.mock.calls[1][1].body as string).model).toBe(DEFAULT_OPENROUTER_MODELS[0]);
    });
});
