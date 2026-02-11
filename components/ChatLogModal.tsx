import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import type { Agent, Message, PromptData, UsageStats } from '../types.ts';
import { CloseIcon, CopyIcon, ExportIcon, TrashIcon, InspectIcon, ArrowDownIcon, ArrowUpIcon } from './icons.tsx';
import { USER_AGENT } from '../constants.ts';
import { useAppStore } from '../hooks/useAppContext.ts';
import AgentSprite from './AgentSprite.tsx';
import { shallow } from 'zustand/shallow';

interface ChatLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInspect: (agent: Agent, history: PromptData[], startIndex: number) => void;
}

const UsageStatsDisplay = ({ stats }: { stats: UsageStats }) => {
    const llmEntries = Object.entries(stats.llm || {});
    const imageEntries = Object.entries(stats.image || {});
    const ttsEntries = Object.entries(stats.tts || {});

    if (llmEntries.length === 0 && imageEntries.length === 0 && ttsEntries.length === 0) {
        return <p className="text-gray-400">No API usage recorded for this session yet.</p>;
    }

    return (
        <div className="space-y-4 text-sm">
            {llmEntries.length > 0 && (
                <div>
                    <h4 className="text-lg text-yellow-300 font-bold mb-1">Language Model Usage</h4>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/30">
                                <th className="p-2 border border-gray-700">Model</th>
                                <th className="p-2 border border-gray-700 text-center">Requests</th>
                                <th className="p-2 border border-gray-700 text-center">Prompt Tokens</th>
                                <th className="p-2 border border-gray-700 text-center">Completion Tokens</th>
                                <th className="p-2 border border-gray-700 text-center">Total Tokens</th>
                            </tr>
                        </thead>
                        <tbody>
                            {llmEntries.map(([key, data]) => (
                                <tr key={key} className="border-t border-gray-700">
                                    <td className="p-2 border border-gray-700 font-mono">{key}</td>
                                    <td className="p-2 border border-gray-700 text-center">{data.requests.toLocaleString()}</td>
                                    <td className="p-2 border border-gray-700 text-center">{data.prompt.toLocaleString()}</td>
                                    <td className="p-2 border border-gray-700 text-center">{data.completion.toLocaleString()}</td>
                                    <td className="p-2 border border-gray-700 text-center">{(data.prompt + data.completion).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
             {imageEntries.length > 0 && (
                <div>
                    <h4 className="text-lg text-yellow-300 font-bold mb-1">Image Generation Usage</h4>
                     <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/30">
                                <th className="p-2 border border-gray-700">Model</th>
                                <th className="p-2 border border-gray-700 text-center">Images Generated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {imageEntries.map(([key, data]) => (
                                <tr key={key} className="border-t border-gray-700">
                                    <td className="p-2 border border-gray-700 font-mono">{key}</td>
                                    <td className="p-2 border border-gray-700 text-center">{data.count.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {ttsEntries.length > 0 && (
                <div>
                    <h4 className="text-lg text-yellow-300 font-bold mb-1">Text-to-Speech Usage</h4>
                     <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/30">
                                <th className="p-2 border border-gray-700">Provider</th>
                                <th className="p-2 border border-gray-700 text-center">Requests</th>
                                <th className="p-2 border border-gray-700 text-center">Characters</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ttsEntries.map(([key, data]) => (
                                <tr key={key} className="border-t border-gray-700">
                                    <td className="p-2 border border-gray-700 font-mono">{key}</td>
                                    <td className="p-2 border border-gray-700 text-center">{data.requests.toLocaleString()}</td>
                                    <td className="p-2 border border-gray-700 text-center">{data.characters.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const ChatLogModal = ({ isOpen, onClose, onInspect }: ChatLogModalProps) => {
    const { agents, messages, game } = useAppStore(s => ({ agents: s.agents, messages: s.messages, game: s.game }), shallow);
    const { setMessages } = useAppStore.getState();
    const [activeTab, setActiveTab] = useState('Chat');

    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && activeTab === 'Chat' && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [isOpen, activeTab, messages]);

    const handleClearLog = () => {
        if (window.confirm('Are you sure you want to clear the entire chat log? This cannot be undone.')) {
            setMessages([]);
        }
    };

    const handleExportLog = () => {
        const logText = messages.map(msg => {
            const speaker = agents.find(a => a.id === msg.agentId)?.name || 'You';
            return `[${new Date(msg.timestamp).toLocaleString()}] ${speaker}: ${msg.text}`;
        }).join('\n');
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ai-cafe-chat-log.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopyLog = () => {
        const logText = messages.map(msg => {
            const speaker = agents.find(a => a.id === msg.agentId)?.name || 'You';
            return `[${new Date(msg.timestamp).toLocaleString()}] ${speaker}: ${msg.text}`;
        }).join('\n');
        navigator.clipboard.writeText(logText);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
            <div
              className="pixel-modal w-full max-w-4xl max-h-[90vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="log-heading"
            >
                <header className="pixel-header flex justify-between items-center p-4">
                    <h2 id="log-heading" className="text-3xl md:text-4xl">Session Log</h2>
                    <button onClick={onClose} className="text-white hover:text-red-500 ml-4" data-close-button="true"><CloseIcon className="w-8 h-8" /></button>
                </header>

                <div className="p-4 border-b-2 border-black flex gap-2">
                    <button onClick={() => setActiveTab('Chat')} className={`pixel-button ${activeTab === 'Chat' ? 'bg-yellow-600' : 'bg-gray-600'}`}>Chat Log</button>
                    <button onClick={() => setActiveTab('Usage')} className={`pixel-button ${activeTab === 'Usage' ? 'bg-yellow-600' : 'bg-gray-600'}`}>API Usage</button>
                </div>

                <main className="p-4 md:p-6 overflow-y-auto flex-grow">
                    {activeTab === 'Chat' ? (
                        <div ref={logContainerRef} className="h-full">
                            {messages.map((msg, index) => {
                                const agent = agents.find(a => a.id === msg.agentId);
                                if (!agent) return null;
                                const isUser = agent.id === USER_AGENT.id;
                                const agentPromptHistory = game.agentPromptHistory[agent.id] || [];
                                const promptDataIndex = agentPromptHistory.findIndex(p => p.messageId === msg.id);

                                return (
                                    <div key={msg.id} className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`}>
                                        {!isUser && (
                                            <div className="w-12 h-12 flex-shrink-0">
                                                <AgentSprite spriteSeed={agent.spriteSeed} name={agent.name} />
                                            </div>
                                        )}
                                        <div className={`p-3 rounded-lg max-w-xl ${isUser ? 'bg-blue-900/50' : 'bg-gray-800/50'}`}>
                                            <p className="font-bold">{agent.name}</p>
                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                            {!isUser && promptDataIndex > -1 && (
                                                <button
                                                    onClick={() => onInspect(agent, agentPromptHistory, promptDataIndex)}
                                                    className="mt-2 flex items-center gap-1 text-xs text-teal-300 hover:text-teal-100"
                                                    title="Inspect the prompt and memories used to generate this response"
                                                >
                                                    <InspectIcon className="w-4 h-4" /> Inspect Prompt
                                                </button>
                                            )}
                                        </div>
                                        {isUser && (
                                            <div className="w-12 h-12 flex-shrink-0">
                                                <AgentSprite spriteSeed={agent.spriteSeed} name={agent.name} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <UsageStatsDisplay stats={game.usageStats} />
                    )}
                </main>

                <footer className="p-4 border-t-2 border-black mt-auto flex justify-between items-center">
                    {activeTab === 'Chat' && (
                        <div className="flex gap-2">
                            <button onClick={handleCopyLog} className="pixel-button bg-gray-600 flex items-center gap-2"><CopyIcon className="w-5 h-5"/> Copy</button>
                            <button onClick={handleExportLog} className="pixel-button bg-gray-600 flex items-center gap-2"><ExportIcon className="w-5 h-5"/> Export</button>
                            <button onClick={handleClearLog} className="pixel-button bg-red-700 flex items-center gap-2"><TrashIcon className="w-5 h-5"/> Clear</button>
                        </div>
                    )}
                    <div className="flex-grow"></div>
                    <button onClick={onClose} className="pixel-button bg-blue-600 text-lg md:text-xl">Close</button>
                </footer>
            </div>
        </div>
    );
};

export default memo(ChatLogModal);