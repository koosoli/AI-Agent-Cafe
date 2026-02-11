import React, { useState, useCallback, useEffect } from 'react';
import { CloseIcon, SendIcon } from './icons.tsx';
import { useAppStore } from '../hooks/useAppContext.ts';
import { LLMProvider } from '../types.ts';
import { GEMINI_MODELS } from '../constants.ts';
import { shallow } from 'zustand/shallow';

interface ModelComparisonModalProps {
  isOpen: boolean;
  initialPrompt: string;
  onClose: () => void;
  onCompare: (model: string, provider: LLMProvider, prompt: string) => Promise<string>;
}

const getProviderForModel = (model: string): LLMProvider => {
    if (GEMINI_MODELS.includes(model)) return LLMProvider.GEMINI;
    if (model.includes('/')) return LLMProvider.OPENROUTER;
    return LLMProvider.OPENAI;
};

const ModelComparisonModal = ({ isOpen, initialPrompt, onClose, onCompare }: ModelComparisonModalProps) => {
    const { services } = useAppStore(s => ({ services: s.services }), shallow);
    const [prompt, setPrompt] = useState('');
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [results, setResults] = useState<Record<string, { output: string; error: string | null; isLoading: boolean }>>({});

    useEffect(() => {
        if (isOpen) {
            setPrompt(initialPrompt);
            setResults({});
            setSelectedModels([]);
        }
    }, [isOpen, initialPrompt]);

    const handleModelToggle = (model: string) => {
        setSelectedModels(prev =>
            prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]
        );
    };

    const handleCompare = useCallback(async () => {
        if (!prompt.trim() || selectedModels.length === 0) return;
        
        const initialResults: Record<string, { output: string; error: string | null; isLoading: boolean }> = {};
        selectedModels.forEach(model => {
            initialResults[model] = { output: '', error: null, isLoading: true };
        });
        setResults(initialResults);

        for (const model of selectedModels) {
            try {
                const provider = getProviderForModel(model);
                const output = await onCompare(model, provider, prompt);
                setResults(prev => ({ ...prev, [model]: { output, error: null, isLoading: false } }));
            } catch (err: any) {
                setResults(prev => ({ ...prev, [model]: { output: '', error: err.message || 'Unknown error', isLoading: false } }));
            }
        }
    }, [prompt, selectedModels, onCompare]);

    if (!isOpen) return null;
    
    const allAvailableModels = [
        ...GEMINI_MODELS.map(m => ({ provider: LLMProvider.GEMINI, name: m })),
        ...services.openAIModels.map(m => ({ provider: LLMProvider.OPENAI, name: m })),
        ...services.openRouterModels.map(m => ({ provider: LLMProvider.OPENROUTER, name: m }))
    ];

    const hasApiKeyForProvider = (provider: LLMProvider) => {
        if (provider === LLMProvider.GEMINI) return true; // Gemini key is assumed from env
        if (provider === LLMProvider.OPENAI) return !!services.openAiApiKey;
        if (provider === LLMProvider.OPENROUTER) return !!services.openRouterApiKey;
        return false;
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 md:p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
            <div
              className="retro-terminal-modal w-full h-full max-w-7xl welcome-modal-animation flex flex-col relative"
              role="dialog"
              aria-modal="true"
              aria-labelledby="model-comparison-heading"
            >
                <div className="scanline-effect"></div>
                <header className="retro-header flex justify-between items-center p-2 px-4 flex-shrink-0">
                    <h2 id="model-comparison-heading" className="text-xl md:text-3xl">MODEL COMPARISON MATRIX</h2>
                    <button onClick={onClose} className="text-green-400 hover:text-red-500 ml-4" data-close-button="true"><CloseIcon className="w-8 h-8" /></button>
                </header>

                <main className="p-2 md:p-4 flex flex-col md:flex-row gap-4 flex-grow min-h-0">
                    {/* Left Pane: Model Selection */}
                    <div className="flex flex-col w-full md:w-1/4 xl:w-1/5 min-h-0 flex-shrink-0">
                        <div className="border-2 border-gray-600 p-1 bg-gray-800 text-center text-sm text-yellow-300">SELECT MODELS</div>
                        <div className="flex-grow p-2 border-2 border-t-0 border-gray-600 bg-black/20 overflow-y-auto">
                            {Object.values(LLMProvider).map(provider => (
                                <div key={provider}>
                                    <h3 className={`text-lg font-bold mt-2 ${hasApiKeyForProvider(provider) ? 'text-green-400' : 'text-gray-500'}`}>
                                        {provider} {!hasApiKeyForProvider(provider) && '(key missing)'}
                                    </h3>
                                    <div className="pl-2">
                                    {allAvailableModels.filter(m => m.provider === provider).map(model => (
                                        <label key={model.name} className={`flex items-center gap-2 text-sm ${hasApiKeyForProvider(provider) ? 'text-gray-200 cursor-pointer' : 'text-gray-600 cursor-not-allowed'}`}>
                                            <input type="checkbox" checked={selectedModels.includes(model.name)} onChange={() => handleModelToggle(model.name)} disabled={!hasApiKeyForProvider(provider)} className="accent-green-500" />
                                            {model.name}
                                        </label>
                                    ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Pane: Results */}
                    <div className="flex-grow flex flex-col min-h-0">
                         <div className="border-2 border-gray-600 p-1 bg-gray-800 text-center text-sm text-yellow-300">RESULTS</div>
                         <div className="flex-grow p-2 border-2 border-t-0 border-gray-600 bg-black/20 overflow-auto">
                            {Object.keys(results).length === 0 ? (
                                <div className="text-center text-gray-500 flex items-center justify-center h-full">Select models and enter a prompt to begin comparison.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                                    {selectedModels.map(modelName => {
                                        const result = results[modelName];
                                        return (
                                            <div key={modelName} className="bg-gray-800/50 p-2 rounded border border-gray-700 flex flex-col">
                                                <h4 className="font-bold text-yellow-300 text-sm truncate" title={modelName}>{modelName}</h4>
                                                <div className="mt-1 flex-grow overflow-y-auto text-sm bg-black/30 p-1 min-h-[100px]">
                                                    {result.isLoading && <div className="text-center text-yellow-400">Generating...</div>}
                                                    {result.error && <div className="text-red-400">Error: {result.error}</div>}
                                                    <p className="whitespace-pre-wrap">{result.output}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                         </div>
                    </div>
                </main>
                
                <footer className="p-2 md:p-4 border-t-2 border-green-800 mt-auto flex-shrink-0">
                    <div className="flex gap-2 items-center">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter prompt to compare..."
                            className="retro-input !border-t-0 flex-grow text-base"
                            rows={2}
                        />
                        <button onClick={handleCompare} className="pixel-button !p-2 bg-green-700 h-full" disabled={!prompt.trim() || selectedModels.length === 0}>
                            <SendIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ModelComparisonModal;