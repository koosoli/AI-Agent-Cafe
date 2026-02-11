import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import type { Agent, Memory, PromptData, AppState } from '../types.ts';
import { LLMProvider, SpeechServiceProvider, TtsServiceProvider, MemoryType } from '../types.ts';
import { CloseIcon, ExportIcon, ImportIcon, VoiceIcon, TrashIcon, StarIcon, InspectIcon, NetworkIcon } from './icons.tsx';
import { testOpenAICompatible, fetchOpenRouterModels, fetchOpenAIModels, testLocalAI, testGeminiApiKey, testCustomAI } from '../services/apiService.ts';
import * as speechService from '../services/speechService.ts';
import type { ElevenLabsVoice, OpenAIVoice, MicrosoftVoice } from '../services/speechService.ts';
import { MUSIC_TRACKS } from '../services/audioService.ts';
import { USER_AGENT } from '../constants.ts';
import { PERSONA_TEMPLATES } from '../data/personas.ts';
import { useAppStore } from '../hooks/useAppContext.ts';
import { GAME_CONFIG } from '../data/gameConfig.ts';
import AgentSprite from './AgentSprite.tsx';
import AgentEditor from './AgentEditor.tsx';
import ModalHeader from './ModalHeader.tsx';
import { shallow } from 'zustand/shallow';

// --- PROPS INTERFACES FOR TAB COMPONENTS ---

type TestStatus = 'idle' | 'testing' | 'success' | 'error';
type ServiceToTest = LLMProvider.OPENAI | LLMProvider.OPENROUTER | 'elevenlabs' | 'local' | 'gemini' | 'custom' | 'microsoft';
type OpenAITestState = { status: TestStatus; message: string; services: { llm: boolean; tts: boolean } };

const TestStatusIndicator = ({ status, message }: { status: TestStatus; message: string }) => {
    if (status === 'idle') return null;
    const baseStyle = 'text-sm p-2 my-1 rounded border';
    if (status === 'testing') return <p className={`${baseStyle} bg-blue-900/50 border-blue-500 text-blue-200`}>{message}</p>;
    if (status === 'success') return <p className={`${baseStyle} bg-green-900/50 border-green-500 text-green-200 whitespace-pre-wrap`}>{message}</p>;
    if (status === 'error') return <p className={`${baseStyle} bg-red-900/50 border-red-500 text-red-200 whitespace-pre-wrap`}>{message}</p>;
    return null;
};

interface GeneralTabProps {
    localGeminiKey: string; setLocalGeminiKey: (s: string) => void;
    localOpenAiKey: string; setLocalOpenAiKey: (s: string) => void;
    localElevenLabsKey: string; setLocalElevenLabsKey: (s: string) => void;
    localOpenRouterKey: string; setLocalOpenRouterKey: (s: string) => void;
    localMicrosoftApiKey: string; setLocalMicrosoftApiKey: (s: string) => void;
    localMicrosoftApiRegion: string; setLocalMicrosoftApiRegion: (s: string) => void;
    localLocalApiUrl: string; setLocalLocalApiUrl: (s: string) => void;
    localCustomApiUrl: string; setLocalCustomApiUrl: (s: string) => void;
    localCustomApiKey: string; setLocalCustomApiKey: (s: string) => void;
    localCustomApiTestModel: string; setLocalCustomApiTestModel: (s: string) => void;
    geminiTest: { status: TestStatus, message: string };
    openAiTest: OpenAITestState;
    elevenLabsTest: { status: TestStatus, message: string };
    openRouterTest: { status: TestStatus, message: string };
    microsoftTest: { status: TestStatus, message: string };
    localApiTest: { status: TestStatus, message: string };
    customApiTest: { status: TestStatus, message: string };
    handleTestApiKey: (provider: ServiceToTest, keyOrUrl: string, secondKey?: string) => void;
    handleFileImport: (e: React.ChangeEvent<HTMLInputElement>, onImport: (data: any) => void) => void;
    handleImportAgents: (data: any) => void;
    handleImportSession: (data: any) => void;
    handleExportAgents: () => void;
    handleExportSession: () => void;
    importAgentsInputRef: React.RefObject<HTMLInputElement>;
    importSessionInputRef: React.RefObject<HTMLInputElement>;
}

interface GameplayTabProps {
    localPlayerName: string; setLocalPlayerName: (s: string) => void;
    localPlayerSpriteSeed: string; setLocalPlayerSpriteSeed: (s: string) => void;
    localPlayerSpeed: number; setLocalPlayerSpeed: (n: number) => void;
    localRunMultiplier: number; setLocalRunMultiplier: (n: number) => void;
    localSubtitleDurationMultiplier: number; setLocalSubtitleDurationMultiplier: (n: number) => void;
    localDifficulty: 'Easy'|'Normal'|'Hard'; setLocalDifficulty: (d: 'Easy'|'Normal'|'Hard') => void;
    localManualSubtitleAdvance: boolean; setLocalManualSubtitleAdvance: (b: boolean) => void;
}

interface AudioTabProps {
    localMusicMuted: boolean; setLocalMusicMuted: (b: boolean) => void;
    localMusicVolume: number; setLocalMusicVolume: (n: number) => void;
    localSfxMuted: boolean; setLocalSfxMuted: (b: boolean) => void;
    localSfxVolume: number; setLocalSfxVolume: (n: number) => void;
    localTtsEnabled: boolean; setLocalTtsEnabled: (b: boolean) => void;
    localTtsVolume: number; setLocalTtsVolume: (n: number) => void;
    localSttProvider: SpeechServiceProvider; setLocalSttProvider: (p: SpeechServiceProvider) => void;
    currentTrackName: string;
    openAiTest: OpenAITestState;
    microsoftTest: { status: TestStatus; message: string; };
    handleAutoAssignVoices: (type: 'openai' | 'elevenlabs' | 'microsoft' | 'all') => void;
    elevenLabsTest: { status: TestStatus; message: string; };
    elevenLabsVoices: ElevenLabsVoice[];
    openAIVoices: OpenAIVoice[];
    voiceAssignmentFeedback: string;
}

interface AgentsTabProps {
    localAgents: Agent[];
    localAgentAutonomyEnabled: boolean; setLocalAgentAutonomyEnabled: (b: boolean) => void;
    services: AppState['services'];
    openAiTest: OpenAITestState;
    openRouterTest: { status: TestStatus, message: string };
    customApiTest: { status: TestStatus, message: string };
    setUiState: (ui: Partial<AppState['ui']>) => void;
    autoAssignProvider: LLMProvider.OPENAI | LLMProvider.OPENROUTER | LLMProvider.CUSTOM;
    setAutoAssignProvider: (p: LLMProvider.OPENAI | LLMProvider.OPENROUTER | LLMProvider.CUSTOM) => void;
    autoAssignModelFilter: string; setAutoAssignModelFilter: (s: string) => void;
    autoAssignSelectedModel: string; setAutoAssignSelectedModel: (s: string) => void;
    availableAutoAssignModels: string[];
    handleAutoAssignModel: () => void;
    modelAssignmentFeedback: string;
    setModelAssignmentFeedback: (s: string) => void;
}

interface DebugTabProps {
    password: string;
    setPassword: (s: string) => void;
    unlocked: boolean;
    setUnlocked: (b: boolean) => void;
    showFps: boolean;
    setShowFps: (b: boolean) => void;
    onDebugMasterAll: () => void;
    onResetGame: () => void;
}


// --- TAB COMPONENTS ---

const GeneralTab = memo((props: GeneralTabProps) => (
    <div className="space-y-4">
      <h3 className="text-2xl text-yellow-300">LLM &amp; Voice API Keys</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label className="block font-bold mb-1">Google Gemini API Key</label>
          <div className="flex gap-2">
            <input type="password" value={props.localGeminiKey} onChange={e => props.setLocalGeminiKey(e.target.value)} className="pixel-input" />
            <button onClick={() => props.handleTestApiKey('gemini', props.localGeminiKey)} className="pixel-button bg-blue-600" disabled={props.geminiTest.status === 'testing'}>Test</button>
          </div>
          <TestStatusIndicator status={props.geminiTest.status} message={props.geminiTest.message} />
        </div>
        <div>
          <label className="block font-bold mb-1">OpenAI API Key</label>
          <div className="flex gap-2">
            <input type="password" value={props.localOpenAiKey} onChange={e => props.setLocalOpenAiKey(e.target.value)} className="pixel-input" />
            <button onClick={() => props.handleTestApiKey(LLMProvider.OPENAI, props.localOpenAiKey)} className="pixel-button bg-blue-600" disabled={props.openAiTest.status === 'testing'}>Test</button>
          </div>
          <TestStatusIndicator status={props.openAiTest.status} message={props.openAiTest.message} />
        </div>
        <div>
          <label className="block font-bold mb-1">ElevenLabs API Key</label>
          <div className="flex gap-2">
            <input type="password" value={props.localElevenLabsKey} onChange={e => props.setLocalElevenLabsKey(e.target.value)} className="pixel-input" />
            <button onClick={() => props.handleTestApiKey('elevenlabs', props.localElevenLabsKey)} className="pixel-button bg-blue-600" disabled={props.elevenLabsTest.status === 'testing'}>Test</button>
          </div>
          <TestStatusIndicator status={props.elevenLabsTest.status} message={props.elevenLabsTest.message} />
        </div>
         <div>
          <label className="block font-bold mb-1">OpenRouter API Key</label>
           <div className="flex gap-2">
            <input type="password" value={props.localOpenRouterKey} onChange={e => props.setLocalOpenRouterKey(e.target.value)} className="pixel-input" />
            <button onClick={() => props.handleTestApiKey(LLMProvider.OPENROUTER, props.localOpenRouterKey)} className="pixel-button bg-blue-600" disabled={props.openRouterTest.status === 'testing'}>Test</button>
          </div>
          <TestStatusIndicator status={props.openRouterTest.status} message={props.openRouterTest.message} />
        </div>
         <div className="md:col-span-2">
            <h4 className="text-xl text-yellow-300">Microsoft Azure Speech Services</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                <div className="sm:col-span-2">
                    <label className="block font-bold mb-1 text-sm">Subscription Key</label>
                    <input type="password" value={props.localMicrosoftApiKey} onChange={e => props.setLocalMicrosoftApiKey(e.target.value)} className="pixel-input" />
                </div>
                <div>
                    <label className="block font-bold mb-1 text-sm">Service Region</label>
                    <input type="text" value={props.localMicrosoftApiRegion} onChange={e => props.setLocalMicrosoftApiRegion(e.target.value)} className="pixel-input" placeholder="e.g., westus" />
                </div>
            </div>
             <div className="mt-2 flex justify-end">
                <button onClick={() => props.handleTestApiKey('microsoft', props.localMicrosoftApiKey, props.localMicrosoftApiRegion)} className="pixel-button bg-blue-600" disabled={props.microsoftTest.status === 'testing'}>Test Azure</button>
             </div>
            <TestStatusIndicator status={props.microsoftTest.status} message={props.microsoftTest.message} />
        </div>
      </div>

      <h3 className="text-2xl text-yellow-300 mt-6">Alternative AI Endpoints</h3>
       <div>
        <h4 className="text-xl text-yellow-300">Local AI Server (Key-less)</h4>
        <label className="block font-bold mb-1 mt-1">Server URL</label>
        <div className="flex gap-2">
            <input type="text" value={props.localLocalApiUrl} onChange={e => props.setLocalLocalApiUrl(e.target.value)} className="pixel-input" placeholder="http://localhost:1234/v1" />
            <button onClick={() => props.handleTestApiKey('local', props.localLocalApiUrl)} className="pixel-button bg-blue-600" disabled={props.localApiTest.status === 'testing'}>Test</button>
        </div>
        <TestStatusIndicator status={props.localApiTest.status} message={props.localApiTest.message} />
        <p className="text-xs text-gray-400 mt-1">For servers like Ollama or LM Studio. Uses OpenAI-compatible API format.</p>
      </div>

      <div>
        <h4 className="text-xl text-yellow-300 mt-4">Custom AI Server (With Key)</h4>
        <p className="text-xs text-gray-400 mb-2">For providers like Groq, NVIDIA NIM, or other self-hosted models that require an API key.</p>
        <label className="block font-bold mb-1">Server URL</label>
        <input type="text" value={props.localCustomApiUrl} onChange={e => props.setLocalCustomApiUrl(e.target.value)} className="pixel-input" placeholder="https://api.groq.com/openai/v1" />
        <label className="block font-bold mb-1 mt-2">API Key</label>
        <input type="password" value={props.localCustomApiKey} onChange={e => props.setLocalCustomApiKey(e.target.value)} className="pixel-input" placeholder="gsk_..." />
        <label className="block font-bold mb-1 mt-2">Test Model Name (Required for Test)</label>
        <div className="flex gap-2">
            <input
               type="text"
               value={props.localCustomApiTestModel}
               onChange={e => props.setLocalCustomApiTestModel(e.target.value)}
               className="pixel-input"
               placeholder="e.g., llama3-8b-8192"
            />
            <button onClick={() => props.handleTestApiKey('custom', props.localCustomApiUrl, props.localCustomApiKey)} className="pixel-button bg-blue-600" disabled={props.customApiTest.status === 'testing'}>Test</button>
        </div>
        <TestStatusIndicator status={props.customApiTest.status} message={props.customApiTest.message} />
      </div>


      <h3 className="text-2xl text-yellow-300 mt-6">Session Data</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="space-y-2">
            <button onClick={props.handleExportAgents} className="pixel-button w-full flex items-center justify-center gap-2"><ExportIcon className="w-5 h-5"/> Export Agents</button>
            <button onClick={() => props.importAgentsInputRef.current?.click()} className="pixel-button bg-gray-600 w-full flex items-center justify-center gap-2"><ImportIcon className="w-5 h-5"/> Import Agents</button>
            <input type="file" accept=".json" ref={props.importAgentsInputRef} onChange={(e) => props.handleFileImport(e, props.handleImportAgents)} className="hidden" />
        </div>
         <div className="space-y-2">
            <button onClick={props.handleExportSession} className="pixel-button w-full flex items-center justify-center gap-2"><ExportIcon className="w-5 h-5"/> Export Session</button>
            <button onClick={() => props.importSessionInputRef.current?.click()} className="pixel-button bg-gray-600 w-full flex items-center justify-center gap-2"><ImportIcon className="w-5 h-5"/> Import Session</button>
            <input type="file" accept=".json" ref={props.importSessionInputRef} onChange={(e) => props.handleFileImport(e, props.handleImportSession)} className="hidden" />
        </div>
      </div>
    </div>
));

const PREDEFINED_SPRITE_SEEDS = ['Max', 'Bella', 'Charlie', 'Lucy', 'Leo', 'Zoe', 'Milo', 'Daisy', 'Sam', 'Alex', 'Chris', 'Pat', 'Frankie', 'Brenda', 'Desi', 'Vince', 'Leah', 'Doc', 'Penny', 'Izzy'];
const GameplayTab = memo((props: GameplayTabProps) => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl text-yellow-300 mb-2">Player Customization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="player-name" className="block font-bold mb-1">Player Name</label>
            <input id="player-name" type="text" value={props.localPlayerName} onChange={e => props.setLocalPlayerName(e.target.value)} className="pixel-input"/>
            <p className="text-xs text-gray-400 mt-1">Set your name here so agents don't have to ask.</p>
          </div>
          <div>
            <label htmlFor="player-sprite" className="block font-bold mb-1">Avatar Seed</label>
            <input id="player-sprite" type="text" value={props.localPlayerSpriteSeed} onChange={e => props.setLocalPlayerSpriteSeed(e.target.value)} className="pixel-input"/>
          </div>
        </div>
         <div className="mt-4">
            <h4 className="text-lg text-yellow-300 mb-2">Or pick a style:</h4>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 p-2 bg-black/20 rounded">
                {PREDEFINED_SPRITE_SEEDS.map(seed => (
                    <button key={seed} onClick={() => props.setLocalPlayerSpriteSeed(seed)} className={`p-1 border-2 ${props.localPlayerSpriteSeed === seed ? 'border-yellow-400 bg-yellow-400/20' : 'border-black/50'} rounded transition-all`}>
                        <AgentSprite spriteSeed={seed} className="w-full h-full" />
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div>
        <h3 className="text-2xl text-yellow-300 mb-2">Game Settings</h3>
         <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <label htmlFor="walk-speed" className="block font-bold mb-1">Walking Speed ({props.localPlayerSpeed.toFixed(1)})</label>
                <input id="walk-speed" type="range" min="2" max="8" step="0.1" value={props.localPlayerSpeed} onChange={e => props.setLocalPlayerSpeed(parseFloat(e.target.value))} className="pixel-slider"/>
              </div>
              <div>
                <label htmlFor="run-multiplier" className="block font-bold mb-1">Run Multiplier ({props.localRunMultiplier.toFixed(1)}x)</label>
                <input id="run-multiplier" type="range" min="1.5" max="4" step="0.1" value={props.localRunMultiplier} onChange={e => props.setLocalRunMultiplier(parseFloat(e.target.value))} className="pixel-slider"/>
              </div>
              <div>
                <label htmlFor="subtitle-duration" className="block font-bold mb-1">Subtitle Duration ({props.localSubtitleDurationMultiplier.toFixed(1)}x)</label>
                <input id="subtitle-duration" type="range" min="0.5" max="3" step="0.1" value={props.localSubtitleDurationMultiplier} onChange={e => props.setLocalSubtitleDurationMultiplier(parseFloat(e.target.value))} className="pixel-slider"/>
              </div>
              <div>
                 <label htmlFor="difficulty" className="block font-bold mb-1">Difficulty</label>
                 <select id="difficulty" value={props.localDifficulty} onChange={e => props.setLocalDifficulty(e.target.value as 'Easy'|'Normal'|'Hard')} className="pixel-select">
                    <option value="Easy">Easy</option>
                    <option value="Normal">Normal</option>
                    <option value="Hard">Hard</option>
                 </select>
                 <p className="text-xs text-gray-400 mt-1">Note: Difficulty settings will affect challenges in a future update.</p>
              </div>
            </div>
            <div className="space-y-3">
                <label className="flex items-center gap-2 select-none">
                    <input
                    type="checkbox"
                    checked={props.localManualSubtitleAdvance}
                    onChange={e => props.setLocalManualSubtitleAdvance(e.target.checked)}
                    className="w-5 h-5 accent-yellow-400"
                    />
                    Click to advance subtitles
                </label>
            </div>
         </div>
      </div>
    </div>
));

const AudioTab = memo((props: AudioTabProps) => (
    <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
                <h3 className="text-2xl text-yellow-300 mb-2">Sound</h3>
                <label className="flex items-center gap-2 mb-2"><input type="checkbox" checked={!props.localMusicMuted} onChange={e => props.setLocalMusicMuted(!e.target.checked)} className="w-5 h-5"/> Music</label>
                <input type="range" min="0" max="1" step="0.01" value={props.localMusicVolume} onChange={e => props.setLocalMusicVolume(parseFloat(e.target.value))} className="pixel-slider" disabled={props.localMusicMuted}/>
                 <label className="flex items-center gap-2 my-2"><input type="checkbox" checked={!props.localSfxMuted} onChange={e => props.setLocalSfxMuted(!e.target.checked)} className="w-5 h-5"/> Sound Effects</label>
                <input type="range" min="0" max="1" step="0.01" value={props.localSfxVolume} onChange={e => props.setLocalSfxVolume(parseFloat(e.target.value))} className="pixel-slider" disabled={props.localSfxMuted}/>
                <p className="text-sm mt-2">Current music: {props.currentTrackName}</p>
            </div>
            <div>
                <h3 className="text-2xl text-yellow-300 mb-2">Voice</h3>
                <label className="flex items-center gap-2 mb-2"><input type="checkbox" checked={props.localTtsEnabled} onChange={e => props.setLocalTtsEnabled(e.target.checked)} className="w-5 h-5"/> Enable Agent Voices</label>
                <input type="range" min="0" max="1" step="0.01" value={props.localTtsVolume} onChange={e => props.setLocalTtsVolume(parseFloat(e.target.value))} className="pixel-slider" disabled={!props.localTtsEnabled}/>
                <p className="text-xs text-yellow-300 mt-2">The TTS service is determined by the voice assigned to each agent in the 'Agents' tab.</p>
                 <div className="grid grid-cols-1 gap-4 mt-4">
                    <div>
                        <label className="block font-bold mb-1">Speech-to-Text Provider</label>
                        <select value={props.localSttProvider} onChange={e => props.setLocalSttProvider(e.target.value as SpeechServiceProvider)} className="pixel-select">
                             <option value={SpeechServiceProvider.BROWSER}>Browser</option>
                             <option value={SpeechServiceProvider.OPENAI} disabled={!props.openAiTest.services.tts}>OpenAI</option>
                             <option value={SpeechServiceProvider.MICROSOFT} disabled={props.microsoftTest.status !== 'success'}>Microsoft Azure</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
        <div className="mt-6 p-4 border-t-2 border-black/20">
          <h3 className="text-2xl text-yellow-300 mb-2">Voice Auto-Assignment</h3>
          <p className="text-sm text-gray-400 mb-3">
            Quickly assign premium voices to all your agents. This requires a valid API key.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => props.handleAutoAssignVoices('openai')}
              disabled={!props.openAiTest.services.tts || props.openAIVoices.length === 0}
              className="pixel-button bg-blue-600 flex-grow"
              title={!props.openAiTest.services.tts ? "Requires a valid OpenAI API Key" : ""}
            >
              Assign OpenAI Voices
            </button>
            <button
              onClick={() => props.handleAutoAssignVoices('elevenlabs')}
              disabled={props.elevenLabsTest.status !== 'success' || props.elevenLabsVoices.length === 0}
              className="pixel-button bg-purple-600 flex-grow"
              title={props.elevenLabsTest.status !== 'success' ? "Requires a valid ElevenLabs API Key" : ""}
            >
              Assign ElevenLabs Voices
            </button>
             <button
              onClick={() => props.handleAutoAssignVoices('microsoft')}
              disabled={props.microsoftTest.status !== 'success'}
              className="pixel-button bg-sky-600 flex-grow"
              title={props.microsoftTest.status !== 'success' ? "Requires valid Azure credentials" : ""}
            >
              Assign Azure Voices
            </button>
            <button
              onClick={() => props.handleAutoAssignVoices('all')}
              disabled={!props.openAiTest.services.tts && props.elevenLabsTest.status !== 'success' && props.microsoftTest.status !== 'success'}
              className="pixel-button bg-green-700 flex-grow"
              title={!props.openAiTest.services.tts && props.elevenLabsTest.status !== 'success' && props.microsoftTest.status !== 'success' ? "Requires at least one valid API Key" : ""}
            >
              Assign All Available Voices
            </button>
          </div>
          {props.voiceAssignmentFeedback && (
            <p className="mt-3 text-center text-green-300 bg-green-900/50 p-2 rounded border border-green-700">
              {props.voiceAssignmentFeedback}
            </p>
          )}
        </div>
    </div>
));

const AgentsTab = memo((props: AgentsTabProps) => (
    <div className="space-y-4">
      <div className="p-4 border-2 border-black/20 bg-black/10 rounded-md">
          <h3 className="text-2xl text-yellow-300 mb-2">Global Agent Settings</h3>
            <label className="flex items-center gap-2 select-none">
                <input
                type="checkbox"
                checked={props.localAgentAutonomyEnabled}
                onChange={e => props.setLocalAgentAutonomyEnabled(e.target.checked)}
                className="w-5 h-5 accent-yellow-400"
                />
                Enable Agent Autonomy (Reflections & Social Analysis)
            </label>
            <p className="text-xs text-gray-400 mt-1 pl-7">
                When enabled, agents will use additional background tokens to think for themselves, form new insights, and analyze social interactions. This makes the world more dynamic but increases API usage.
            </p>
      </div>

      <div className="p-4 border-2 border-black/20 bg-black/10 rounded-md">
          <h3 className="text-2xl text-yellow-300 mb-2">Model Auto-Assignment</h3>
          <p className="text-sm text-gray-400 mb-3">
              Quickly set the same model for all agents. This can be individually overridden in each agent's editor.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
              <div>
                  <label className="text-sm font-bold mb-1 block">Provider</label>
                  <select
                    value={props.autoAssignProvider}
                    onChange={e => {
                        const newProvider = e.target.value as LLMProvider.OPENAI | LLMProvider.OPENROUTER | LLMProvider.CUSTOM;
                        props.setAutoAssignProvider(newProvider);
                        props.setAutoAssignSelectedModel('');
                        props.setAutoAssignModelFilter('');
                        props.setModelAssignmentFeedback('');
                    }}
                    className="pixel-select"
                    disabled={!props.openAiTest.services.llm && props.openRouterTest.status !== 'success' && props.customApiTest.status !== 'success'}
                  >
                    <option value={LLMProvider.OPENAI} disabled={!props.openAiTest.services.llm}>OpenAI</option>
                    <option value={LLMProvider.OPENROUTER} disabled={props.openRouterTest.status !== 'success'}>OpenRouter</option>
                    <option value={LLMProvider.CUSTOM} disabled={props.customApiTest.status !== 'success'}>Custom Server</option>
                  </select>
              </div>
              <div>
                  <label className="text-sm font-bold mb-1 block">Filter</label>
                  <input
                      type="text"
                      placeholder="Filter models..."
                      value={props.autoAssignModelFilter}
                      onChange={(e) => props.setAutoAssignModelFilter(e.target.value)}
                      className="pixel-input"
                      disabled={
                        props.autoAssignProvider === LLMProvider.OPENAI ? !props.openAiTest.services.llm :
                        props.autoAssignProvider === LLMProvider.OPENROUTER ? props.openRouterTest.status !== 'success' :
                        props.autoAssignProvider === LLMProvider.CUSTOM ? props.customApiTest.status !== 'success' : true
                      }
                  />
              </div>
              <div>
                <label className="text-sm font-bold mb-1 block">Model</label>
                {props.availableAutoAssignModels.length > 0 ? (
                    <select
                    value={props.autoAssignSelectedModel}
                    onChange={e => {
                      props.setAutoAssignSelectedModel(e.target.value);
                      props.setModelAssignmentFeedback('');
                    }}
                    className="pixel-select"
                    disabled={props.availableAutoAssignModels.length === 0}
                  >
                    <option value="" disabled>-- Select a Model --</option>
                    {props.availableAutoAssignModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                    <input
                        type="text"
                        placeholder="Enter model name"
                        value={props.autoAssignSelectedModel}
                        onChange={e => {
                            props.setAutoAssignSelectedModel(e.target.value);
                            props.setModelAssignmentFeedback('');
                        }}
                        className="pixel-input"
                        disabled={
                            (props.autoAssignProvider === LLMProvider.OPENAI && !props.openAiTest.services.llm) ||
                            (props.autoAssignProvider === LLMProvider.OPENROUTER && props.openRouterTest.status !== 'success') ||
                            (props.autoAssignProvider === LLMProvider.CUSTOM && props.customApiTest.status !== 'success')
                        }
                    />
                )}
              </div>
              <div>
                <button
                    onClick={props.handleAutoAssignModel}
                    disabled={!props.autoAssignSelectedModel}
                    className="pixel-button bg-purple-600 w-full"
                  >
                    Assign to All
                  </button>
              </div>
          </div>
          {props.modelAssignmentFeedback && (
            <p className="mt-3 text-center text-purple-300 bg-purple-900/50 p-2 rounded border border-purple-700">
              {props.modelAssignmentFeedback}
            </p>
          )}
      </div>
      {props.localAgents.map(agent => (
        <div key={agent.id} className="bg-black/20 p-3 border-2 border-black flex items-center justify-between">
          <div>
            <p className="text-xl">{agent.name} {agent.isModerator && <StarIcon className="w-4 h-4 text-yellow-400 inline" filled/>}</p>
            <p className="text-sm text-gray-400">{agent.llm.provider} - {agent.llm.model}</p>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => props.setUiState({ editingAgentId: agent.id })} className="pixel-button !p-2">Edit</button>
          </div>
        </div>
      ))}
    </div>
));

const HelpTab = memo(() => (
    <div className="space-y-6 text-lg">
        <div>
            <h3 className="text-2xl text-yellow-300 mb-2">The Goal: Master Every Room</h3>
            <p>
                Your primary objective is to earn a <strong className="text-yellow-400">Mastery Star</strong> from each room. Every room has a unique intellectual challenge judged by its resident AI agents. To succeed, you must provide prompts so creative, solutions so elegant, or arguments so compelling that the agents acknowledge your skill.
            </p>
        </div>
        <div>
            <h3 className="text-2xl text-yellow-300 mb-2">Core Mechanics</h3>
            <ul className="list-disc list-inside space-y-2">
                <li><strong className="text-green-400">Movement:</strong> Use <strong className="text-green-400">Arrow Keys</strong> or <strong className="text-green-400">WASD</strong> to walk. Hold <strong className="text-yellow-400">Shift</strong> to run. Gamepads are also supported for movement.</li>
                <li><strong className="text-blue-400">Interaction:</strong> Walk near a single agent to target them for a 1-on-1 chat. Stand in an open area of a room to start a group discussion.</li>
                <li><strong className="text-purple-400">Voice Commands:</strong> Click the <strong className="text-purple-400">Mic icon</strong> or press <strong className="text-purple-400">Gamepad 'Y' / '△'</strong> to dictate your prompts.</li>
                <li><strong className="text-gray-400">Skipping:</strong> Press <strong className="text-gray-400">Enter/Esc</strong> or <strong className="text-gray-400">Gamepad 'B' / '○'</strong> to skip the current dialogue.</li>
                 <li><strong className="text-cyan-400">Social Graph:</strong> Click the <NetworkIcon className="w-5 h-5 inline-block align-text-bottom" /> icon in the header to open the relationship graph. This shows you at the center of the AI society. Click any agent (or yourself) to see their connections: green for friendship, red for rivalry. You can drag nodes to rearrange the graph for a clearer view.</li>
            </ul>
        </div>
        <div>
            <h3 className="text-2xl text-yellow-300 mb-2">Agent Management</h3>
             <ul className="list-disc list-inside space-y-2">
                <li><strong className="text-yellow-400">Editing:</strong> Double-click any agent to edit their name, persona, and AI model.</li>
                <li><strong className="text-green-400">Adding:</strong> Click the pulsing <strong className="text-green-400">(+)</strong> button inside a room to add a new custom agent.</li>
                <li><strong className="text-blue-400">Moving:</strong> Click and drag agents to reposition them, even between rooms.</li>
                <li><strong className="text-red-500">Deleting:</strong> Drag an agent to the trash can in the bottom-right of the world, or select them and press the <strong className="text-red-500">Delete/Backspace</strong> key.</li>
                <li><strong className="text-yellow-400">Moderators:</strong> Agents with a <StarIcon className="w-4 h-4 text-yellow-400 inline" filled/> icon will lead structured, interview-style discussions.</li>
            </ul>
        </div>
        <div>
            <h3 className="text-2xl text-yellow-300 mb-2">The World & Challenges</h3>
            <p>Each room with a special terminal or object has a unique challenge:</p>
             <ul className="list-disc list-inside space-y-2 mt-2">
                <li><strong className="text-pink-400">Art Studio:</strong> Use the glowing easel to generate images. The artists will critique your prompt. Refine it based on their feedback to win.</li>
                <li><strong className="text-teal-400">Tech Office:</strong> Use the terminals to generate UI components from a "vibe" or compare different AI models. Impress the dev team with iterative design.</li>
                <li><strong className="text-orange-400">Writer's Studio:</strong> Contribute to a collaborative screenplay. View the full script by clicking the typewriter.</li>
                <li><strong className="text-purple-400">Dungeon:</strong> Interact with the game board to start a D&D session. Master the room with creative role-playing.</li>
                 <li><strong className="text-blue-400">Classroom/Library:</strong> Use the Grounding Terminal to research topics with Google Search for fact-based answers.</li>
                <li><strong className="text-lime-400">Dojo:</strong> Learn AI alignment by tuning the Sensei's values in the Alignment Console to produce wise responses.</li>
            </ul>
        </div>
    </div>
));

const AboutTab = memo(() => (
    <div className="space-y-4">
      <h3 className="text-2xl text-yellow-300">About AI Agent Cafe</h3>
      <div className="bg-black/20 p-4 border-2 border-black space-y-3 text-lg">
        <p>
          This application was designed and developed by{' '}
          <strong className="text-yellow-200">Olivier Koos</strong>.
        </p>
        <p>
          The source code is available on GitHub. Feel free to explore, contribute, or fork the project!
        </p>
         <a 
          href="https://github.com/koosoli/AI-Agent-Cafe" 
          target="_blank" rel="noopener noreferrer" className="pixel-button bg-gray-700 inline-flex items-center gap-2">
            View on GitHub
         </a>
      </div>
    </div>
));

const DebugTab = memo((props: DebugTabProps) => {
    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (props.password === 'architect') {
            props.setUnlocked(true);
            props.setPassword('');
        } else {
            alert('Incorrect password.');
            props.setPassword('');
        }
    };

    if (!props.unlocked) {
        return (
            <div className="space-y-4 max-w-md mx-auto text-center">
                <h3 className="text-2xl text-yellow-300">Enter Debug Password</h3>
                <form onSubmit={handleUnlock} className="flex gap-2">
                    <input
                        type="password"
                        value={props.password}
                        onChange={e => props.setPassword(e.target.value)}
                        className="pixel-input"
                        autoFocus
                    />
                    <button type="submit" className="pixel-button bg-blue-600">Unlock</button>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-2xl text-yellow-300">Debug Actions</h3>
            <p className="text-gray-400">These actions are for testing purposes and can alter your game state significantly.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t-2 border-black/20">
                <button onClick={props.onDebugMasterAll} className="pixel-button bg-yellow-700">Master All Rooms</button>
                <button onClick={props.onResetGame} className="pixel-button bg-red-700">Reset Game State</button>
            </div>
            <div className="pt-4 border-t-2 border-black/20">
                <label className="flex items-center gap-2 select-none">
                    <input
                        type="checkbox"
                        checked={props.showFps}
                        onChange={e => props.setShowFps(e.target.checked)}
                        className="w-5 h-5 accent-yellow-400"
                    />
                    Show FPS Counter
                </label>
            </div>
        </div>
    );
});


interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDebugMasterAll: () => void;
    onResetGame: () => void;
}

const SettingsModal = ({ isOpen, onClose, onDebugMasterAll, onResetGame }: SettingsModalProps) => {
    const { agents, services, game, ui, userProfile } = useAppStore(s => ({
        agents: s.agents,
        services: s.services,
        game: s.game,
        ui: s.ui,
        userProfile: s.userProfile,
    }), shallow);
    const { setServiceState, setAudioState, setGameState, setUiState, setAgents, setUserProfile } = useAppStore.getState();

    const [activeTab, setActiveTab] = useState(ui.initialSettingsTab || 'General');
    const initialStateSnapshot = useRef<any>(null);

    // Local state for API keys and settings
    const [localGeminiKey, setLocalGeminiKey] = useState(services.geminiApiKey);
    const [localOpenAiKey, setLocalOpenAiKey] = useState(services.openAiApiKey);
    const [localElevenLabsKey, setLocalElevenLabsKey] = useState(services.elevenLabsApiKey);
    const [localOpenRouterKey, setLocalOpenRouterKey] = useState(services.openRouterApiKey);
    const [localMicrosoftApiKey, setLocalMicrosoftApiKey] = useState(services.microsoftApiKey);
    const [localMicrosoftApiRegion, setLocalMicrosoftApiRegion] = useState(services.microsoftApiRegion);
    const [localLocalApiUrl, setLocalLocalApiUrl] = useState(services.localApiUrl);
    const [localCustomApiUrl, setLocalCustomApiUrl] = useState(services.customApiUrl);
    const [localCustomApiKey, setLocalCustomApiKey] = useState(services.customApiKey);
    const [localCustomApiTestModel, setLocalCustomApiTestModel] = useState('');

    const [localMusicMuted, setLocalMusicMuted] = useState(false);
    const [localSfxMuted, setLocalSfxMuted] = useState(false);
    const [localMusicVolume, setLocalMusicVolume] = useState(0.05);
    const [localSfxVolume, setLocalSfxVolume] = useState(1.0);
    const [localTtsEnabled, setLocalTtsEnabled] = useState(false);
    const [localTtsVolume, setLocalTtsVolume] = useState(1.0);
    const [localSttProvider, setLocalSttProvider] = useState<SpeechServiceProvider>(SpeechServiceProvider.BROWSER);
    const [localAgentVoices, setLocalAgentVoices] = useState<Record<string,string>>({});

    const [localPlayerName, setLocalPlayerName] = useState('');
    const [localPlayerSpriteSeed, setLocalPlayerSpriteSeed] = useState(USER_AGENT.spriteSeed);
    const [localPlayerSpeed, setLocalPlayerSpeed] = useState(GAME_CONFIG.PLAYER_SPEED);
    const [localRunMultiplier, setLocalRunMultiplier] = useState(GAME_CONFIG.RUN_MULTIPLIER);
    const [localSubtitleDurationMultiplier, setLocalSubtitleDurationMultiplier] = useState(1.0);
    const [localDifficulty, setLocalDifficulty] = useState<'Easy'|'Normal'|'Hard'>('Normal');
    const [localManualSubtitleAdvance, setLocalManualSubtitleAdvance] = useState(false);
    const [localAgentAutonomyEnabled, setLocalAgentAutonomyEnabled] = useState(false);
    const [localShowFps, setLocalShowFps] = useState(false);
    
    const [autoAssignProvider, setAutoAssignProvider] = useState<LLMProvider.OPENAI | LLMProvider.OPENROUTER | LLMProvider.CUSTOM>(LLMProvider.OPENAI);
    const [autoAssignModelFilter, setAutoAssignModelFilter] = useState('');
    const [autoAssignSelectedModel, setAutoAssignSelectedModel] = useState('');
    const [modelAssignmentFeedback, setModelAssignmentFeedback] = useState('');

    const [debugPassword, setDebugPassword] = useState('');
    const [debugUnlocked, setDebugUnlocked] = useState(false);

    const importAgentsInputRef = useRef<HTMLInputElement>(null);
    const importSessionInputRef = useRef<HTMLInputElement>(null);

    const [geminiTest, setGeminiTest] = useState<{ status: TestStatus, message: string }>({ status: 'idle', message: '' });
    const [openAiTest, setOpenAiTest] = useState<OpenAITestState>({ status: 'idle', message: '', services: { llm: false, tts: false } });
    const [elevenLabsTest, setElevenLabsTest] = useState<{ status: TestStatus, message: string }>({ status: 'idle', message: '' });
    const [openRouterTest, setOpenRouterTest] = useState<{ status: TestStatus, message: string }>({ status: 'idle', message: '' });
    const [microsoftTest, setMicrosoftTest] = useState<{ status: TestStatus, message: string }>({ status: 'idle', message: '' });
    const [localApiTest, setLocalApiTest] = useState<{ status: TestStatus, message: string }>({ status: 'idle', message: '' });
    const [customApiTest, setCustomApiTest] = useState<{ status: TestStatus, message: string }>({ status: 'idle', message: '' });

    const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
    const [voiceAssignmentFeedback, setVoiceAssignmentFeedback] = useState('');
    
    const editingAgent = agents.find(a => a.id === ui.editingAgentId);

    const commitLocalChanges = useCallback(() => {
        setServiceState({
            geminiApiKey: localGeminiKey,
            openAiApiKey: localOpenAiKey,
            elevenLabsApiKey: localElevenLabsKey,
            openRouterApiKey: localOpenRouterKey,
            microsoftApiKey: localMicrosoftApiKey,
            microsoftApiRegion: localMicrosoftApiRegion,
            localApiUrl: localLocalApiUrl,
            customApiUrl: localCustomApiUrl,
            customApiKey: localCustomApiKey,
        });
        setAudioState({
            musicMuted: localMusicMuted,
            sfxMuted: localSfxMuted,
            musicVolume: localMusicVolume,
            sfxVolume: localSfxVolume,
            ttsEnabled: localTtsEnabled,
            ttsVolume: localTtsVolume,
            agentVoices: localAgentVoices,
            sttProvider: localSttProvider,
        });
        setGameState({
            playerSpeed: localPlayerSpeed,
            runMultiplier: localRunMultiplier,
            subtitleDurationMultiplier: localSubtitleDurationMultiplier,
            difficulty: localDifficulty,
            manualSubtitleAdvance: localManualSubtitleAdvance,
            agentAutonomyEnabled: localAgentAutonomyEnabled,
        });
        setUiState({ showFps: localShowFps });
        const currentAgents = useAppStore.getState().agents;
        setAgents(currentAgents.map(a => a.id === USER_AGENT.id ? { ...a, name: localPlayerName || USER_AGENT.name, spriteSeed: localPlayerSpriteSeed } : a));
        setUserProfile({ name: localPlayerName });
    }, [
        localGeminiKey, localOpenAiKey, localElevenLabsKey, localOpenRouterKey, localMicrosoftApiKey, localMicrosoftApiRegion,
        localLocalApiUrl, localCustomApiUrl, localCustomApiKey,
        localMusicMuted, localSfxMuted, localMusicVolume, localSfxVolume, localTtsEnabled, localTtsVolume, localAgentVoices, localSttProvider,
        localPlayerSpeed, localRunMultiplier, localSubtitleDurationMultiplier, localDifficulty, localManualSubtitleAdvance, localAgentAutonomyEnabled, localShowFps,
        localPlayerName, localPlayerSpriteSeed,
        setServiceState, setAudioState, setGameState, setUiState, setAgents, setUserProfile
    ]);

    useEffect(() => {
        if (isOpen) {
            const currentState = useAppStore.getState();
            initialStateSnapshot.current = {
                services: JSON.parse(JSON.stringify(currentState.services)),
                audio: JSON.parse(JSON.stringify(currentState.audio)),
                game: JSON.parse(JSON.stringify(currentState.game)),
                ui: JSON.parse(JSON.stringify(currentState.ui)),
                agents: JSON.parse(JSON.stringify(currentState.agents)),
                userProfile: JSON.parse(JSON.stringify(currentState.userProfile))
            };

            setActiveTab(ui.initialSettingsTab || 'General');
            setDebugUnlocked(false);
            setDebugPassword('');
            
            setLocalGeminiKey(currentState.services.geminiApiKey);
            setLocalOpenAiKey(currentState.services.openAiApiKey);
            setLocalElevenLabsKey(currentState.services.elevenLabsApiKey);
            setLocalOpenRouterKey(currentState.services.openRouterApiKey);
            setLocalMicrosoftApiKey(currentState.services.microsoftApiKey);
            setLocalMicrosoftApiRegion(currentState.services.microsoftApiRegion);
            setLocalLocalApiUrl(currentState.services.localApiUrl);
            setLocalCustomApiUrl(currentState.services.customApiUrl);
            setLocalCustomApiKey(currentState.services.customApiKey);
            setLocalMusicMuted(currentState.audio.musicMuted);
            setLocalSfxMuted(currentState.audio.sfxMuted);
            setLocalMusicVolume(currentState.audio.musicVolume);
            setLocalSfxVolume(currentState.audio.sfxVolume);
            setLocalTtsEnabled(currentState.audio.ttsEnabled);
            setLocalTtsVolume(currentState.audio.ttsVolume);
            setLocalSttProvider(currentState.audio.sttProvider);
            setLocalAgentVoices(currentState.audio.agentVoices);

            setLocalPlayerName(currentState.userProfile.name || '');
            const player = currentState.agents.find(a => a.id === USER_AGENT.id);
            setLocalPlayerSpriteSeed(player?.spriteSeed || USER_AGENT.spriteSeed);
            setLocalPlayerSpeed(currentState.game.playerSpeed);
            setLocalRunMultiplier(currentState.game.runMultiplier);
            setLocalSubtitleDurationMultiplier(currentState.game.subtitleDurationMultiplier);
            setLocalDifficulty(currentState.game.difficulty);
            setLocalManualSubtitleAdvance(currentState.game.manualSubtitleAdvance);
            setLocalAgentAutonomyEnabled(currentState.game.agentAutonomyEnabled);
            setLocalShowFps(currentState.ui.showFps);
        }
    }, [isOpen, ui.initialSettingsTab]);
    
    useEffect(() => {
        if(elevenLabsTest.status === 'success' && localElevenLabsKey) {
            speechService.fetchElevenLabsVoices(localElevenLabsKey).then(setElevenLabsVoices);
        }
    }, [elevenLabsTest.status, localElevenLabsKey]);
    
    const handleSave = () => {
        commitLocalChanges();
        onClose();
    };

    const handleCancel = () => {
        if (initialStateSnapshot.current) {
            const { services, audio, game, agents, userProfile, ui: uiSnapshot } = initialStateSnapshot.current;
            setServiceState(services);
            setAudioState(audio);
            setGameState(game);
            setAgents(agents);
            setUserProfile(userProfile);
            setUiState(uiSnapshot);
        }
        onClose();
    };

    const handleTabChange = (tabName: string) => {
        commitLocalChanges();
        setActiveTab(tabName);
    };

    const handleTestApiKey = useCallback(async (provider: ServiceToTest, key: string, secondParam?: string) => {
        const setTestState = (status: TestStatus, message: string) => {
            if (provider === 'gemini') setGeminiTest({ status, message });
            else if (provider === LLMProvider.OPENAI) setOpenAiTest(prev => ({ ...prev, status, message }));
            else if (provider === 'elevenlabs') setElevenLabsTest({ status, message });
            else if (provider === LLMProvider.OPENROUTER) setOpenRouterTest({ status, message });
            else if (provider === 'microsoft') setMicrosoftTest({ status, message });
            else if (provider === 'local') setLocalApiTest({ status, message });
            else if (provider === 'custom') setCustomApiTest({ status, message });
        };
        setTestState('testing', 'Testing...');

        if (provider === 'gemini') {
            const result = await testGeminiApiKey(key);
            setTestState(result.success ? 'success' : 'error', result.success ? 'Gemini API Key is valid!' : result.error || 'Test failed.');
        } else if (provider === LLMProvider.OPENAI) {
            const llmResult = await testOpenAICompatible(LLMProvider.OPENAI, key);
            const ttsResult = await speechService.testOpenAITTSKey(key);
            const success = llmResult.success || ttsResult.success;
            let message = '';
            if (llmResult.success && ttsResult.success) message = 'OpenAI key is valid for both LLM and TTS.';
            else if (llmResult.success) message = 'Key is valid for LLM, but failed for TTS.';
            else if (ttsResult.success) message = 'Key is valid for TTS, but failed for LLM.';
            else message = `LLM Error: ${llmResult.error}\nTTS Error: ${ttsResult.error}`;
            setOpenAiTest({ status: success ? 'success' : 'error', message, services: { llm: llmResult.success, tts: ttsResult.success }});
            if (llmResult.success) fetchOpenAIModels(key).then(models => setServiceState({ openAIModels: models }));
        } else if (provider === 'elevenlabs') {
            const result = await speechService.testElevenLabsKey(key);
            setTestState(result.success ? 'success' : 'error', result.success ? 'ElevenLabs API Key is valid!' : result.error || 'Test failed.');
        } else if (provider === LLMProvider.OPENROUTER) {
            const result = await testOpenAICompatible(LLMProvider.OPENROUTER, key);
            setTestState(result.success ? 'success' : 'error', result.success ? 'OpenRouter API Key is valid!' : result.error || 'Test failed.');
            if (result.success) fetchOpenRouterModels(key).then(models => setServiceState({ openRouterModels: models }));
        } else if (provider === 'microsoft') {
            const result = await speechService.testMicrosoftCredentials(key, secondParam || '');
            setTestState(result.success ? 'success' : 'error', result.success ? 'Microsoft Azure credentials are valid!' : result.error || 'Test failed.');
        } else if (provider === 'local') {
            const result = await testLocalAI(key);
            setTestState(result.success ? 'success' : 'error', result.message);
            if(result.success) setServiceState({ localAIModels: result.models });
        } else if (provider === 'custom') {
            if (!localCustomApiTestModel) { setTestState('error', 'Please enter a test model name.'); return; }
            const result = await testCustomAI(key, secondParam || '', localCustomApiTestModel);
            setTestState(result.success ? 'success' : 'error', result.message);
            if(result.success) setServiceState({ customAIModels: result.models });
        }
    }, [setServiceState, localCustomApiTestModel]);
    
     const availableAutoAssignModels = useMemo(() => {
        const models = (
            autoAssignProvider === LLMProvider.OPENAI ? services.openAIModels :
            autoAssignProvider === LLMProvider.OPENROUTER ? services.openRouterModels :
            autoAssignProvider === LLMProvider.CUSTOM ? services.customAIModels :
            []
        );
        if (!autoAssignModelFilter) return models;
        return models.filter(m => m.toLowerCase().includes(autoAssignModelFilter.toLowerCase()));
    }, [autoAssignProvider, autoAssignModelFilter, services.openAIModels, services.openRouterModels, services.customAIModels]);

    const handleAutoAssignModel = () => {
        if (!autoAssignSelectedModel) return;
        const newAgents = agents.map(agent => {
            if (agent.id === USER_AGENT.id) return agent;
            return {
                ...agent,
                llm: { provider: autoAssignProvider, model: autoAssignSelectedModel }
            };
        });
        setAgents(newAgents);
        setModelAssignmentFeedback(`Assigned ${autoAssignSelectedModel} to all agents.`);
    };

    if (!isOpen) return null;

    if (editingAgent) {
        // Render only the agent editor if an agent is being edited
        return (
             <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
                <div
                    className="pixel-modal w-full max-w-xl welcome-modal-animation flex flex-col max-h-[90vh]"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-agent-heading"
                >
                    <div className="p-6 overflow-y-auto">
                         <AgentEditor
                            agent={editingAgent}
                            isNew={false}
                            onUpdate={(updatedFields) => setAgents(agents.map(a => a.id === editingAgent.id ? { ...a, ...updatedFields } : a))}
                            onLlmUpdate={(updatedLlm) => setAgents(agents.map(a => a.id === editingAgent.id ? { ...a, llm: { ...a.llm, ...updatedLlm } } : a))}
                            onVoiceChange={(voiceURI) => {
                                setLocalAgentVoices(prev => ({...prev, [editingAgent.id]: voiceURI}));
                                // Auto-enable TTS when a voice is selected, as this is the user's clear intent.
                                setLocalTtsEnabled(true);
                            }}
                            onDelete={() => {
                                setAgents(agents.filter(a => a.id !== editingAgent.id));
                                setUiState({ editingAgentId: null });
                            }}
                            onInspectMind={() => setUiState({ inspectorData: { agent: editingAgent, history: game.agentPromptHistory[editingAgent.id] || [], startIndex: (game.agentPromptHistory[editingAgent.id] || []).length - 1 }, isSettingsOpen: false })}
                            openAIModels={services.openAIModels}
                            openRouterModels={services.openRouterModels}
                            localAIModels={services.localAIModels}
                            customAIModels={services.customAIModels}
                            localAgentVoices={localAgentVoices}
                            browserVoices={speechService.getVoices()}
                            openAiTest={openAiTest}
                            elevenLabsTest={elevenLabsTest}
                            microsoftTest={microsoftTest}
                            elevenLabsVoices={elevenLabsVoices}
                            openAIVoices={speechService.getOpenAIVoices()}
                            microsoftVoices={speechService.getMicrosoftVoices()}
                        />
                    </div>
                     <div className="p-4 border-t-2 border-black mt-auto flex justify-end">
                        <button onClick={() => { setUiState({ editingAgentId: null }); handleSave(); }} className="pixel-button bg-blue-600">Close</button>
                    </div>
                </div>
             </div>
        )
    }

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>, onImport: (data: any) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                onImport(data);
                alert('Import successful!');
            } catch (error) {
                alert('Failed to import file. Please check if it is a valid JSON file.');
            }
        };
        reader.readAsText(file);
    };

    const generalTabProps = {
        localGeminiKey, setLocalGeminiKey, localOpenAiKey, setLocalOpenAiKey, localElevenLabsKey, setLocalElevenLabsKey, localOpenRouterKey, setLocalOpenRouterKey,
        localMicrosoftApiKey, setLocalMicrosoftApiKey, localMicrosoftApiRegion, setLocalMicrosoftApiRegion, localLocalApiUrl, setLocalLocalApiUrl, localCustomApiUrl, setLocalCustomApiUrl, localCustomApiKey, setLocalCustomApiKey, localCustomApiTestModel, setLocalCustomApiTestModel,
        geminiTest, openAiTest, elevenLabsTest, openRouterTest, microsoftTest, localApiTest, customApiTest, handleTestApiKey,
        handleFileImport, importAgentsInputRef, importSessionInputRef,
        handleImportAgents: (data: any) => setAgents(data),
        handleImportSession: (data: any) => useAppStore.getState().loadSession(data),
        handleExportAgents: () => {
            const data = JSON.stringify(agents.filter(a => a.id !== USER_AGENT.id), null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'ai-cafe-agents.json'; a.click(); URL.revokeObjectURL(url);
        },
        handleExportSession: () => {
             const data = JSON.stringify(useAppStore.getState(), null, 2);
             const blob = new Blob([data], { type: 'application/json' });
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a'); a.href = url; a.download = 'ai-cafe-session.json'; a.click(); URL.revokeObjectURL(url);
        }
    };
    
    const gameplayTabProps = {
        localPlayerName, setLocalPlayerName, localPlayerSpriteSeed, setLocalPlayerSpriteSeed, localPlayerSpeed, setLocalPlayerSpeed, localRunMultiplier, setLocalRunMultiplier,
        localSubtitleDurationMultiplier, setLocalSubtitleDurationMultiplier, localDifficulty, setLocalDifficulty, localManualSubtitleAdvance, setLocalManualSubtitleAdvance
    };
    
    const audioTabProps = {
        localMusicMuted, setLocalMusicMuted, localMusicVolume, setLocalMusicVolume, localSfxMuted, setLocalSfxMuted, localSfxVolume, setLocalSfxVolume,
        localTtsEnabled, setLocalTtsEnabled, localTtsVolume, setLocalTtsVolume, localSttProvider, setLocalSttProvider,
        currentTrackName: MUSIC_TRACKS[useAppStore.getState().audio.currentTrack as keyof typeof MUSIC_TRACKS] || 'None',
        openAiTest, elevenLabsTest, microsoftTest, elevenLabsVoices, openAIVoices: speechService.getOpenAIVoices(),
        handleAutoAssignVoices: (type: 'openai' | 'elevenlabs' | 'microsoft' | 'all') => {
            const available: Record<string, any[]> = {};
            if ((type === 'all' || type === 'openai') && openAiTest.services.tts) available.openai = speechService.getOpenAIVoices();
            if ((type === 'all' || type === 'elevenlabs') && elevenLabsTest.status === 'success') available.elevenlabs = elevenLabsVoices;
            if ((type === 'all' || type === 'microsoft') && microsoftTest.status === 'success') available.microsoft = speechService.getMicrosoftVoices();
            
            const providers = Object.keys(available);
            if (providers.length === 0) { setVoiceAssignmentFeedback("No valid TTS services available."); return; }
            
            const newVoices = { ...localAgentVoices };
            let count = 0;
            agents.forEach((agent, index) => {
                if (agent.id === USER_AGENT.id) return;
                const provider = providers[index % providers.length];
                const voiceList = available[provider];
                if (voiceList.length > 0) {
                    const voice = voiceList[index % voiceList.length];
                    newVoices[agent.id] = `${provider}:${'voice_id' in voice ? voice.voice_id : voice.ShortName}`;
                    count++;
                }
            });
            setLocalAgentVoices(newVoices);
            if (count > 0) {
                // Auto-enable TTS when voices are assigned, as this is the user's clear intent.
                setLocalTtsEnabled(true);
            }
            setVoiceAssignmentFeedback(`Assigned voices to ${count} agents.`);
        },
        voiceAssignmentFeedback
    };

    const agentsTabProps = {
        localAgents: agents.filter(a => a.id !== USER_AGENT.id),
        localAgentAutonomyEnabled, setLocalAgentAutonomyEnabled,
        services, openAiTest, openRouterTest, customApiTest, setUiState,
        autoAssignProvider, setAutoAssignProvider, autoAssignModelFilter, setAutoAssignModelFilter, autoAssignSelectedModel, setAutoAssignSelectedModel,
        availableAutoAssignModels, handleAutoAssignModel, modelAssignmentFeedback, setModelAssignmentFeedback,
    };

    const debugTabProps = {
        password: debugPassword,
        setPassword: setDebugPassword,
        unlocked: debugUnlocked,
        setUnlocked: setDebugUnlocked,
        showFps: localShowFps,
        setShowFps: setLocalShowFps,
        onDebugMasterAll,
        onResetGame
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
            <div
              className="pixel-modal w-full max-w-4xl welcome-modal-animation flex flex-col max-h-[90vh]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-heading"
            >
                <ModalHeader title="Settings" onClose={handleCancel} headingId="settings-heading" />

                <div className="p-4 md:px-6 border-b-2 border-black flex flex-wrap gap-2">
                    <button onClick={() => handleTabChange('General')} className={`pixel-button ${activeTab === 'General' ? 'bg-yellow-600' : 'bg-gray-600'}`}>General</button>
                    <button onClick={() => handleTabChange('Gameplay')} className={`pixel-button ${activeTab === 'Gameplay' ? 'bg-yellow-600' : 'bg-gray-600'}`}>Gameplay</button>
                    <button onClick={() => handleTabChange('Audio')} className={`pixel-button ${activeTab === 'Audio' ? 'bg-yellow-600' : 'bg-gray-600'}`}>Audio</button>
                    <button onClick={() => handleTabChange('Agents')} className={`pixel-button ${activeTab === 'Agents' ? 'bg-yellow-600' : 'bg-gray-600'}`}>Agents</button>
                    <button onClick={() => handleTabChange('Help')} className={`pixel-button ${activeTab === 'Help' ? 'bg-yellow-600' : 'bg-gray-600'}`}>Help</button>
                    <button onClick={() => handleTabChange('About')} className={`pixel-button ${activeTab === 'About' ? 'bg-yellow-600' : 'bg-gray-600'}`}>About</button>
                    <button onClick={() => handleTabChange('Debug')} className={`pixel-button ${activeTab === 'Debug' ? 'bg-yellow-600' : 'bg-red-700'}`}>Debug</button>
                </div>
                
                <div className="p-4 md:p-6 overflow-y-auto flex-grow">
                    {activeTab === 'General' && <GeneralTab {...generalTabProps} />}
                    {activeTab === 'Gameplay' && <GameplayTab {...gameplayTabProps} />}
                    {activeTab === 'Audio' && <AudioTab {...audioTabProps} />}
                    {activeTab === 'Agents' && <AgentsTab {...agentsTabProps} />}
                    {activeTab === 'Help' && <HelpTab />}
                    {activeTab === 'About' && <AboutTab />}
                    {activeTab === 'Debug' && <DebugTab {...debugTabProps} />}
                </div>

                <div className="p-4 border-t-2 border-black mt-auto flex justify-end">
                    <button onClick={handleCancel} className="pixel-button bg-gray-600 text-lg md:text-xl mr-4">Cancel</button>
                    <button onClick={handleSave} className="pixel-button bg-blue-600 text-lg md:text-xl">Save & Close</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;