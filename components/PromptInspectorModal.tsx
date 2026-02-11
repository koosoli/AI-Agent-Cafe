import React, { useState, useEffect, useMemo } from 'react';
import type { Agent, PromptData, Memory, MemoryType } from '../types.ts';
import { CloseIcon, CopyIcon, SendIcon, ArrowDownIcon, ArrowUpIcon } from './icons.tsx';

interface PromptInspectorModalProps {
  isOpen: boolean;
  agent: Agent;
  promptHistory: PromptData[];
  startIndex: number;
  onClose: () => void;
  onTestPrompt: (agentId: string, system: string, user: string, memories?: Memory[]) => Promise<{ text: string; usage: { promptTokens: number; completionTokens: number; } }>;
  onExplainPrompt: (system: string, user: string) => Promise<string>;
}

const PromptInspectorModal = ({ isOpen, agent, promptHistory, startIndex, onClose, onTestPrompt, onExplainPrompt }: PromptInspectorModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [copiedSection, setCopiedSection] = useState<'system' | 'user' | null>(null);
  
  const [editedSystemPrompt, setEditedSystemPrompt] = useState('');
  const [editedUserPrompt, setEditedUserPrompt] = useState('');
  const [testResult, setTestResult] = useState<{ output: string; usage?: { promptTokens: number, completionTokens: number } } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);


  const currentPrompt = useMemo(() => promptHistory[currentIndex], [promptHistory, currentIndex]);

  const groupedMemories = useMemo(() => {
    if (!currentPrompt?.retrievedMemories) return {};
    return currentPrompt.retrievedMemories.reduce((acc, mem) => {
        if (!acc[mem.type]) {
            acc[mem.type] = [];
        }
        acc[mem.type].push(mem);
        return acc;
    }, {} as Record<string, Memory[]>);
  }, [currentPrompt]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(startIndex);
    }
  }, [isOpen, startIndex]);

  useEffect(() => {
    if (currentPrompt) {
      setEditedSystemPrompt(currentPrompt.system);
      setEditedUserPrompt(currentPrompt.user);
      setTestResult(null); // Clear previous test results when navigating
      setExplanation(null);
    }
  }, [currentPrompt]);

  if (!isOpen || !agent || !currentPrompt) return null;

  const handleCopy = (text: string, section: 'system' | 'user') => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };
  
  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setExplanation(null);
    try {
      const { text, usage } = await onTestPrompt(agent.id, editedSystemPrompt, editedUserPrompt, currentPrompt.retrievedMemories);
      setTestResult({ output: text, usage });
    } catch(e) {
       const errorText = e instanceof Error ? e.message : "An unknown error occurred.";
       setTestResult({ output: `[API Error: ${errorText}]` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleExplain = async () => {
    setIsExplaining(true);
    setExplanation(null);
    setTestResult(null);
    const result = await onExplainPrompt(editedSystemPrompt, editedUserPrompt);
    setExplanation(result);
    setIsExplaining(false);
  };

  const getMemoryTypeHeader = (type: string) => {
    switch(type) {
        case 'core': return 'Core Memory';
        case 'semantic': return 'Semantic Memory (Insights)';
        case 'episodic': return 'Episodic Memory (Events)';
        case 'procedural': return 'Procedural Memory (Skills)';
        default: return 'Memory';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div
        className="pixel-modal w-full max-w-7xl h-[95vh] flex flex-col welcome-modal-animation"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-inspector-heading"
      >
        <header className="pixel-header flex justify-between items-center p-4">
          <h2 id="prompt-inspector-heading" className="text-3xl md:text-4xl">Prompt Inspector: {agent.name}</h2>
          <button onClick={onClose} className="text-white hover:text-red-500 ml-4" data-close-button="true"><CloseIcon className="w-8 h-8" /></button>
        </header>

        <main className="p-4 md:p-6 overflow-y-auto space-y-4 flex-grow flex flex-col min-h-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-lg text-gray-300">Viewing prompt {currentIndex + 1} of {promptHistory.length} for this agent.</p>
            {currentPrompt.usage && (
                <div className="flex items-center gap-4 bg-gray-800/50 text-sm text-gray-300 px-3 py-1 rounded-full" title="Token Usage">
                    <div className="flex items-center gap-1">
                        <ArrowDownIcon className="w-4 h-4 text-blue-400"/>
                        <span>Prompt: {currentPrompt.usage.promptTokens}</span>
                    </div>
                    <div className="border-l border-gray-600 h-4"></div>
                     <div className="flex items-center gap-1">
                        <ArrowUpIcon className="w-4 h-4 text-green-400"/>
                        <span>Completion: {currentPrompt.usage.completionTokens}</span>
                    </div>
                </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setCurrentIndex(p => p - 1)} disabled={currentIndex <= 0} className="pixel-button">Prev</button>
              <button onClick={() => setCurrentIndex(p => p + 1)} disabled={currentIndex >= promptHistory.length - 1} className="pixel-button">Next</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow min-h-0">
            {/* System Prompt Pane */}
            <div className="bg-black/20 p-4 border-2 border-black relative group flex flex-col min-h-0">
              <h3 className="text-xl text-yellow-300 font-bold mb-1 flex-shrink-0">System Prompt (Editable)</h3>
              <p className="text-xs text-gray-400 mb-2 flex-shrink-0">This is the "brain" of the agent. It's a detailed set of instructions, rules, and context sent to the AI on every turn to guide its behavior.</p>
              <textarea
                value={editedSystemPrompt}
                onChange={e => setEditedSystemPrompt(e.target.value)}
                className="pixel-textarea text-base flex-grow w-full resize-none"
              />
              <button 
                onClick={() => handleCopy(editedSystemPrompt, 'system')} 
                className="absolute top-2 right-2 p-1 bg-gray-700/80 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Copy System Prompt"
              >
                {copiedSection === 'system' ? 
                  <span className="text-sm px-1">Copied!</span> : 
                  <CopyIcon className="w-5 h-5 text-white"/>
                }
              </button>
            </div>

            {/* User Prompt & Memories Pane */}
            <div className="flex flex-col gap-4 min-h-0 lg:col-span-2">
                <div className="bg-black/20 p-4 border-2 border-black relative group flex flex-col">
                    <h3 className="text-xl text-yellow-300 font-bold mb-1 flex-shrink-0">User Prompt (Editable)</h3>
                    <p className="text-xs text-gray-400 mb-2 flex-shrink-0">This is what the agent perceives for the current turn, including your message and the recent conversation history.</p>
                    <textarea
                        value={editedUserPrompt}
                        onChange={e => setEditedUserPrompt(e.target.value)}
                        className="pixel-textarea text-base w-full resize-none"
                        rows={5}
                    />
                </div>

                <div className="bg-black/20 p-4 border-2 border-black relative group flex flex-col flex-grow min-h-0">
                    <h3 className="text-xl text-yellow-300 font-bold mb-1 flex-shrink-0">Retrieved Memories</h3>
                    <p className="text-xs text-gray-400 mb-2 flex-shrink-0">These are the most salient long-term memories the agent recalled to inform its response, selected based on relevance, importance, and recency.</p>
                    <div className="overflow-y-auto space-y-3">
                        {Object.keys(groupedMemories).length > 0 ? (
                            Object.entries(groupedMemories).map(([type, memories]) => (
                                <div key={type}>
                                    <h4 className="text-lg text-teal-300 font-semibold">{getMemoryTypeHeader(type)}</h4>
                                    <ul className="list-disc list-inside pl-2 text-sm text-gray-300">
                                        {memories.map(mem => (
                                            <li key={mem.id} className="mt-1" title={`Importance: ${mem.importance}`}>
                                                {mem.description}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400">No memories were retrieved for this turn.</p>
                        )}
                    </div>
                </div>
            </div>
          </div>

          {(isTesting || isExplaining) && (
            <div className="text-center p-4 flex-shrink-0">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
              <p className="mt-2 text-yellow-300">{isTesting ? 'Awaiting test response...' : 'Generating explanation...'}</p>
            </div>
          )}

          {testResult && (
             <div className="bg-green-900/30 p-4 border-2 border-green-700 flex-shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl text-green-300 font-bold">Test Result</h3>
                    {testResult.usage && (
                        <div className="flex items-center gap-2 bg-gray-800/50 text-xs text-gray-300 px-2 py-1 rounded-full">
                            <ArrowDownIcon className="w-3 h-3 text-blue-400" /><span>{testResult.usage.promptTokens}</span>
                            <div className="border-l border-gray-600 h-3"></div>
                            <ArrowUpIcon className="w-3 h-3 text-green-400" /><span>{testResult.usage.completionTokens}</span>
                        </div>
                    )}
                </div>
                <p className="text-base whitespace-pre-wrap">{testResult.output}</p>
             </div>
          )}
           {explanation && (
             <div className="bg-blue-900/30 p-4 border-2 border-blue-700 flex-shrink-0">
                <h3 className="text-xl text-blue-300 font-bold mb-2">Prompt Explanation</h3>
                <p className="text-base whitespace-pre-wrap">{explanation}</p>
             </div>
          )}

        </main>

        <footer className="p-4 border-t-2 border-black mt-auto flex justify-between items-center gap-4">
          <button onClick={onClose} className="pixel-button bg-gray-600 text-lg md:text-xl">Close</button>
          <div className="flex gap-4">
            <button onClick={handleExplain} disabled={isTesting || isExplaining} className="pixel-button bg-blue-600 text-lg md:text-xl flex items-center gap-2">
                Explain
            </button>
            <button onClick={handleTest} disabled={isTesting || isExplaining} className="pixel-button bg-green-700 text-lg md:text-xl flex items-center gap-2">
                <SendIcon className="w-6 h-6" /> Test Prompts
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PromptInspectorModal;