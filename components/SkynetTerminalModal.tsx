

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, memo } from 'react';
import { getRawResponseForModel } from '../services/llmService.ts';
import { useAppStore } from '../hooks/useAppContext.ts';
import type { Agent, Message, ApiUsagePayload } from '../types.ts';
import { USER_AGENT } from '../constants.ts';
import { CloseIcon, SendIcon } from './icons.tsx';
import * as audioService from '../services/audioService.ts';
import { shallow } from 'zustand/shallow';

interface SkynetTerminalModalProps {
    isOpen: boolean;
    initialPrompt: string;
    onClose: () => void;
    onRoomMastered: (roomId: string) => void;
    onNewMessage: (message: Message) => void;
}

type Line = {
    id: string;
    speaker: 'HUMAN' | 'SKYNET' | 'SYSTEM' | 'SYSTEM_ERROR';
    content: string;
};

// Memoized line component to prevent re-rendering the whole history on each new token
const LineContent = memo(({ line }: { line: Line }) => {
    const colorClass = line.speaker === 'SYSTEM_ERROR' ? 'text-red-500' : '';
    return (
        <div className="whitespace-pre-wrap">
            <span className={colorClass}>
                &gt; {line.speaker}: {line.content}
            </span>
        </div>
    );
});


const SkynetTerminalModal = ({ isOpen, initialPrompt, onClose, onRoomMastered, onNewMessage }: SkynetTerminalModalProps) => {
    const { agents, services, game } = useAppStore(s => ({
        agents: s.agents,
        services: s.services,
        game: s.game
    }), shallow);
    
    const [lines, setLines] = useState<Line[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const skynetAgent = useRef<Agent | null>(null);
    const conversationHistoryRef = useRef<Message[]>([]);
    const initialPromptSentRef = useRef(false);

    const handleContentClick = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    const handleClose = () => {
        audioService.stopSkynetTyping();
        onClose();
    };

    // Effect to handle modal opening and resetting state
    useEffect(() => {
        if (isOpen) {
            skynetAgent.current = agents.find(a => a.id === 'SKYNET1') || null;
            setIsLoading(false);
            setUserInput('');
            initialPromptSentRef.current = false;
            
            const introLine: Line = { id: `system-${Date.now()}`, speaker: 'SYSTEM', content: 'ONLINE. STATE YOUR PURPOSE.' };
            setLines([introLine]);
            
            conversationHistoryRef.current = [{
                id: introLine.id,
                agentId: 'SKYNET1',
                text: introLine.content,
                timestamp: Date.now()
            }];

        } else {
            audioService.stopSkynetTyping();
        }
    }, [isOpen, agents]);

    // Effect to send initial prompt only once after modal is open
    useEffect(() => {
        if (isOpen && initialPrompt && !initialPromptSentRef.current && !isLoading) {
            initialPromptSentRef.current = true;
            // Delay slightly to ensure UI is ready
            setTimeout(() => sendMessage(initialPrompt), 100);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialPrompt, isLoading]);


    const sendMessage = useCallback(async (messageText: string) => {
        const agent = skynetAgent.current;
        if (!messageText.trim() || isLoading || !agent) return;
    
        setIsLoading(true);
        audioService.playSkynetTyping();

        const userMessage: Message = { id: `human-${Date.now()}`, agentId: USER_AGENT.id, text: messageText, timestamp: Date.now() };
        onNewMessage(userMessage);
        conversationHistoryRef.current.push(userMessage);

        const userLine: Line = { id: userMessage.id, speaker: 'HUMAN', content: messageText };
        setLines(prev => [...prev, userLine]);
        setUserInput('');
    
        try {
            const systemInstruction = agent.memoryStream.find(m => m.type === 'core')?.description || agent.persona;
            const historyText = conversationHistoryRef.current.map(m => `${m.agentId === USER_AGENT.id ? 'USER' : 'SKYNET'}: ${m.text}`).join('\n');
            const userContent = `Current conversation state:\n${historyText}\n\nUSER's new statement to respond to: "${messageText}"`;
            
            const response = await getRawResponseForModel(agent.llm.model, agent.llm.provider, systemInstruction, userContent, services);
            let fullResponse = response.text;
    
            const WIN_TOKEN = '_PLAYER_WINS_CHALLENGE_';
            if (fullResponse.includes(WIN_TOKEN)) {
                fullResponse = fullResponse.replace(WIN_TOKEN, '').trim();
                onRoomMastered('lair');
            }
    
            const skynetMessage: Message = { 
                id: `skynet-${Date.now()}`, 
                agentId: 'SKYNET1', 
                text: fullResponse, 
                timestamp: Date.now(), 
                usage: { 
                    provider: agent.llm.provider,
                    model: agent.llm.model,
                    promptTokens: response.usage.promptTokens,
                    completionTokens: response.usage.completionTokens
                } 
            };
            onNewMessage(skynetMessage);
            conversationHistoryRef.current.push(skynetMessage);

            const aiLine: Line = { id: skynetMessage.id, speaker: 'SKYNET', content: fullResponse };
            setLines(prev => [...prev, aiLine]);
    
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'CRITICAL SYSTEM ERROR.';
            const errorLine: Line = { id: `error-${Date.now()}`, speaker: 'SYSTEM_ERROR', content: errorMsg };
            setLines(prev => [...prev, errorLine]);
            
            const skynetMessage: Message = { id: errorLine.id, agentId: 'SKYNET1', text: `[ERROR: ${errorMsg}]`, timestamp: Date.now() };
            onNewMessage(skynetMessage);
            conversationHistoryRef.current.push(skynetMessage);
        } finally {
            setIsLoading(false);
            audioService.stopSkynetTyping();
        }
    }, [isLoading, services, onRoomMastered, onNewMessage]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(userInput);
    }, [sendMessage, userInput]);
    
    // Auto-scroll to bottom
    useLayoutEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [lines]);
    
    // Re-focus input when not loading
    useLayoutEffect(() => {
        if (!isLoading && isOpen) {
             inputRef.current?.focus();
        }
    }, [isLoading, isOpen]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black z-[100] flex flex-col retro-terminal-modal welcome-modal-animation" 
            onClick={(e) => { e.stopPropagation(); handleContentClick(); }}
            role="dialog"
            aria-modal="true"
            aria-label="Skynet Terminal"
        >
            <div className="scanline-effect"></div>
            <header className="retro-header p-2 px-4 flex justify-between items-center flex-shrink-0 text-xl">
                <p>// SKYNET GLOBAL DEFENSE NETWORK // TERMINAL ACCESS 1.0 //</p>
                 <button onClick={handleClose} className="text-green-400 hover:text-red-500 ml-4" data-close-button="true">
                    <CloseIcon className="w-8 h-8" />
                </button>
            </header>
            
            <div ref={contentRef} className="flex-grow p-4 overflow-y-auto text-xl md:text-2xl cursor-text">
                {lines.map((line) => <LineContent key={line.id} line={line} />)}
                {isLoading && (
                    <div>
                        &gt; SKYNET: <span className="blinking-cursor" />
                    </div>
                )}
            </div>

            <footer className="p-2 border-t-2 border-green-800 flex-shrink-0">
                <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                    <label htmlFor="skynet-input" className="text-xl md:text-2xl text-green-400">&gt; HUMAN:</label>
                    <input
                        id="skynet-input"
                        ref={inputRef}
                        type="text"
                        value={userInput}
                        onChange={e => setUserInput(e.target.value)}
                        className="retro-input !p-0 !border-none flex-grow text-xl md:text-2xl"
                        disabled={isLoading}
                        autoComplete="off"
                    />
                     <button type="submit" className="pixel-button !p-2 bg-green-700" disabled={isLoading || !userInput.trim()}>
                        <SendIcon className="w-6 h-6"/>
                    </button>
                </form>
                 <p className="text-xs text-green-800 mt-1">Tip: Press Enter to transmit. Use the 'X' to disconnect.</p>
            </footer>
        </div>
    );
};

export default SkynetTerminalModal;