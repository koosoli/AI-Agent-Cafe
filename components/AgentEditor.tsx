

import React, { useState, useMemo } from 'react';
import type { Agent, Memory } from '../types.ts';
import { LLMProvider, MemoryType } from '../types.ts';
import { TrashIcon, StarIcon, InspectIcon } from './icons.tsx';
import { GEMINI_MODELS } from '../constants.ts';
import { PERSONA_TEMPLATES } from '../data/personas.ts';
import type { ElevenLabsVoice, OpenAIVoice, MicrosoftVoice } from '../services/speechService.ts';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';
type OpenAITestState = { status: TestStatus; message: string; services: { llm: boolean; tts: boolean } };

export interface AgentEditorProps {
    agent: Agent;
    onUpdate: (updatedFields: Partial<Agent>) => void;
    onLlmUpdate: (updatedLlm: Partial<Agent['llm']>) => void;
    onVoiceChange: (voiceURI: string) => void;
    onDelete?: () => void;
    onInspectMind?: () => void;
    isNew: boolean;
    openAIModels: string[];
    openRouterModels: string[];
    localAIModels: string[];
    customAIModels: string[];
    localAgentVoices: Record<string, string>;
    browserVoices: SpeechSynthesisVoice[];
    openAiTest?: OpenAITestState;
    elevenLabsTest?: { status: TestStatus; message: string; };
    microsoftTest?: { status: TestStatus; message: string; };
    elevenLabsVoices?: ElevenLabsVoice[];
    openAIVoices: OpenAIVoice[];
    microsoftVoices: MicrosoftVoice[];
}

const AgentEditor = ({
    agent,
    onUpdate,
    onLlmUpdate,
    onVoiceChange,
    onDelete,
    onInspectMind,
    isNew,
    openAIModels,
    openRouterModels,
    localAIModels,
    customAIModels,
    localAgentVoices,
    browserVoices,
    openAiTest,
    elevenLabsTest,
    microsoftTest,
    elevenLabsVoices,
    openAIVoices,
    microsoftVoices,
}: AgentEditorProps) => {
    const [modelFilter, setModelFilter] = useState('');
    const [voiceFilter, setVoiceFilter] = useState('');
    
    const coreMemory = useMemo(() => agent.memoryStream.find(m => m.type === MemoryType.CORE), [agent.memoryStream]);

    const availableOpenAIModels = useMemo(() => {
        const source = openAIModels.length > 0 ? openAIModels : ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
        if (!modelFilter) return source;
        return source.filter(m => m.toLowerCase().includes(modelFilter.toLowerCase()));
    }, [openAIModels, modelFilter]);

    const availableOpenRouterModels = useMemo(() => {
        const source = openRouterModels.length > 0 ? openRouterModels : ['openai/gpt-4o', 'mistralai/mistral-7b-instruct:free'];
        if (!modelFilter) return source;
        return source.filter(m => m.toLowerCase().includes(modelFilter.toLowerCase()));
    }, [openRouterModels, modelFilter]);

    const filteredBrowserVoices = useMemo(() => {
        if (!voiceFilter) return browserVoices;
        const lowerCaseFilter = voiceFilter.toLowerCase();
        return browserVoices.filter(v =>
            v.name.toLowerCase().includes(lowerCaseFilter) ||
            v.lang.toLowerCase().includes(lowerCaseFilter)
        );
    }, [browserVoices, voiceFilter]);

    const filteredOpenAIVoices = useMemo(() => {
        if (!voiceFilter) return openAIVoices;
        return openAIVoices.filter(v => v.name.toLowerCase().includes(voiceFilter.toLowerCase()));
    }, [openAIVoices, voiceFilter]);

    const filteredElevenLabsVoices = useMemo(() => {
        if (!elevenLabsVoices || !voiceFilter) return elevenLabsVoices || [];
        return elevenLabsVoices.filter(v => v.name.toLowerCase().includes(voiceFilter.toLowerCase()));
    }, [elevenLabsVoices, voiceFilter]);
    
    const filteredMicrosoftVoices = useMemo(() => {
        if (!microsoftVoices || !voiceFilter) return microsoftVoices;
        return microsoftVoices.filter(v => v.DisplayName.toLowerCase().includes(voiceFilter.toLowerCase()));
    }, [microsoftVoices, voiceFilter]);

    const handlePersonaTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newPersona = e.target.value;
        if (coreMemory) {
            const updatedMemory: Memory = { ...coreMemory, description: newPersona };
            onUpdate({ 
                memoryStream: agent.memoryStream.map(mem => mem.id === coreMemory.id ? updatedMemory : mem)
            });
        }
    };

    const handlePersonaTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const templateId = e.target.value;
        const personaText = PERSONA_TEMPLATES[templateId] || coreMemory?.description || agent.persona;

        if (templateId === 'custom') {
            onUpdate({ personaTemplateId: 'custom' });
        } else {
            if (coreMemory) {
                 const newMemoryStream = agent.memoryStream.map(mem => mem.id === coreMemory.id ? { ...coreMemory, description: personaText } : mem);
                 onUpdate({ memoryStream: newMemoryStream, personaTemplateId: templateId });
            }
        }
    };
    
    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProvider = e.target.value as LLMProvider;
        let newModel: string;
        setModelFilter(''); // Reset model filter on provider change

        if (newProvider === LLMProvider.GEMINI) {
            newModel = GEMINI_MODELS[0];
        } else if (newProvider === LLMProvider.OPENAI) {
            newModel = 'gpt-4o';
        } else if (newProvider === LLMProvider.OPENROUTER) {
            newModel = 'openai/gpt-4o';
        } else if (newProvider === LLMProvider.LOCAL) {
            newModel = localAIModels.length > 0 ? localAIModels[0] : '';
        } else if (newProvider === LLMProvider.CUSTOM) {
            newModel = customAIModels.length > 0 ? customAIModels[0] : '';
        } else {
            newModel = agent.llm.model;
        }

        onLlmUpdate({ provider: newProvider, model: newModel });
    };
    
    const personaText = coreMemory?.description || agent.persona;

    return (
        <div className="space-y-4">
            <h3 className="text-2xl text-yellow-300">Editing: {agent.name}</h3>
            <div>
                <label className="block font-bold mb-1">Name</label>
                <input type="text" value={agent.name} onChange={e => onUpdate({ name: e.target.value })} className="pixel-input" />
            </div>
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={agent.isModerator || false} onChange={e => onUpdate({ isModerator: e.target.checked })} className="w-5 h-5"/>
                    Is Moderator <StarIcon className="w-5 h-5 text-yellow-400" filled />
                </label>
                {agent.isModerator && (
                    <div className="flex items-center gap-2">
                        <label htmlFor={`feedback-loops-${agent.id}`} className="block font-bold">Feedback Loops:</label>
                        <input 
                            id={`feedback-loops-${agent.id}`}
                            type="number" 
                            min="0" 
                            max="5" 
                            step="1"
                            value={agent.feedbackLoopLimit ?? 1} 
                            onChange={e => onUpdate({ feedbackLoopLimit: parseInt(e.target.value, 10) })}
                            className="pixel-input !w-20" 
                        />
                    </div>
                )}
            </div>
            <div>
                <label className="block font-bold mb-1">Persona (Core Memory)</label>
                 <select
                    className="pixel-select mb-2"
                    value={(agent.personaTemplateId && PERSONA_TEMPLATES[agent.personaTemplateId]) ? agent.personaTemplateId : 'custom'}
                    onChange={handlePersonaTemplateChange}
                 >
                    <option value="custom">-- Custom Persona --</option>
                    {Object.keys(PERSONA_TEMPLATES).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                <textarea 
                    value={personaText}
                    onChange={handlePersonaTextChange} 
                    rows={4} 
                    className="pixel-textarea" 
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block font-bold mb-1">AI Provider</label>
                    <select value={agent.llm.provider} onChange={handleProviderChange} className="pixel-select">
                        {Object.values(LLMProvider).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block font-bold mb-1">Model</label>
                    {agent.llm.provider !== LLMProvider.GEMINI && (
                      <input
                          type="text"
                          placeholder="Filter models..."
                          value={modelFilter}
                          onChange={(e) => setModelFilter(e.target.value)}
                          className="pixel-input mb-1"
                      />
                    )}
                    {agent.llm.provider === LLMProvider.GEMINI && (
                        <select value={agent.llm.model} onChange={e => onLlmUpdate({ model: e.target.value })} className="pixel-select">
                            {GEMINI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    )}
                    {agent.llm.provider === LLMProvider.OPENAI && (
                        <select value={agent.llm.model} onChange={e => onLlmUpdate({ model: e.target.value })} className="pixel-select">
                            {availableOpenAIModels.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    )}
                     {agent.llm.provider === LLMProvider.OPENROUTER && (
                        <select value={agent.llm.model} onChange={e => onLlmUpdate({ model: e.target.value })} className="pixel-select">
                            {availableOpenRouterModels.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    )}
                    {agent.llm.provider === LLMProvider.LOCAL && (
                        localAIModels.length > 0 ? (
                            <select
                                value={agent.llm.model}
                                onChange={e => onLlmUpdate({ model: e.target.value })}
                                className="pixel-select"
                            >
                                <option value="" disabled>-- Select a model --</option>
                                {localAIModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="Enter model name (e.g., llama3)"
                                value={agent.llm.model}
                                onChange={e => onLlmUpdate({ model: e.target.value })}
                                className="pixel-input"
                            />
                        )
                    )}
                    {agent.llm.provider === LLMProvider.CUSTOM && (
                        customAIModels.length > 0 ? (
                            <select
                                value={agent.llm.model}
                                onChange={e => onLlmUpdate({ model: e.target.value })}
                                className="pixel-select"
                            >
                                <option value="" disabled>-- Select a model --</option>
                                {customAIModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="Enter model name (e.g., meta/llama3-70b-instruct)"
                                value={agent.llm.model}
                                onChange={e => onLlmUpdate({ model: e.target.value })}
                                className="pixel-input"
                            />
                        )
                    )}
                </div>
            </div>
            <div>
              <label className="block font-bold mb-1">Voice</label>
              <input
                type="text"
                placeholder="Filter voices..."
                value={voiceFilter}
                onChange={(e) => setVoiceFilter(e.target.value)}
                className="pixel-input mb-1"
              />
              <select 
                value={localAgentVoices[agent.id] || 'default'} 
                onChange={e => onVoiceChange(e.target.value)} 
                className="pixel-select"
              >
                  <option value="default" disabled>-- Select Voice --</option>
                  
                  <optgroup label="Browser Voices">
                    {filteredBrowserVoices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                  </optgroup>

                  {openAiTest?.services.tts && (
                    <optgroup label="OpenAI Voices">
                      {filteredOpenAIVoices.map(v => <option key={v.voice_id} value={`openai:${v.voice_id}`}>{v.name} (OpenAI)</option>)}
                    </optgroup>
                  )}
                  
                  {elevenLabsTest?.status === 'success' && elevenLabsVoices && filteredElevenLabsVoices.length > 0 && (
                     <optgroup label="ElevenLabs Voices">
                        {filteredElevenLabsVoices.map(v => <option key={v.voice_id} value={`elevenlabs:${v.voice_id}`}>{v.name} (ElevenLabs)</option>)}
                    </optgroup>
                  )}
                  
                  {microsoftTest?.status === 'success' && microsoftVoices && filteredMicrosoftVoices.length > 0 && (
                     <optgroup label="Microsoft Azure Voices">
                        {filteredMicrosoftVoices.map(v => <option key={v.ShortName} value={`microsoft:${v.ShortName}`}>{v.DisplayName} ({v.Locale})</option>)}
                    </optgroup>
                  )}
              </select>
               <p className="text-xs text-yellow-300 mt-1">Select a voice to automatically enable agent voices. API voices require a valid key in the General or Audio tabs.</p>
            </div>
             {!isNew && (
                <div className="grid grid-cols-2 gap-2 pt-4 border-t-2 border-black/20">
                    <button onClick={onDelete} className="pixel-button bg-red-700 w-full text-lg flex items-center justify-center gap-2">
                        <TrashIcon className="w-5 h-5"/> Delete
                    </button>
                    <button onClick={onInspectMind} disabled={!onInspectMind} className="pixel-button bg-teal-600 w-full text-lg flex items-center justify-center gap-2">
                        <InspectIcon className="w-5 h-5"/> Inspect Mind
                    </button>
                </div>
            )}
        </div>
    );
};

export default AgentEditor;