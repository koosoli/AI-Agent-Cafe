import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Agent, Scenario } from '../types';
import { ScenarioType, LLMProvider } from '../types';
import { CloseIcon, ExportIcon, ImportIcon } from './icons';
import { testOpenAICompatible, fetchOpenRouterModels, fetchOpenAIModels } from '../services/llmService';
import { MUSIC_TRACKS } from '../services/audioService';
import { USER_AGENT, GEMINI_MODELS, PERSONA_TEMPLATES, DEFAULT_AGENTS, CODING_AGENTS, AI_CAFE_SCENARIO_PROMPT, CODING_PROJECT_SCENARIO_PROMPT, SCENARIO_PROMPT_TEMPLATES, SCREENWRITING_AGENTS, SCREENWRITING_SCENARIO_PROMPT, PHILO_CAFE_SCENARIO_PROMPT, PHILO_AGENTS } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  scenario: Scenario;
  onSave: (data: { agents: Agent[]; scenario: Scenario }) => void;
  musicMuted: boolean;
  onMusicMuteChange: (muted: boolean) => void;
  sfxMuted: boolean;
  onSfxMuteChange: (muted: boolean) => void;
  currentTrack: string;
  onTrackChange: (trackUrl: string) => void;
  musicVolume: number;
  onMusicVolumeChange: (volume: number) => void;
  sfxVolume: number;
  onSfxVolumeChange: (volume: number) => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const downloadJson = (data: any, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const SettingsModal = ({ 
    isOpen, 
    onClose, 
    agents, 
    scenario, 
    onSave,
    musicMuted,
    onMusicMuteChange,
    sfxMuted,
    onSfxMuteChange,
    currentTrack,
    onTrackChange,
    musicVolume,
    onMusicVolumeChange,
    sfxVolume,
    onSfxVolumeChange,
}: SettingsModalProps) => {
  const [localAgents, setLocalAgents] = useState<Agent[]>([]);
  const [localScenario, setLocalScenario] = useState<Scenario>({ type: ScenarioType.CAFE, prompt: '', movementEnabled: false });
  const [testResults, setTestResults] = useState<Record<string, { status: TestStatus; message: string }>>({});
  const [openRouterModels, setOpenRouterModels] = useState<string[]>([]);
  const [openAIModels, setOpenAIModels] = useState<string[]>([]);
  const [fetchingModelsFor, setFetchingModelsFor] = useState<string | null>(null);
  const [modelFilters, setModelFilters] = useState<Record<string, string>>({});
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const currentTrackName = Object.keys(MUSIC_TRACKS).find(key => MUSIC_TRACKS[key as keyof typeof MUSIC_TRACKS] === currentTrack) || 'None';

  useEffect(() => {
    if (isOpen) {
      const editableAgents = agents.filter(a => a.id !== USER_AGENT.id);
      setLocalAgents(JSON.parse(JSON.stringify(editableAgents)));
      setLocalScenario(JSON.parse(JSON.stringify(scenario)));
      setTestResults({});
      setModelFilters({});
    }
  }, [agents, scenario, isOpen]);
  
  const getModels = useCallback(async (agent: Agent) => {
    if (!agent.llm.apiKey) return;
    setFetchingModelsFor(agent.id);
    let models: string[] = [];
    if (agent.llm.provider === LLMProvider.OPENROUTER) {
      models = await fetchOpenRouterModels(agent.llm.apiKey);
      setOpenRouterModels(models);
    } else if (agent.llm.provider === LLMProvider.OPENAI) {
      models = await fetchOpenAIModels(agent.llm.apiKey);
      setOpenAIModels(models);
    }
    setFetchingModelsFor(null);
  }, []);

  if (!isOpen) return null;

  const handleScenarioTypeChange = (type: ScenarioType) => {
    let newPrompt = '';
    const newTemplateId = 'custom';
    if (type === ScenarioType.CAFE) {
        newPrompt = AI_CAFE_SCENARIO_PROMPT;
        setLocalAgents(JSON.parse(JSON.stringify(DEFAULT_AGENTS)));
    } else if (type === ScenarioType.PHILO_CAFE) {
        newPrompt = PHILO_CAFE_SCENARIO_PROMPT;
        setLocalAgents(JSON.parse(JSON.stringify(PHILO_AGENTS)));
    } else if (type === ScenarioType.CODING_PROJECT) {
        newPrompt = CODING_PROJECT_SCENARIO_PROMPT;
        setLocalAgents(JSON.parse(JSON.stringify(CODING_AGENTS)));
    } else if (type === ScenarioType.SCREENWRITING) {
        newPrompt = SCREENWRITING_SCENARIO_PROMPT;
        setLocalAgents(JSON.parse(JSON.stringify(SCREENWRITING_AGENTS)));
    }
    setLocalScenario(s => ({ ...s, type, prompt: newPrompt, scenarioTemplateId: newTemplateId }));
  };
  
  const handleLoadScenarioTemplate = (templateName: string) => {
    const promptText = SCENARIO_PROMPT_TEMPLATES[templateName];
    if (promptText !== undefined) {
        setLocalScenario(s => ({...s, prompt: promptText, scenarioTemplateId: templateName}));
    }
  };

  const handleScenarioPromptChange = (prompt: string) => {
    const matchingTemplateKey = Object.entries(SCENARIO_PROMPT_TEMPLATES)
                                      .find(([_, text]) => text === prompt)?.[0];
                                      
    setLocalScenario(s => ({
        ...s,
        prompt: prompt,
        scenarioTemplateId: matchingTemplateKey || 'custom'
    }));
  };

  const handleAgentChange = <T extends keyof Agent>(id: string, field: T, value: Agent[T]) => {
    setLocalAgents(prev => prev.map(agent => {
        if (agent.id === id) {
            const updatedAgent = { ...agent, [field]: value };
            if (field === 'name') updatedAgent.useModelAsName = false;
            if (field === 'useModelAsName' && value === true) updatedAgent.name = updatedAgent.llm.model;
            
            if (field === 'persona') {
                const newText = value as string;
                const matchingTemplateKey = Object.entries(PERSONA_TEMPLATES)
                                                  .find(([_, text]) => text === newText)?.[0];
                updatedAgent.personaTemplateId = matchingTemplateKey || 'custom';
            }
            
            return updatedAgent;
        }
        return agent;
    }));
  };
  
  const handleLlmChange = (id: string, field: string, value: string) => {
    setLocalAgents(prev => prev.map(agent => {
        if (agent.id === id) {
            const newLlm = { ...agent.llm, [field]: value };
            const updatedAgent = { ...agent, llm: newLlm };
            
            if (field === 'provider') {
                setTestResults(prev => ({...prev, [id]: {status:'idle', message:''}}));
                setModelFilters(prevFilters => ({...prevFilters, [id]: ''})); // Reset filter
                if(value === LLMProvider.GEMINI) newLlm.model = GEMINI_MODELS[0];
                if(value === LLMProvider.OPENAI) newLlm.model = 'gpt-4o';
                if(value === LLMProvider.OPENROUTER) newLlm.model = 'openai/gpt-4o';
            }
            if(agent.useModelAsName) updatedAgent.name = newLlm.model;
            return updatedAgent;
        }
        return agent;
    }));
  };

  const handleAddAgent = () => {
    const newAgent: Agent = {
        id: `agent-${Date.now()}`,
        name: 'New Agent',
        useModelAsName: false,
        persona: PERSONA_TEMPLATES['Default'],
        personaTemplateId: 'Default',
        isModerator: false,
        llm: { provider: LLMProvider.GEMINI, apiKey: '', model: GEMINI_MODELS[0] },
        position: { top: 300, left: 512 },
        spriteSeed: `agent-${Date.now()}`
    };
    setLocalAgents([...localAgents, newAgent]);
  };

  const handleRemoveAgent = (id: string) => {
    setLocalAgents(prev => prev.filter(agent => agent.id !== id));
  };

  const handleSave = () => {
    onSave({ agents: [USER_AGENT, ...localAgents], scenario: localScenario });
    onClose();
  };

  const handleTestApiKey = async (agentToTest: Agent) => {
    setTestResults(prev => ({...prev, [agentToTest.id]: {status: 'testing', message: 'Testing...'}}));
    const result = await testOpenAICompatible(agentToTest);
    setTestResults(prev => ({ ...prev, [agentToTest.id]: { status: result.success ? 'success' : 'error', message: result.error || 'Test successful!' } }));
    if (result.success) getModels(agentToTest);
  };
  
  const handlePersonaTemplateChange = (id: string, templateName: string) => {
    const personaText = PERSONA_TEMPLATES[templateName];
    if (personaText !== undefined) {
      setLocalAgents(prev => prev.map(agent => {
          if (agent.id === id) {
              return { ...agent, persona: personaText, personaTemplateId: templateName };
          }
          return agent;
      }));
    }
  };
  
  const handleImportAgents = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) { // Basic validation
          setLocalAgents(imported);
        } else {
          alert('Invalid file format. Expected an array of agents.');
        }
      } catch (err) {
        alert('Failed to parse agents file.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset for same-file import
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="pixel-modal w-full max-w-5xl max-h-[90vh] flex flex-col">
        <header className="pixel-header flex justify-between items-center p-4">
          <h2 className="text-4xl">Settings</h2>
           <div className="flex items-center gap-2">
              <input type="file" ref={importInputRef} onChange={handleImportAgents} accept=".json" className="hidden"/>
              <button onClick={() => importInputRef.current?.click()} className="pixel-button !p-2 flex items-center gap-2 text-sm"><ImportIcon className="w-5 h-5"/> Import Agents</button>
              <button onClick={() => downloadJson(localAgents, 'ai-cafe-agents.json')} className="pixel-button !p-2 flex items-center gap-2 text-sm"><ExportIcon className="w-5 h-5"/> Export Agents</button>
              <button onClick={onClose} className="text-white hover:text-red-500 ml-4"><CloseIcon className="w-8 h-8" /></button>
          </div>
        </header>
        
        <div className="p-4 overflow-y-auto space-y-4 flex-grow">
          {/* Audio Section */}
          <div className="p-4 border-2 border-black bg-black/20 space-y-3">
              <h3 className="text-3xl text-yellow-300">Audio</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                  <div>
                      <label className="block text-sm font-bold mb-1">Background Music</label>
                      <select
                          value={currentTrackName}
                          onChange={(e) => onTrackChange(MUSIC_TRACKS[e.target.value as keyof typeof MUSIC_TRACKS])}
                          className="pixel-select"
                      >
                          {Object.keys(MUSIC_TRACKS).map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                  </div>
                  <div className="flex items-center gap-8 pt-0 md:pt-6">
                      <div className="flex items-center gap-2">
                          <input type="checkbox" id="music-muted" checked={musicMuted} onChange={e => onMusicMuteChange(e.target.checked)} className="w-5 h-5" />
                          <label htmlFor="music-muted" className="font-bold">Mute Music</label>
                      </div>
                      <div className="flex items-center gap-2">
                          <input type="checkbox" id="sfx-muted" checked={sfxMuted} onChange={e => onSfxMuteChange(e.target.checked)} className="w-5 h-5" />
                          <label htmlFor="sfx-muted" className="font-bold">Mute SFX</label>
                      </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="music-volume" className="block text-sm font-bold">Music Volume: {Math.round(musicVolume * 100)}%</label>
                    <input
                        type="range"
                        id="music-volume"
                        min="0"
                        max="1"
                        step="0.01"
                        value={musicVolume}
                        onChange={e => onMusicVolumeChange(parseFloat(e.target.value))}
                        className="pixel-slider"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="sfx-volume" className="block text-sm font-bold">SFX Volume: {Math.round(sfxVolume * 100)}%</label>
                    <input
                        type="range"
                        id="sfx-volume"
                        min="0"
                        max="1"
                        step="0.01"
                        value={sfxVolume}
                        onChange={e => onSfxVolumeChange(parseFloat(e.target.value))}
                        className="pixel-slider"
                    />
                  </div>
              </div>
          </div>
          
          {/* Scenario Section */}
          <div className="p-4 border-2 border-black bg-black/20 space-y-3">
             <h3 className="text-3xl text-yellow-300">Scenario</h3>
              <select value={localScenario.type} onChange={(e) => handleScenarioTypeChange(e.target.value as ScenarioType)} className="pixel-select">
                {Object.values(ScenarioType).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              
              {(localScenario.type === ScenarioType.ROLE_PLAY || localScenario.type === ScenarioType.CUSTOM) && (
                <div>
                  <label className="block text-sm font-bold mb-1">Load Scenario Template (Optional)</label>
                  <select
                    value={localScenario.scenarioTemplateId || 'custom'}
                    onChange={(e) => handleLoadScenarioTemplate(e.target.value)}
                    className="pixel-select"
                  >
                    <option value="custom" disabled>-- Select a Template --</option>
                    {Object.keys(SCENARIO_PROMPT_TEMPLATES).map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold mb-1">Scenario Prompt</label>
                <p className="text-xs text-gray-400 mb-2">This prompt provides overall context to all agents for the entire discussion.</p>
                <textarea 
                  value={localScenario.prompt}
                  onChange={e => handleScenarioPromptChange(e.target.value)}
                  rows={4}
                  className="pixel-textarea"
                  placeholder={
                    localScenario.type === ScenarioType.ROLE_PLAY 
                      ? "e.g., A pirate, a ninja, and a robot walk into a bar..." 
                      : localScenario.type === ScenarioType.CUSTOM
                      ? "e.g., A debate about the ethics of AI, focus on long-term impact."
                      : ""
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                    type="checkbox"
                    id="movement-enabled"
                    checked={!!localScenario.movementEnabled}
                    onChange={e => setLocalScenario(s => ({...s, movementEnabled: e.target.checked}))}
                    className="w-5 h-5"
                />
                <label htmlFor="movement-enabled" className="font-bold">Enable AI-Controlled Movement</label>
              </div>
              <p className="text-xs text-gray-400">Allows AI agents to move on their own. Player movement (arrow keys) is always enabled. May increase token usage.</p>
          </div>
          
          {/* Agents Section */}
          <h3 className="text-3xl text-yellow-300 mt-4">Agents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {localAgents.map((agent) => (
              <div key={agent.id} className="p-4 border-2 border-black bg-black/20 space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="text-3xl text-yellow-300">{agent.name}</h3>
                  <button onClick={() => handleRemoveAgent(agent.id)} className="pixel-button !p-2 bg-red-700 hover:bg-red-600 text-sm">Remove</button>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="col-span-2">
                     <label className="block text-sm font-bold mb-1">Name</label>
                     <input type="text" value={agent.name} onChange={(e) => handleAgentChange(agent.id, 'name', e.target.value)} className="pixel-input"/>
                  </div>
                   <div className="col-span-2 flex items-center gap-4">
                       <div className="flex items-center gap-2">
                           <input type="checkbox" id={`useModel-${agent.id}`} checked={agent.useModelAsName} onChange={(e) => handleAgentChange(agent.id, 'useModelAsName', e.target.checked)} className="w-5 h-5"/>
                           <label htmlFor={`useModel-${agent.id}`}>Use model as name</label>
                       </div>
                       <div className="flex items-center gap-2">
                           <input type="checkbox" id={`isMod-${agent.id}`} checked={!!agent.isModerator} onChange={(e) => handleAgentChange(agent.id, 'isModerator', e.target.checked)} className="w-5 h-5"/>
                           <label htmlFor={`isMod-${agent.id}`}>Is Moderator</label>
                       </div>
                   </div>
                   <div className="col-span-2">
                       <label className="block text-sm font-bold mb-1">Persona</label>
                       <select 
                            value={agent.personaTemplateId && PERSONA_TEMPLATES[agent.personaTemplateId] ? agent.personaTemplateId : 'custom'}
                            onChange={(e) => handlePersonaTemplateChange(agent.id, e.target.value)}
                            className="pixel-select mb-2"
                        >
                            <option value="custom" disabled>-- Load Persona Template --</option>
                            {Object.keys(PERSONA_TEMPLATES).map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                       <textarea 
                            value={agent.persona}
                            onChange={(e) => handleAgentChange(agent.id, 'persona', e.target.value)}
                            rows={3}
                            className="pixel-textarea"
                       />
                   </div>
                   <div className="col-span-2 md:col-span-1">
                       <label className="block text-sm font-bold mb-1">AI Provider</label>
                       <select value={agent.llm.provider} onChange={(e) => handleLlmChange(agent.id, 'provider', e.target.value)} className="pixel-select">
                           {Object.values(LLMProvider).map(p => <option key={p} value={p}>{p}</option>)}
                       </select>
                   </div>
                   <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-bold mb-1">Model</label>
                      {agent.llm.provider === LLMProvider.GEMINI ? (
                        <select value={agent.llm.model} onChange={(e) => handleLlmChange(agent.id, 'model', e.target.value)} className="pixel-select">
                          {GEMINI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      ) : (
                        <div>
                          <input
                            type="text"
                            placeholder="Filter models..."
                            value={modelFilters[agent.id] || ''}
                            onChange={(e) => setModelFilters(prev => ({...prev, [agent.id]: e.target.value}))}
                            className="pixel-input mb-1"
                          />
                          {((agent.llm.provider === LLMProvider.OPENROUTER ? openRouterModels : openAIModels).length > 0) ? (
                            <select value={agent.llm.model} onChange={e => handleLlmChange(agent.id, 'model', e.target.value)} className="pixel-select" disabled={fetchingModelsFor === agent.id}>
                                {(agent.llm.provider === LLMProvider.OPENROUTER ? openRouterModels : openAIModels)
                                  .filter(m => m.toLowerCase().includes((modelFilters[agent.id] || '').toLowerCase()))
                                  .map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          ) : (
                            <input type="text" value={agent.llm.model} onChange={e => handleLlmChange(agent.id, 'model', e.target.value)} className="pixel-input" placeholder={fetchingModelsFor === agent.id ? "Fetching..." : "Test API key to load"}/>
                          )}
                        </div>
                      )}
                   </div>
                   {agent.llm.provider !== LLMProvider.GEMINI && (
                       <div className="col-span-2">
                           <label className="block text-sm font-bold mb-1">API Key ({agent.llm.provider})</label>
                           <div className="flex gap-2">
                               <input type="password" value={agent.llm.apiKey} onChange={e => handleLlmChange(agent.id, 'apiKey', e.target.value)} className="pixel-input"/>
                               <button onClick={() => handleTestApiKey(agent)} className="pixel-button !p-2" disabled={!agent.llm.apiKey || testResults[agent.id]?.status === 'testing'}>Test</button>
                           </div>
                           {testResults[agent.id] && <p className={`text-sm mt-1 ${testResults[agent.id].status === 'success' ? 'text-green-400' : 'text-red-400'}`}>{testResults[agent.id].message}</p>}
                       </div>
                   )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleAddAgent} className="pixel-button bg-blue-600 w-full mt-2">Add New Agent</button>
        </div>
        
        <div className="p-4 border-t-2 border-black mt-auto flex gap-4">
          <button onClick={onClose} className="pixel-button bg-gray-600 w-1/3 text-xl">Cancel</button>
          <button onClick={handleSave} className="pixel-button bg-green-700 w-2/3 text-xl">Save & Close</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;