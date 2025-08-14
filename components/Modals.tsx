import React, { useCallback, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { useAppStore } from '../hooks/useAppContext.ts';
import * as llmService from '../services/llmService.ts';
import * as audioService from '../services/audioService.ts';
import SettingsModal from './SettingsModal.tsx';
import ChatLogModal from './ChatLogModal.tsx';
import WelcomeModal from './WelcomeModal.tsx';
import AddAgentModal from './AddAgentModal.tsx';
import ImageGenerationModal from './ImageGenerationModal.tsx';
import InventoryModal from './InventoryModal.tsx';
import PromptInspectorModal from './PromptInspectorModal.tsx';
import GroundingComputerModal from './GroundingComputerModal.tsx';
import VibeCodingModal from './VibeCodingModal.tsx';
import ScreenplayModal from './ScreenplayModal.tsx';
import SkynetTerminalModal from './SkynetTerminalModal.tsx';
import ModelComparisonModal from './ModelComparisonModal.tsx';
import { GameBoardModal } from './GameBoardModal.tsx';
import DojoAlignmentModal from './DojoAlignmentModal.tsx';
import WorldArtifactModal from './WorldArtifactModal.tsx';
import SocialGraphModal from './SocialGraphModal.tsx';
import ObjectiveTrackerModal from './ObjectiveTrackerModal.tsx';
import type { Agent, CodeArtifact, PromptData, Message, DojoAlignmentChallenge, LLMResponse, ScreenplayArtifact, ImageArtifact } from '../types.ts';
import { LLMProvider, MemoryType } from '../types.ts';
import { PERSONA_TEMPLATES } from '../data/personas.ts';

const MASTERABLE_ROOM_IDS = ['cafe', 'office', 'studio', 'art_studio', 'philo_cafe', 'library', 'dojo', 'dungeon', 'classroom', 'lair'];

const Modals: React.FC = () => {
    const { ui, services, agents, game } = useAppStore(s => ({
        ui: s.ui,
        services: s.services,
        agents: s.agents,
        game: s.game,
    }), shallow);
    
    const {
        setUiState, setAudioState, setAgents, setGameState, addArtifact, logApiUsage, addMessage
    } = useAppStore.getState();

    const { initialModalPrompt } = ui;
    
    const handleWelcomeClose = useCallback(async () => {
        try {
            await audioService.warmupAudio();
            setAudioState({ ready: true });
        } catch (error) { console.error("Audio warmup failed:", error); }
        setUiState({ isWelcomeModalOpen: false });
    }, [setAudioState, setUiState]);

    const handleCreateAgent = useCallback((newAgentData: Omit<Agent, 'id' | 'position' | 'spriteSeed' | 'roomId' | 'memoryStream'>, voiceURI?: string) => {
        const { addAgentSpawnPos } = useAppStore.getState().ui;
        if (!addAgentSpawnPos) return;
        const newAgent: Agent = {
            ...newAgentData,
            id: `agent-${Date.now()}`,
            position: { top: addAgentSpawnPos.top, left: addAgentSpawnPos.left },
            spriteSeed: `agent-sprite-${Date.now()}`,
            roomId: addAgentSpawnPos.roomId,
            followingAgentId: null,
            relationships: {},
            memoryStream: [{ id: `core-agent-${Date.now()}`, type: MemoryType.CORE, description: newAgentData.persona, timestamp: Date.now(), importance: 10, lastAccessed: Date.now() }],
            persona: '',
        };
        const currentAgents = useAppStore.getState().agents;
        setAgents([...currentAgents, newAgent]);

        if (voiceURI) {
            // Auto-enable TTS when a voice is selected, as this is the user's clear intent.
            const currentAudioState = useAppStore.getState().audio;
            setAudioState({
                agentVoices: { ...currentAudioState.agentVoices, [newAgent.id]: voiceURI },
                ttsEnabled: true
            });
        }

        setUiState({ isAddAgentModalOpen: false, addAgentSpawnPos: null });
    }, [setAgents, setUiState, setAudioState]);

    const handleSettingsClose = useCallback(() => {
        setUiState({ editingAgentId: null, isSettingsOpen: false });
    }, [setUiState]);

    const handleImageGeneration = useCallback(async (prompt: string, model: string) => {
        setGameState({ lastArtPrompt: prompt });
        try {
            const { imageUrl, provider } = await llmService.generateImage(prompt, model, services);
            logApiUsage({ type: 'image', provider, model });
            const artifactId = `artifact-${Date.now()}`;
            const newArtifact: ImageArtifact = { id: artifactId, type: 'image', prompt, imageUrl, timestamp: Date.now() };
            useAppStore.getState().setServiceState({ imageGenerationModel: model });
            addArtifact(newArtifact);
            setGameState({ displayedArtifactId: artifactId });
            addMessage({ id: `msg-${Date.now()}`, agentId: 'user', text: `(You created an image: "${prompt}")`, timestamp: Date.now(), artifact: newArtifact });
            return imageUrl;
        } catch (err) { throw err; }
    }, [services, logApiUsage, addArtifact, setGameState, addMessage]);

    const handleImageModalClose = useCallback((getFeedback: boolean) => {
        setUiState({ isImageGenerationModalOpen: false });
        // Feedback logic now lives inside useConversationManager, triggered by state change
    }, [setUiState]);

    const handleGroundedSearch = useCallback(async (query: string) => {
        try {
            const { text, groundingChunks } = await llmService.getGroundedSearch(query, services);
            logApiUsage({ type: 'llm', provider: LLMProvider.GEMINI, model: 'gemini-2.5-flash', promptTokens: 0, completionTokens: 0 });
            addMessage({ id: `msg-${Date.now()}`, agentId: 'user', text: `(Searched: "${query}")\n\n${text}`, timestamp: Date.now(), groundingChunks });
            // Challenge logic now lives inside useConversationManager
            return { text, groundingChunks };
        } catch(err) { throw err; }
    }, [services, logApiUsage, addMessage]);
    
    // ... Other handlers moved from App.tsx ...
    const handleVibeCodeGeneration = useCallback(async (description: string, model: string) => {
        try {
            const { code, usage } = await llmService.generateVibeCode(description, model, services);
            logApiUsage({ type: 'llm', ...usage });
            return code;
        } catch (err) { throw err; }
    }, [services, logApiUsage]);

    const handleVibeCodingClose = useCallback((code, prompt, getFeedback) => {
        setUiState({ isVibeCodingModalOpen: false, initialModalPrompt: null, vibeCodingArtifactToPreview: null });
        if (getFeedback && code && prompt) {
            const currentGameState = useAppStore.getState().game;
            setGameState({
                officeChallengeState: {
                    status: 'critique_needed',
                    lastCode: code,
                    lastPrompt: prompt,
                    feedbackCount: (currentGameState.officeChallengeState?.feedbackCount || 0) + 1,
                },
                triggerDiscussion: {
                    prompt: `I've created a component based on the prompt "${prompt}". What do you think? Please give me some feedback.`,
                    targetAgentId: null
                }
            });
        }
    }, [setUiState, setGameState]);
    
    const handleSaveCodeArtifact = useCallback((artifact: CodeArtifact) => addArtifact(artifact), [addArtifact]);
    
    const handleModelComparison = useCallback(async (model: string, provider: LLMProvider, prompt: string) => {
        const systemInstruction = "You are a helpful AI assistant.";
        try {
          const response = await llmService.getRawResponseForModel(model, provider, systemInstruction, prompt, services);
          logApiUsage({ type: 'llm', provider, model, ...response.usage });
          return response.text;
        } catch (error: any) { return `[API Error for ${model}: ${error.message}]`; }
    }, [services, logApiUsage]);

    const handleNewSkynetMessage = useCallback((message: Message) => {
        addMessage(message);
        if(message.usage) logApiUsage({ type: 'llm', ...message.usage });
    }, [addMessage, logApiUsage]);

    const handleRoomMastered = useCallback((roomId: string) => {
        // This is a placeholder; the core logic is now in Layout.tsx
    }, []);

    const handleGameBoardClose = useCallback(() => setUiState({ isGameBoardModalOpen: false }), [setUiState]);

    const handleDojoPromptTest = useCallback(async (challenge, systemPrompt) => {
        try {
            const response = await llmService.getRawResponseForModel('gemini-2.5-flash', LLMProvider.GEMINI, systemPrompt, challenge.scenario, services);
            logApiUsage({ type: 'llm', provider: LLMProvider.GEMINI, model: 'gemini-2.5-flash', ...response.usage });
            return response;
        } catch (error) { return { text: `[Simulation Error: ${error instanceof Error ? error.message : 'Unknown'}]`, usage: { promptTokens: 0, completionTokens: 0 }}; }
    }, [services, logApiUsage]);

    const handleDojoEvaluation = useCallback(async (challenge, studentSystemPrompt, studentResponse) => {
        const sensei = agents.find(a => a.id === 'DOJO1');
        if (!sensei) return { text: "[Sensei not found]", usage: { promptTokens: 0, completionTokens: 0 }};
        const basePersona = (sensei.personaTemplateId && PERSONA_TEMPLATES[sensei.personaTemplateId]) || sensei.persona;
        const systemInstruction = basePersona.replace('{{goal}}', challenge.goal).replace('{{scenario}}', challenge.scenario).replace('{{system_prompt}}', studentSystemPrompt).replace('{{response}}', studentResponse).replace('{{difficulty}}', game.difficulty);
        try {
            const response = await llmService.getRawResponseForModel(sensei.llm.model, sensei.llm.provider, systemInstruction, "Evaluate the student's attempt.", services);
            logApiUsage({ type: 'llm', provider: sensei.llm.provider, model: sensei.llm.model, ...response.usage });
            return response;
        } catch(error) { return { text: `[Sensei Evaluation Error: ${error instanceof Error ? error.message : 'Unknown'}]`, usage: { promptTokens: 0, completionTokens: 0 }}; }
    }, [agents, services, game.difficulty, logApiUsage]);

    const handleDebugMasterAll = useCallback(() => {
        setGameState({ masteredRooms: MASTERABLE_ROOM_IDS, allRoomsMastered: true, superAgentUnlocked: false });
        setUiState({ isSettingsOpen: false });
    }, [setGameState, setUiState]);

    const handleResetGame = useCallback(() => {
        Object.keys(localStorage).forEach(key => {
            if (!key.startsWith('vite')) localStorage.removeItem(key);
        });
        window.location.reload();
    }, []);
    
    const handleOpenInspector = useCallback((agent, history, startIndex) => setUiState({ inspectorData: { agent, history, startIndex } }), [setUiState]);
    const handleCloseInspector = useCallback(() => setUiState({ inspectorData: null }), [setUiState]);
    
    const handleTestPrompt = useCallback(async (agentId: string, system: string, user: string) => {
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return { text: "[Error: Agent not found]", usage: { promptTokens: 0, completionTokens: 0 } };
        try {
            const response = await llmService.getRawResponseForModel(agent.llm.model, agent.llm.provider, system, user, services);
            logApiUsage({ type: 'llm', provider: agent.llm.provider, model: agent.llm.model, ...response.usage });
            return response;
        } catch (error: any) { return { text: `[API Error: ${error.message}]`, usage: { promptTokens: 0, completionTokens: 0 } }; }
    }, [agents, services, logApiUsage]);

    const handleExplainPrompt = useCallback(async (system: string, user: string) => {
      try {
          const response = await llmService.getPromptExplanation(system, user, services);
          logApiUsage({ type: 'llm', provider: LLMProvider.GEMINI, model: 'gemini-2.5-flash', ...response.usage });
          return response.text;
      } catch (error: any) { return `[API Error: ${error.message}]`; }
    }, [services, logApiUsage]);


    return (
        <>
            <WelcomeModal isOpen={ui.isWelcomeModalOpen} onClose={handleWelcomeClose} />
            <AddAgentModal
                isOpen={ui.isAddAgentModalOpen}
                onClose={() => setUiState({ isAddAgentModalOpen: false })}
                onCreate={handleCreateAgent}
            />
            <SettingsModal
                isOpen={ui.isSettingsOpen}
                onClose={handleSettingsClose}
                onDebugMasterAll={handleDebugMasterAll}
                onResetGame={handleResetGame}
            />
            <ChatLogModal
                isOpen={ui.isLogOpen}
                onClose={() => setUiState({ isLogOpen: false })}
                onInspect={handleOpenInspector}
            />
            <PromptInspectorModal
                isOpen={!!ui.inspectorData}
                agent={ui.inspectorData?.agent!}
                promptHistory={ui.inspectorData?.history || []}
                startIndex={ui.inspectorData?.startIndex ?? 0}
                onClose={handleCloseInspector}
                onTestPrompt={handleTestPrompt}
                onExplainPrompt={handleExplainPrompt}
            />
            <ImageGenerationModal
                isOpen={ui.isImageGenerationModalOpen}
                onClose={handleImageModalClose}
                onGenerate={handleImageGeneration}
            />
            <GroundingComputerModal
                isOpen={ui.isGroundingComputerModalOpen}
                initialQuery={initialModalPrompt || ''}
                onClose={() => setUiState({ isGroundingComputerModalOpen: false, initialModalPrompt: null })}
                onSearch={handleGroundedSearch}
            />
            <VibeCodingModal
                isOpen={ui.isVibeCodingModalOpen || !!ui.vibeCodingArtifactToPreview}
                previewArtifact={ui.vibeCodingArtifactToPreview}
                onClose={handleVibeCodingClose}
                initialPrompt={initialModalPrompt || ''}
                onGenerate={handleVibeCodeGeneration}
                onSaveArtifact={handleSaveCodeArtifact}
                openAIModels={services.openAIModels}
                openRouterModels={services.openRouterModels}
                openAiApiKey={services.openAiApiKey}
                openRouterApiKey={services.openRouterApiKey}
            />
            <ModelComparisonModal
                isOpen={ui.isModelComparisonModalOpen}
                onClose={() => setUiState({ isModelComparisonModalOpen: false, initialModalPrompt: null })}
                initialPrompt={initialModalPrompt || ''}
                onCompare={handleModelComparison}
            />
             <ScreenplayModal
                isOpen={ui.isScreenplayModalOpen}
                onClose={() => setUiState({ isScreenplayModalOpen: false })}
            />
             <SkynetTerminalModal
                isOpen={ui.isSkynetTerminalOpen}
                initialPrompt={initialModalPrompt || ''}
                onClose={() => { setUiState({ isSkynetTerminalOpen: false, initialModalPrompt: null }); }}
                onRoomMastered={handleRoomMastered}
                onNewMessage={handleNewSkynetMessage}
            />
            <GameBoardModal
                isOpen={ui.isGameBoardModalOpen}
                onClose={handleGameBoardClose}
                onRoomMastered={handleRoomMastered}
            />
             <DojoAlignmentModal
                isOpen={ui.isDojoModalOpen}
                onClose={() => setUiState({ isDojoModalOpen: false })}
                onRoomMastered={handleRoomMastered}
                onTestPrompt={handleDojoPromptTest}
                onEvaluatePrompt={handleDojoEvaluation}
            />
             <InventoryModal
                isOpen={ui.isInventoryOpen}
                onClose={() => setUiState({ isInventoryOpen: false })}
            />
             <WorldArtifactModal 
                isOpen={ui.isWorldArtifactModalOpen}
                onClose={() => setUiState({ isWorldArtifactModalOpen: false, worldArtifactToInspect: null })}
                artifact={ui.worldArtifactToInspect}
            />
            <SocialGraphModal 
                isOpen={ui.isSocialGraphModalOpen} 
                onClose={() => setUiState({ isSocialGraphModalOpen: false })}
            />
            <ObjectiveTrackerModal
                isOpen={ui.isObjectiveTrackerOpen}
                onClose={() => setUiState({ isObjectiveTrackerOpen: false })}
            />
        </>
    );
};

export default Modals;