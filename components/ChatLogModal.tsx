
import React, { useState } from 'react';
import type { Agent, Message } from '../types';
import { CloseIcon, CopyIcon, ExportIcon } from './icons';
import { USER_AGENT } from '../constants';

interface ChatLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  messages: Message[];
}

const ChatLogModal = ({ isOpen, onClose, agents, messages }: ChatLogModalProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const getAgentById = (agentId: string) => {
    return agents.find(a => a.id === agentId);
  };

  const getSpriteUrl = (agentId: string, spriteSeed: string) => {
      return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${spriteSeed}`;
  }
  
  const handleCopy = (message: Message) => {
      navigator.clipboard.writeText(message.text);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 2000);
  };
  
  const handleExport = () => {
    const content = messages.map(msg => {
        const agent = getAgentById(msg.agentId);
        const name = agent ? agent.name : 'User';
        const timestamp = new Date(msg.timestamp).toLocaleString();
        return `[${timestamp}] ${name}:\n${msg.text}`;
    }).join('\n\n---\n\n');
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-cafe-log-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="pixel-modal w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="pixel-header flex justify-between items-center p-4">
          <h2 className="text-4xl">Conversation Log</h2>
          <button onClick={onClose} className="text-white hover:text-red-500">
            <CloseIcon className="w-8 h-8" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-grow">
          {messages.length === 0 && (
              <p className="text-center text-gray-400 text-2xl">The conversation hasn't started yet.</p>
          )}
          {messages.map(message => {
            const agent = getAgentById(message.agentId);
            const isUser = message.agentId === USER_AGENT.id;
            const name = isUser ? USER_AGENT.name : (agent?.name || message.agentId);
            const spriteSeed = isUser ? USER_AGENT.spriteSeed : (agent?.spriteSeed || 'default');

            return (
              <div key={message.id} className="flex items-start gap-4">
                <div className="w-16 h-16 flex-shrink-0 bg-black/20 rounded-full p-1 border-2 border-black flex items-center justify-center">
                  <img 
                    src={getSpriteUrl(message.agentId, spriteSeed)} 
                    alt={name}
                    className="w-12 h-12 object-contain" 
                  />
                </div>
                <div className="flex-grow">
                  <p className="font-bold text-2xl text-yellow-300">
                    {name}
                    {message.isConclusion && <span className="text-green-400 ml-2">(Conclusion)</span>}
                  </p>
                  <div className="mt-1 bg-black/20 p-3 border-2 border-black relative group">
                    <p className="text-xl whitespace-pre-wrap break-words">{message.text}</p>
                    <button 
                        onClick={() => handleCopy(message)} 
                        className="absolute top-2 right-2 p-1 bg-gray-700/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Copy message"
                    >
                      {copiedId === message.id ? 
                        <span className="text-sm px-1">Copied!</span> : 
                        <CopyIcon className="w-5 h-5 text-white"/>
                      }
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t-2 border-black mt-auto flex gap-4">
          <button onClick={handleExport} disabled={messages.length === 0} className="pixel-button bg-gray-600 w-1/2 text-xl flex items-center justify-center gap-2">
            <ExportIcon className="w-6 h-6"/> Export Log
          </button>
          <button onClick={onClose} className="pixel-button bg-blue-600 w-1/2 text-xl">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatLogModal;