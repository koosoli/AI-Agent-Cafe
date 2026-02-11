

import React, { useState, useEffect, useCallback } from 'react';
import type { Agent } from '../types.ts';
import { LLMProvider, MemoryType } from '../types.ts';
import { CloseIcon } from './icons.tsx';
import AgentEditor from './AgentEditor.tsx';
import { PERSONA_TEMPLATES } from '../data/personas.ts';
import { GEMINI_MODELS } from '../constants.ts';
import { useAppStore } from '../hooks/useAppContext.ts';
import * as speechService from '../services/speechService.ts';
import { shallow } from 'zustand/shallow';

type NewAgentData = Omit<Agent, 'id' | 'position' | 'spriteSeed' | 'roomId' | 'memoryStream'>;

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (agentData: NewAgentData, voiceURI?: string) => void;
}

const AddAgentModal = ({ isOpen, onClose, onCreate }: AddAgentModalProps) => {
    const { services } = useAppStore(s => ({ services: s.services }), shallow);

    const createDefaultAgent = useCallback((): Agent => ({
        id: `new-${Date.now()}`,
        name: 'New Agent',
        persona: PERSONA_TEMPLATES.Default,
        personaTemplateId: 'Default',
        isModerator: false,
        feedbackLoopLimit: 1,
        llm: { provider: LLMProvider.GEMINI, model: GEMINI_MODELS[0] },
        useModelAsName: false,
        position: { top: 0, left: 0 },
        spriteSeed: `agent-sprite-${Date.now()}`,
        roomId: '',
        isLocked: false,
        followingAgentId: null,
        relationships: {},
        memoryStream: [
            { id: `core-new-${Date.now()}`, type: MemoryType.CORE, description: PERSONA_TEMPLATES.Default, timestamp: Date.now(), importance: 10, lastAccessed: Date.now() }
        ]
    }), []);

    const [newAgent, setNewAgent] = useState<Agent>(createDefaultAgent());
    const [localAgentVoices, setLocalAgentVoices] = useState<Record<string, string>>({});
    const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        if (isOpen) {
            setNewAgent(createDefaultAgent());
            setLocalAgentVoices({});
        }
    }, [isOpen, createDefaultAgent]);

    useEffect(() => {
        const handleVoiceUpdate = () => setBrowserVoices(speechService.getVoices());
        handleVoiceUpdate();
        const unsubscribe = speechService.subscribeToVoiceChanges(handleVoiceUpdate);
        return () => unsubscribe();
    }, []);

    const handleAgentUpdate = (updatedFields: Partial<Agent>) => {
        setNewAgent(prev => ({ ...prev, ...updatedFields }));
    };
    
    const handleLlmUpdate = (updatedLlm: Partial<Agent['llm']>) => {
        setNewAgent(prev => ({ ...prev, llm: { ...prev.llm, ...updatedLlm } }));
    };
    
    const handleVoiceChange = (voiceURI: string) => {
        setLocalAgentVoices({ [newAgent.id]: voiceURI });
    };

    const handleCreate = () => {
        const { id, position, roomId, spriteSeed, memoryStream, ...agentDataToCreate } = newAgent;
        
        const coreMemoryDescription = memoryStream.find(m => m.type === MemoryType.CORE)?.description || agentDataToCreate.persona;

        const finalAgentData: NewAgentData = {
            ...agentDataToCreate,
            persona: coreMemoryDescription || '',
        };

        const voiceURI = localAgentVoices[newAgent.id];
        onCreate(finalAgentData, voiceURI);
        onClose();
    };

    if (!isOpen) return null;

    const isConfigMissing = (
        (newAgent.llm.provider === LLMProvider.OPENAI && !services.openAiApiKey) ||
        (newAgent.llm.provider === LLMProvider.OPENROUTER && !services.openRouterApiKey) ||
        (newAgent.llm.provider === LLMProvider.CUSTOM && !services.customApiUrl) ||
        (newAgent.llm.provider === LLMProvider.LOCAL && !services.localApiUrl)
    );

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
            <div
              className="pixel-modal w-full max-w-xl welcome-modal-animation flex flex-col max-h-[90vh]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-agent-heading"
            >
                <header className="pixel-header flex justify-between items-center p-4">
                    <h2 id="add-agent-heading" className="text-3xl md:text-4xl">Create New Agent</h2>
                    <button onClick={onClose} className="text-white hover:text-red-500 ml-4" data-close-button="true"><CloseIcon className="w-8 h-8" /></button>
                </header>
                
                <div className="p-6 overflow-y-auto">
                     <AgentEditor
                        agent={newAgent}
                        isNew={true}
                        onUpdate={handleAgentUpdate}
                        onLlmUpdate={handleLlmUpdate}
                        onVoiceChange={handleVoiceChange}
                        openAIModels={services.openAIModels}
                        openRouterModels={services.openRouterModels}
                        localAIModels={services.localAIModels}
                        customAIModels={services.customAIModels}
                        localAgentVoices={localAgentVoices}
                        browserVoices={browserVoices}
                        openAIVoices={speechService.getOpenAIVoices()}
                        microsoftVoices={speechService.getMicrosoftVoices()}
                    />
                     {isConfigMissing && (
                        <div className="mt-4 p-2 text-center bg-yellow-800/50 border-2 border-yellow-600">
                            <p className="text-yellow-200">The selected AI provider may require configuration. Please set the URL/API Key in the main **Settings** panel if you haven't already.</p>
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t-2 border-black mt-auto flex gap-4">
                    <button onClick={onClose} className="pixel-button bg-gray-600 w-1/3 text-lg md:text-xl">Cancel</button>
                    <button onClick={handleCreate} disabled={isConfigMissing || !newAgent.name.trim()} className="pixel-button bg-green-700 w-2/3 text-lg md:text-xl">Create Agent</button>
                </div>
            </div>
        </div>
    );
};

export default AddAgentModal;