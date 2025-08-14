import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, memo } from 'react';
import { useAppStore } from '../hooks/useAppContext.ts';
import { getRawResponseForModel } from '../services/llmService.ts';
import type { Agent, Message, PlayerCharacter, LogEntry, LLMResponse, ApiUsagePayload } from '../types.ts';
import { LLMProvider, MemoryType } from '../types.ts';
import { CloseIcon, SendIcon } from './icons.tsx';
import { USER_AGENT } from '../constants.ts';
import AgentSprite from './AgentSprite.tsx';
import { DIFFICULTY_SETTINGS } from '../data/gameConfig.ts';
import { shallow } from 'zustand/shallow';

interface GameBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomMastered: (roomId: string) => void;
}

const MemoizedLogEntry = memo(({ entry }: { entry: LogEntry }) => {
    const getSpeakerClass = (speaker: LogEntry['speaker']) => {
        switch (speaker) {
            case 'DM': return 'font-bold text-purple-800';
            case 'Player': return 'font-bold text-blue-800';
            case 'Knight': return 'font-bold text-gray-600';
            case 'Rogue': return 'font-bold text-red-800';
            case 'SYSTEM': return 'text-center font-bold text-yellow-700 italic';
            default: return '';
        }
    };
    return (
        <div className="mb-4 pb-4 border-b border-dashed border-black/20 text-lg">
            <p className={getSpeakerClass(entry.speaker)}>{entry.speakerName}</p>
            <p className="whitespace-pre-wrap pl-4">{entry.content}</p>
        </div>
    );
});

export const GameBoardModal = ({ isOpen, onClose, onRoomMastered }: GameBoardModalProps) => {
    const { agents, services, game } = useAppStore(s => ({
        agents: s.agents,
        services: s.services,
        game: s.game,
    }), shallow);
    const { setGameState, logApiUsage } = useAppStore.getState();
    const { dungeonChallengeState } = game;
    
    const [character, setCharacter] = useState<PlayerCharacter>({ name: '', class: '', trait: '' });
    
    const party = useRef<{ dm: Agent | null; knight: Agent | null; rogue: Agent | null }>({ dm: null, knight: null, rogue: null });
    const contentRef = useRef<HTMLDivElement>(null);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const turnOrder: Array<'Player' | 'Knight' | 'Rogue' | 'DM'> = ['Player', 'Knight', 'Rogue', 'DM'];
    const stateRef = useRef(useAppStore.getState());
    useEffect(() => {
        const unsubscribe = useAppStore.subscribe(newState => {
            stateRef.current = newState;
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (isOpen) {
            party.current = {
                dm: agents.find(a => a.id === 'DM1') || null,
                knight: agents.find(a => a.id === 'KNIGHT1') || null,
                rogue: agents.find(a => a.id === 'ROGUE1') || null,
            };
            // This logic was moved to App.tsx to prevent an infinite re-render loop
            // when the modal opens and the state is already 'initial'.
        }
    }, [isOpen, agents]);
    
    useLayoutEffect(() => {
        if(contentRef.current) contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }, [dungeonChallengeState?.log]);

    const runAITurn = useCallback(async (speaker: 'DM' | 'Knight' | 'Rogue', prompt: string): Promise<LLMResponse> => {
        const agent = speaker === 'DM' ? party.current.dm : (speaker === 'Knight' ? party.current.knight : party.current.rogue);
        if (!agent) throw new Error("Agent not found for turn");
        
        const { dungeonChallengeState: dcs, difficulty } = stateRef.current.game;
        const logHistory = dcs?.log.map(l => `${l.speakerName}: ${l.content}`).join('\n') || '';
        
        const coreMemory = agent.memoryStream.find(m => m.type === MemoryType.CORE)?.description || agent.persona;
        let systemInstruction = `You are acting as your character in a D&D game. The game difficulty is set to **${difficulty}**. Your character is: ${coreMemory}. Previous log:\n${logHistory}`;
        
        if (speaker !== 'DM') {
            systemInstruction += "\n\n**IMPORTANT RULE:** Your response MUST be very concise (1-2 sentences) and in the first-person. Do NOT narrate like a DM.";
        }

        try {
            const response = await getRawResponseForModel(agent.llm.model, agent.llm.provider, systemInstruction, prompt, services);
            
            const usagePayload: ApiUsagePayload = {
                type: 'llm',
                provider: agent.llm.provider,
                model: agent.llm.model,
                ...response.usage
            };
            logApiUsage(usagePayload);

            return response;
        } catch(e) {
            console.error(`Error during ${speaker}'s turn:`, e);
            const errorText = e instanceof Error ? e.message : 'A mysterious force interrupts my thoughts...';
            return { text: errorText, usage: { promptTokens: 0, completionTokens: 0 }};
        }
    }, [services, logApiUsage]);

    const handleCharacterCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const { dungeonChallengeState: dcs } = stateRef.current.game;
        if (!character.name || !character.class || !character.trait || !dcs) return;
        
        const systemLog: LogEntry = { id: `sys-${Date.now()}`, speaker: 'SYSTEM', content: `Character created: ${character.name} the ${character.trait} ${character.class}.`, speakerName: 'SYSTEM' };
        
        setGameState({
            dungeonChallengeState: {
                ...dcs,
                status: 'in_progress',
                playerCharacter: character,
                log: [systemLog],
                turn: 'DM',
            }
        });
    };
    
    const handlePlayerAction = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const { dungeonChallengeState: dcs } = stateRef.current.game;
        if (!userInput.trim() || !dcs || dcs.turn !== 'Player' || !dcs.playerCharacter) return;

        const playerAction = userInput;
        setUserInput('');

        const playerEntry: LogEntry = { id: `player-${Date.now()}`, speaker: 'Player', content: playerAction, speakerName: dcs.playerCharacter.name };
        
        const currentIndex = turnOrder.indexOf(dcs.turn);
        const nextTurn = turnOrder[(currentIndex + 1) % turnOrder.length];
        const newLog = [...dcs.log, playerEntry];
        
        setGameState({
            dungeonChallengeState: {
                ...dcs,
                log: newLog,
                turn: nextTurn
            }
        });

    }, [userInput, turnOrder, setGameState]);

    useEffect(() => {
        const dcs = stateRef.current.game.dungeonChallengeState;
        if (!isOpen || dcs?.status !== 'in_progress') return;
        
        const { turn } = dcs;

        const takeAITurn = async () => {
            const { dungeonChallengeState: currentDcs, difficulty } = stateRef.current.game;
            if (!currentDcs || currentDcs.turn === 'Player') return;

            setIsLoading(true);
            const speaker = currentDcs.turn;
            const agent = speaker === 'DM' ? party.current.dm : (speaker === 'Knight' ? party.current.knight : party.current.rogue);

            let prompt = '';
            const playerTurnCount = currentDcs.log.filter(l => l.speaker === 'Player').length;
            const turnsToEvaluate = DIFFICULTY_SETTINGS[difficulty].dndTurnsToEvaluate;

            if (speaker === 'DM') {
                if (currentDcs.log.length <= 1) { // Opening scene
                    if (currentDcs.playerCharacter) {
                        prompt = `You are the Dungeon Master. The difficulty is set to **${difficulty}**. A new adventurer, ${currentDcs.playerCharacter.name} the ${currentDcs.playerCharacter.trait} ${currentDcs.playerCharacter.class}, has joined the party with Sir Kaelan the Knight and Vexia the Rogue. Narrate the opening scene of their adventure. Start them off in a classic setting, like a tavern or at the mouth of a cave, and present them with a simple, immediate situation to react to. End by prompting the Player to act.`;
                    } else {
                         prompt = "You are the Dungeon Master. Something went wrong and the player character details are missing. Apologize and ask the player to restart the game by closing and reopening the game board.";
                    }
                } else if (playerTurnCount >= turnsToEvaluate) {
                    const evalResponse = await runAITurn('DM', `As the DM, evaluate the player's actions based on the log and the **${difficulty}** difficulty setting. Have they been creative and in-character? Respond with ONLY the word "WIN" or "CONTINUE".`);
                    if(evalResponse.text.trim().toUpperCase() === 'WIN') {
                        prompt = "The player has demonstrated excellent role-playing. Narrate a triumphant moment for them, concluding the current scene and congratulating them on mastering the challenge. Include the secret phrase _PLAYER_WINS_CHALLENGE_ in your response.";
                    } else {
                        prompt = "Narrate the consequences of the party's recent actions, and then choose the most appropriate character (Player, Knight, or Rogue) to prompt next. This makes the game more dynamic.";
                    }
                } else {
                   prompt = "Narrate the consequences of the party's recent actions, and then choose the most appropriate character (Player, Knight, or Rogue) to prompt next. This makes the game more dynamic.";
                }
            } else { // Knight or Rogue's turn
                prompt = `Based on the log, what is your character's immediate reaction or action?`;
            }

            const response = await runAITurn(speaker, prompt);
            
            let finalResponseText = response.text;
            let shouldEndGame = false;
            if (response.text.includes('_PLAYER_WINS_CHALLENGE_')) {
                finalResponseText = response.text.replace('_PLAYER_WINS_CHALLENGE_', '').trim();
                onRoomMastered('dungeon');
                shouldEndGame = true;
            }
            
            if (agent) {
                const newEntry: LogEntry = { id: `${speaker}-${Date.now()}`, speaker, content: finalResponseText, speakerName: agent.name };
                const currentIndex = turnOrder.indexOf(currentDcs.turn);
                const nextTurn = turnOrder[(currentIndex + 1) % turnOrder.length];
                setGameState({
                    dungeonChallengeState: {
                        ...currentDcs,
                        log: [...currentDcs.log, newEntry],
                        turn: shouldEndGame ? currentDcs.turn : nextTurn,
                        status: shouldEndGame ? 'finished' : currentDcs.status
                    }
                });
            }
            setIsLoading(false);
        };

        if (turn !== 'Player') {
            const timer = setTimeout(takeAITurn, 100);
            return () => clearTimeout(timer);
        }
    }, [dungeonChallengeState?.turn, isOpen, runAITurn, onRoomMastered, setGameState, turnOrder]);


    if (!isOpen) return null;
    
    if (dungeonChallengeState?.status === 'initial') {
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                <div
                  className="game-board-modal w-full max-w-lg"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="create-adventurer-heading"
                >
                    <header className="game-board-header p-4">
                        <h2 id="create-adventurer-heading" className="text-3xl">Create Your Adventurer</h2>
                    </header>
                    <form onSubmit={handleCharacterCreate} className="p-6 space-y-4">
                        <div>
                            <label className="block font-bold mb-1">What do you want to be called?</label>
                            <input type="text" value={character.name} onChange={e => setCharacter(c => ({...c, name: e.target.value}))} className="game-board-input" required />
                        </div>
                        <div>
                            <label className="block font-bold mb-1">Class</label>
                            <input type="text" value={character.class} onChange={e => setCharacter(c => ({...c, class: e.target.value}))} className="game-board-input" placeholder="e.g., Wizard, Fighter" required />
                        </div>
                        <div>
                            <label className="block font-bold mb-1">Defining Trait</label>
                            <input type="text" value={character.trait} onChange={e => setCharacter(c => ({...c, trait: e.target.value}))} className="game-board-input" placeholder="e.g., Brave, Cunning" required />
                        </div>
                        <div className="pt-4 flex justify-between">
                            <button type="button" onClick={onClose} className="game-board-button bg-red-800">Exit</button>
                            <button type="submit" className="game-board-button bg-green-700">Begin Adventure</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
            <div
              className="game-board-modal w-full max-w-4xl max-h-[90vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="game-board-heading"
            >
                <header className="game-board-header flex justify-between items-center p-4">
                    <h2 id="game-board-heading" className="text-3xl">Dungeon Adventure</h2>
                    <button onClick={onClose} className="text-black hover:text-red-700" data-close-button="true">
                        <CloseIcon className="w-8 h-8" />
                    </button>
                </header>

                <main ref={contentRef} className="p-4 flex-grow overflow-y-auto bg-parchment text-black">
                    {dungeonChallengeState?.log.map(entry => <MemoizedLogEntry key={entry.id} entry={entry} />)}
                    {isLoading && <div className="text-center font-bold text-purple-800">...</div>}
                </main>
                <footer className="p-4 bg-black/10 mt-auto">
                    <form onSubmit={handlePlayerAction}>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={userInput}
                                onChange={e => setUserInput(e.target.value)}
                                className="game-board-input flex-grow"
                                placeholder={dungeonChallengeState?.turn === 'Player' ? `What does ${dungeonChallengeState.playerCharacter?.name} do?` : "Waiting for others to act..."}
                                disabled={isLoading || dungeonChallengeState?.turn !== 'Player'}
                                required={dungeonChallengeState?.turn === 'Player' || undefined}
                            />
                            <button type="submit" className="game-board-button bg-blue-700" disabled={isLoading || dungeonChallengeState?.turn !== 'Player'}>
                                <SendIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </form>
                </footer>
            </div>
        </div>
    );
};