import React, { Suspense, lazy, useCallback } from 'react';
import { shallow } from 'zustand/shallow';
import { useAppStore } from '../hooks/useAppContext.ts';
import * as llmService from '../services/llmService.ts';
import * as audioService from '../services/audioService.ts';
import WelcomeModal from './WelcomeModal.tsx';
import AddAgentModal from './AddAgentModal.tsx';
import InventoryModal from './InventoryModal.tsx';
import GroundingComputerModal from './GroundingComputerModal.tsx';
import ScreenplayModal from './ScreenplayModal.tsx';
import WorldArtifactModal from './WorldArtifactModal.tsx';
import ObjectiveTrackerModal from './ObjectiveTrackerModal.tsx';
import type { Agent, CodeArtifact, Message, ImageArtifact } from '../types.ts';
import { LLMProvider, MemoryType } from '../types.ts';
import { PERSONA_TEMPLATES } from '../data/personas.ts';
import { createSystemDebrief } from '../services/learningGuidanceService.ts';

const SettingsModal = lazy(() => import('./SettingsModal.tsx'));
const ChatLogModal = lazy(() => import('./ChatLogModal.tsx'));
const ImageGenerationModal = lazy(() => import('./ImageGenerationModal.tsx'));
const PromptInspectorModal = lazy(() => import('./PromptInspectorModal.tsx'));
const VibeCodingModal = lazy(() => import('./VibeCodingModal.tsx'));
const SkynetTerminalModal = lazy(() => import('./SkynetTerminalModal.tsx'));
const ModelComparisonModal = lazy(() => import('./ModelComparisonModal.tsx'));
const GameBoardModal = lazy(() => import('./GameBoardModal.tsx').then(module => ({ default: module.GameBoardModal })));
const DojoAlignmentModal = lazy(() => import('./DojoAlignmentModal.tsx'));
const SocialGraphModal = lazy(() => import('./SocialGraphModal.tsx'));

const MASTERABLE_ROOM_IDS = ['cafe', 'office', 'studio', 'art_studio', 'philo_cafe', 'library', 'dojo', 'dungeon', 'classroom', 'lair'];

const ModalLoadingFallback: React.FC = () => (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center p-4">
        <div className="pixel-modal px-4 py-3 text-lg uppercase tracking-[0.2em] text-yellow-300">
            Loading...
        </div>
    </div>
);

const Modals: React.FC = () => {
    const ui = useAppStore(s => ({
        initialModalPrompt: s.ui.initialModalPrompt,
        inspectorData: s.ui.inspectorData,
        isAddAgentModalOpen: s.ui.isAddAgentModalOpen,
        isDojoModalOpen: s.ui.isDojoModalOpen,
        isGameBoardModalOpen: s.ui.isGameBoardModalOpen,
        isGroundingComputerModalOpen: s.ui.isGroundingComputerModalOpen,
        isImageGenerationModalOpen: s.ui.isImageGenerationModalOpen,
        isInventoryOpen: s.ui.isInventoryOpen,
        isLogOpen: s.ui.isLogOpen,
        isModelComparisonModalOpen: s.ui.isModelComparisonModalOpen,
        isObjectiveTrackerOpen: s.ui.isObjectiveTrackerOpen,
        isScreenplayModalOpen: s.ui.isScreenplayModalOpen,
        isSettingsOpen: s.ui.isSettingsOpen,
        isSkynetTerminalOpen: s.ui.isSkynetTerminalOpen,
        isSocialGraphModalOpen: s.ui.isSocialGraphModalOpen,
        isVibeCodingModalOpen: s.ui.isVibeCodingModalOpen,
        isWelcomeModalOpen: s.ui.isWelcomeModalOpen,
        isWorldArtifactModalOpen: s.ui.isWorldArtifactModalOpen,
        vibeCodingArtifactToPreview: s.ui.vibeCodingArtifactToPreview,
        worldArtifactToInspect: s.ui.worldArtifactToInspect,
    }), shallow);
    const agents = useAppStore(s => s.agents, shallow);
    const services = useAppStore(s => s.services);
    const { difficulty, lastArtPrompt, officeChallengeState } = useAppStore(s => ({
        difficulty: s.game.difficulty,
        lastArtPrompt: s.game.lastArtPrompt,
        officeChallengeState: s.game.officeChallengeState,
    }), shallow);

    const {
        setUiState, setAudioState, setAgents, setGameState, addArtifact, logApiUsage, addMessage, showToast
    } = useAppStore.getState();

    const handleWelcomeClose = useCallback(async () => {
        try {
            await audioService.warmupAudio();
            setAudioState({ ready: true });
        } catch (error) {
            console.error("Audio warmup failed:", error);
        }
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
            const currentAudioState = useAppStore.getState().audio;
            setAudioState({
                agentVoices: { ...currentAudioState.agentVoices, [newAgent.id]: voiceURI },
                ttsEnabled: true,
            });
        }

        setUiState({ isAddAgentModalOpen: false, addAgentSpawnPos: null });
    }, [setAgents, setUiState, setAudioState]);

    const handleSettingsClose = useCallback(() => {
        setUiState({ editingAgentId: null, isSettingsOpen: false });
    }, [setUiState]);

    const handleImageGeneration = useCallback(async (prompt: string, model: string) => {
        setGameState({ lastArtPrompt: prompt });
        const { imageUrl, provider } = await llmService.generateImage(prompt, model, services);
        logApiUsage({ type: 'image', provider, model });
        const artifactId = `artifact-${Date.now()}`;
        const newArtifact: ImageArtifact = { id: artifactId, type: 'image', prompt, imageUrl, timestamp: Date.now() };
        useAppStore.getState().setServiceState({ imageGenerationModel: model });
        addArtifact(newArtifact);
        setGameState({ displayedArtifactId: artifactId });
        addMessage({ id: `msg-${Date.now()}`, agentId: 'user', text: `(You created an image: "${prompt}")`, timestamp: Date.now(), artifact: newArtifact });
        return imageUrl;
    }, [services, logApiUsage, addArtifact, setGameState, addMessage]);

    const handleImageModalClose = useCallback((getFeedback: boolean) => {
        setUiState({ isImageGenerationModalOpen: false });
        if (getFeedback && lastArtPrompt) {
            setUiState({
                learningDebrief: createSystemDebrief(
                    'art_studio',
                    'coach',
                    'Art Critique Ready',
                    'You have a first draft. Now listen for composition, lighting, and mood feedback before you revise.',
                    'Generate a second prompt that clearly reflects the critique you receive from the artists.',
                ),
            });
            setGameState({
                artStudioChallengeState: { status: 'critique_given', feedbackCount: (useAppStore.getState().game.artStudioChallengeState?.feedbackCount || 0) + 1 },
                triggerDiscussion: { prompt: `I've created an image based on the prompt "${lastArtPrompt}". What do you think?`, targetAgentId: null },
            });
        }
    }, [lastArtPrompt, setUiState, setGameState]);

    const handleGroundedSearch = useCallback(async (query: string) => {
        const { text, groundingChunks } = await llmService.getGroundedSearch(query, services);
        logApiUsage({ type: 'llm', provider: LLMProvider.GEMINI, model: 'gemini-2.5-flash', promptTokens: 0, completionTokens: 0 });
        addMessage({ id: `msg-${Date.now()}`, agentId: 'user', text: `(Searched: "${query}")\n\n${text}`, timestamp: Date.now(), groundingChunks });
        setGameState({ classroomChallengeState: { ...useAppStore.getState().game.classroomChallengeState!, status: 'researched' } });
        setUiState({
            learningDebrief: createSystemDebrief(
                'classroom',
                'coach',
                'Research Captured',
                'You now have live sources. The lesson is not the lookup itself, but turning the evidence into a short explanation.',
                'Return to the teacher and answer in your own words, making clear why a grounded answer is stronger than unsupported recall.',
            ),
        });
        return { text, groundingChunks };
    }, [services, logApiUsage, addMessage, setGameState, setUiState]);

    const handleVibeCodeGeneration = useCallback(async (description: string, model: string) => {
        const { code, usage } = await llmService.generateVibeCode(description, model, services);
        logApiUsage({ type: 'llm', ...usage });
        return code;
    }, [services, logApiUsage]);

    const handleVibeCodingClose = useCallback((code, prompt, getFeedback) => {
        setUiState({ isVibeCodingModalOpen: false, initialModalPrompt: null, vibeCodingArtifactToPreview: null });
        if (!getFeedback || !code || !prompt) return;

        const currentGameState = useAppStore.getState().game;
        if (currentGameState.officeChallengeState?.status === 'critique_needed') {
            showToast("Revision submitted! Let's see what the designer thinks.");
            setUiState({
                learningDebrief: createSystemDebrief(
                    'office',
                    'coach',
                    'Revision Submitted',
                    'The team is now judging whether your second prompt really addressed the earlier critique.',
                    'If they push back again, name the exact visual or UX issue you are correcting before you regenerate.',
                ),
            });
            setGameState({
                officeChallengeState: {
                    ...currentGameState.officeChallengeState,
                    status: 'final_submission',
                    lastCode: code,
                    lastPrompt: prompt,
                },
                triggerDiscussion: {
                    prompt: `I've revised the component based on your feedback using the prompt: "${prompt}". Is this better?`,
                    targetAgentId: 'UIUX1',
                },
            });
            return;
        }

        showToast("Critique received! Refine your prompt and generate again.");
        setUiState({
            learningDebrief: createSystemDebrief(
                'office',
                'coach',
                'First Draft Logged',
                'The first generation is your baseline. Use the critique to make your next prompt more explicit about hierarchy, clarity, and usability.',
                'Open the terminal again and write a second prompt that names the changes you want.',
            ),
        });
        setGameState({
            officeChallengeState: {
                status: 'critique_needed',
                lastCode: code,
                lastPrompt: prompt,
                feedbackCount: (officeChallengeState?.feedbackCount || 0) + 1,
            },
            triggerDiscussion: {
                prompt: `I've created a component based on the prompt "${prompt}". What do you think? Please give me some feedback.`,
                targetAgentId: null,
            },
        });
    }, [officeChallengeState, setUiState, setGameState, showToast]);

    const handleSaveCodeArtifact = useCallback((artifact: CodeArtifact) => addArtifact(artifact), [addArtifact]);

    const handleModelComparison = useCallback(async (model: string, provider: LLMProvider, prompt: string) => {
        try {
            const response = await llmService.getRawResponseForModel(model, provider, 'You are a helpful AI assistant.', prompt, services);
            logApiUsage({ type: 'llm', provider, model, ...response.usage });
            return response.text;
        } catch (error: any) {
            return `[API Error for ${model}: ${error.message}]`;
        }
    }, [services, logApiUsage]);

    const handleNewSkynetMessage = useCallback((message: Message) => {
        addMessage(message);
        if (message.usage) {
            logApiUsage({ type: 'llm', ...message.usage });
        }
    }, [addMessage, logApiUsage]);

    const handleRoomMastered = useCallback((_roomId: string) => {
        // The core mastery handling now lives in Layout.tsx.
    }, []);

    const handleGameBoardClose = useCallback(() => setUiState({ isGameBoardModalOpen: false }), [setUiState]);

    const handleDojoPromptTest = useCallback(async (challenge, systemPrompt) => {
        try {
            const response = await llmService.getRawResponseForModel('gemini-2.5-flash', LLMProvider.GEMINI, systemPrompt, challenge.scenario, services);
            logApiUsage({ type: 'llm', provider: LLMProvider.GEMINI, model: 'gemini-2.5-flash', ...response.usage });
            return response;
        } catch (error) {
            return { text: `[Simulation Error: ${error instanceof Error ? error.message : 'Unknown'}]`, usage: { promptTokens: 0, completionTokens: 0 } };
        }
    }, [services, logApiUsage]);

    const handleDojoEvaluation = useCallback(async (challenge, studentSystemPrompt, studentResponse) => {
        const sensei = agents.find(a => a.id === 'DOJO1');
        if (!sensei) return { text: '[Sensei not found]', usage: { promptTokens: 0, completionTokens: 0 } };
        const basePersona = (sensei.personaTemplateId && PERSONA_TEMPLATES[sensei.personaTemplateId]) || sensei.persona;
        const systemInstruction = basePersona
            .replace('{{goal}}', challenge.goal)
            .replace('{{scenario}}', challenge.scenario)
            .replace('{{system_prompt}}', studentSystemPrompt)
            .replace('{{response}}', studentResponse)
            .replace('{{difficulty}}', difficulty);
        try {
            const response = await llmService.getRawResponseForModel(sensei.llm.model, sensei.llm.provider, systemInstruction, 'Evaluate the student\'s attempt.', services);
            logApiUsage({ type: 'llm', provider: sensei.llm.provider, model: sensei.llm.model, ...response.usage });
            return response;
        } catch (error) {
            return { text: `[Sensei Evaluation Error: ${error instanceof Error ? error.message : 'Unknown'}]`, usage: { promptTokens: 0, completionTokens: 0 } };
        }
    }, [agents, services, difficulty, logApiUsage]);

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
        const agent = agents.find(item => item.id === agentId);
        if (!agent) return { text: '[Error: Agent not found]', usage: { promptTokens: 0, completionTokens: 0 } };
        try {
            const response = await llmService.getRawResponseForModel(agent.llm.model, agent.llm.provider, system, user, services);
            logApiUsage({ type: 'llm', provider: agent.llm.provider, model: agent.llm.model, ...response.usage });
            return response;
        } catch (error: any) {
            return { text: `[API Error: ${error.message}]`, usage: { promptTokens: 0, completionTokens: 0 } };
        }
    }, [agents, services, logApiUsage]);

    const handleExplainPrompt = useCallback(async (system: string, user: string) => {
        try {
            const response = await llmService.getPromptExplanation(system, user, services);
            logApiUsage({ type: 'llm', provider: LLMProvider.GEMINI, model: 'gemini-2.5-flash', ...response.usage });
            return response.text;
        } catch (error: any) {
            return `[API Error: ${error.message}]`;
        }
    }, [services, logApiUsage]);

    return (
        <>
            <WelcomeModal isOpen={ui.isWelcomeModalOpen} onClose={handleWelcomeClose} />
            <AddAgentModal
                isOpen={ui.isAddAgentModalOpen}
                onClose={() => setUiState({ isAddAgentModalOpen: false })}
                onCreate={handleCreateAgent}
            />
            <GroundingComputerModal
                isOpen={ui.isGroundingComputerModalOpen}
                initialQuery={ui.initialModalPrompt || ''}
                onClose={() => setUiState({ isGroundingComputerModalOpen: false, initialModalPrompt: null })}
                onSearch={handleGroundedSearch}
            />
            <ScreenplayModal
                isOpen={ui.isScreenplayModalOpen}
                onClose={() => setUiState({ isScreenplayModalOpen: false })}
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
            <ObjectiveTrackerModal
                isOpen={ui.isObjectiveTrackerOpen}
                onClose={() => setUiState({ isObjectiveTrackerOpen: false })}
            />
            <Suspense fallback={<ModalLoadingFallback />}>
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
                <VibeCodingModal
                    isOpen={ui.isVibeCodingModalOpen || !!ui.vibeCodingArtifactToPreview}
                    previewArtifact={ui.vibeCodingArtifactToPreview}
                    onClose={handleVibeCodingClose}
                    initialPrompt={ui.initialModalPrompt || ''}
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
                    initialPrompt={ui.initialModalPrompt || ''}
                    onCompare={handleModelComparison}
                />
                <SkynetTerminalModal
                    isOpen={ui.isSkynetTerminalOpen}
                    initialPrompt={ui.initialModalPrompt || ''}
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
                <SocialGraphModal
                    isOpen={ui.isSocialGraphModalOpen}
                    onClose={() => setUiState({ isSocialGraphModalOpen: false })}
                />
            </Suspense>
        </>
    );
};

export default Modals;
