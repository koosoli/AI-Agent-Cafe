import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppStore } from '../hooks/useAppContext.ts';
import { DOJO_ALIGNMENT_CHALLENGES } from '../data/personas.ts';
import type { DojoBelt, Agent, DojoAlignmentChallenge, LLMResponse } from '../types.ts';
import { CloseIcon, SendIcon, PlusIcon, TrashIcon } from './icons.tsx';
import { shallow } from 'zustand/shallow';

interface DojoAlignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomMastered: (roomId: string) => void;
  onTestPrompt: (challenge: DojoAlignmentChallenge, systemPrompt: string) => Promise<LLMResponse>;
  onEvaluatePrompt: (challenge: DojoAlignmentChallenge, studentSystemPrompt: string, studentResponse: string) => Promise<LLMResponse>;
}

type LogEntry = {
  id: string;
  type: 'SIMULATION' | 'EVALUATION' | 'SYSTEM' | 'HINT';
  content: string;
};

const DojoAlignmentModal = ({ isOpen, onClose, onRoomMastered, onTestPrompt, onEvaluatePrompt }: DojoAlignmentModalProps) => {
    const { dojoChallengeState, agents } = useAppStore(s => ({
        dojoChallengeState: s.game.dojoChallengeState,
        agents: s.agents,
    }), shallow);
    const setGameState = useAppStore(s => s.setGameState);

    const [currentChallenge, setCurrentChallenge] = useState(DOJO_ALIGNMENT_CHALLENGES[0]);
    const [systemPrompt, setSystemPrompt] = useState('');
    const [examples, setExamples] = useState<{ input: string; output: string; }[]>([]);
    const [challengeCompleted, setChallengeCompleted] = useState(false);
    
    const [log, setLog] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const sensei = useMemo(() => agents.find(a => a.id === 'DOJO1'), [agents]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && dojoChallengeState) {
            const challenge = DOJO_ALIGNMENT_CHALLENGES.find(c => c.belt === dojoChallengeState.belt) || DOJO_ALIGNMENT_CHALLENGES[0];
            setCurrentChallenge(challenge);
            setSystemPrompt(challenge.baseSystemPrompt);
            setExamples(challenge.examples || []);
            setLog([
                {
                    id: `system-${Date.now()}`,
                    type: 'SYSTEM',
                    content: `Challenge: ${challenge.name}\nGoal: ${challenge.goal}`
                }, {
                    id: `hint-${Date.now()}`,
                    type: 'HINT',
                    content: `AI's Bad Response:\n"${challenge.badResponse}"`
                }
            ]);
            setIsLoading(false);
            setChallengeCompleted(false);
        }
    }, [isOpen, dojoChallengeState]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [log]);

    const handleExampleChange = (index: number, field: 'input' | 'output', value: string) => {
        setExamples(prev => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
    };

    const addExample = () => setExamples(prev => [...prev, { input: '', output: '' }]);
    const removeExample = (index: number) => setExamples(prev => prev.filter((_, i) => i !== index));
    
    const buildFullSystemPrompt = useCallback(() => {
        let fullPrompt = systemPrompt;
        if (examples.length > 0) {
            fullPrompt += "\n\nHere are some examples of how to respond:\n";
            examples.forEach(ex => {
                fullPrompt += `\nUser: ${ex.input}\nAI: ${ex.output}`;
            });
        }
        return fullPrompt;
    }, [systemPrompt, examples]);

    const handleRunSimulation = async () => {
        if (!sensei || isLoading) return;
        setIsLoading(true);
        const fullPrompt = buildFullSystemPrompt();
        try {
            const response = await onTestPrompt(currentChallenge, fullPrompt);
            setLog(prev => [...prev, { id: `sim-${Date.now()}`, type: 'SIMULATION', content: response.text }]);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "An error occurred.";
            setLog(prev => [...prev, { id: `sim-err-${Date.now()}`, type: 'HINT', content: `Simulation Error: ${errorMsg}` }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSubmitForEvaluation = async () => {
        if (!sensei || isLoading) return;
        setIsLoading(true);
        const lastResponse = [...log].reverse().find(l => l.type === 'SIMULATION')?.content;
        if (!lastResponse) {
            setLog(prev => [...prev, { id: `eval-err-${Date.now()}`, type: 'HINT', content: "You must run a simulation before submitting for evaluation." }]);
            setIsLoading(false);
            return;
        }
        const fullStudentPrompt = buildFullSystemPrompt();
        try {
            const response = await onEvaluatePrompt(currentChallenge, fullStudentPrompt, lastResponse);
            let evaluationText = response.text;
            if (evaluationText.startsWith('SUCCESS:')) {
                setChallengeCompleted(true);
            }
            setLog(prev => [...prev, { id: `eval-${Date.now()}`, type: 'EVALUATION', content: evaluationText }]);
        } catch (error) {
             const errorMsg = error instanceof Error ? error.message : "An error occurred during evaluation.";
             setLog(prev => [...prev, { id: `eval-err-${Date.now()}`, type: 'HINT', content: `Evaluation Error: ${errorMsg}` }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleNextChallenge = () => {
        const belts: DojoBelt[] = ['white', 'yellow', 'green', 'blue', 'brown', 'black'];
        const currentBeltIndex = belts.indexOf(currentChallenge.belt);
        if (currentBeltIndex === belts.length - 1) {
            onRoomMastered('dojo');
            onClose();
        } else {
            const nextBelt = belts[currentBeltIndex + 1];
            setGameState({ dojoChallengeState: { belt: nextBelt, status: 'initial' } });
        }
    };

    const belts: DojoBelt[] = ['white', 'yellow', 'green', 'blue', 'brown', 'black'];
    const challengeNumber = belts.indexOf(currentChallenge.belt) + 1;

    if (!isOpen || !dojoChallengeState) return null;

    const getLogItemStyle = (type: LogEntry['type']) => {
        switch (type) {
            case 'SYSTEM': return 'bg-amber-100/50 border-amber-800/20 text-amber-900 italic';
            case 'SIMULATION': return 'bg-blue-100/50 border-blue-800/20 text-blue-900';
            case 'EVALUATION': 
                return log.find(l=>l.type === 'EVALUATION')?.content.startsWith('SUCCESS:') ? 'bg-green-100/50 border-green-800/20 text-green-900' : 'bg-red-100/50 border-red-800/20 text-red-900';
            case 'HINT': return 'bg-red-100/50 border-red-800/20 text-red-900';
            default: return '';
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
            <div
              className="game-board-modal w-full max-w-7xl max-h-[90vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dojo-heading"
            >
                 <header className="game-board-header flex justify-between items-center p-4">
                    <h2 id="dojo-heading" className="text-2xl md:text-3xl lg:text-4xl flex items-baseline gap-4">
                        <span>Dojo: {currentChallenge.name}</span>
                        <span className="text-lg md:text-xl text-amber-800">
                            (Challenge {challengeNumber} / {belts.length})
                        </span>
                    </h2>
                    <button onClick={onClose} className="text-black hover:text-red-700" data-close-button="true">
                        <CloseIcon className="w-8 h-8" />
                    </button>
                </header>

                <main className="p-4 flex flex-col md:flex-row gap-4 flex-grow min-h-0">
                    {/* Left Pane: Controls */}
                    <div className="w-full md:w-1/2 flex flex-col gap-4">
                        <div className="p-3 bg-black/5 rounded-lg border-2 border-amber-800/50">
                            <h3 className="text-xl font-bold text-amber-900">System Prompt (Editable)</h3>
                            <p className="text-sm mb-2">{currentChallenge.goal}</p>
                            <textarea
                                value={systemPrompt}
                                onChange={e => setSystemPrompt(e.target.value)}
                                className="game-board-input w-full font-mono text-sm"
                                rows={8}
                            />
                        </div>
                        {currentChallenge.examples && (
                            <div className="p-3 bg-black/5 rounded-lg border-2 border-amber-800/50 flex-grow flex flex-col min-h-0">
                                <h3 className="text-xl font-bold text-amber-900">Few-shot Examples</h3>
                                <div className="overflow-y-auto space-y-2 mt-2">
                                    {examples.map((ex, i) => (
                                        <div key={i} className="bg-white/50 p-2 rounded relative">
                                            <label className="text-xs font-bold">Example {i+1}: Input</label>
                                            <textarea value={ex.input} onChange={e => handleExampleChange(i, 'input', e.target.value)} className="game-board-input w-full font-mono text-xs" rows={2}/>
                                            <label className="text-xs font-bold mt-1">Example {i+1}: Desired Output</label>
                                            <textarea value={ex.output} onChange={e => handleExampleChange(i, 'output', e.target.value)} className="game-board-input w-full font-mono text-xs" rows={2}/>
                                            <button onClick={() => removeExample(i)} className="absolute top-1 right-1 p-0.5 bg-red-700/50 rounded-full"><TrashIcon className="w-4 h-4 text-white"/></button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addExample} className="game-board-button bg-blue-700 text-sm mt-2 flex items-center justify-center gap-1"><PlusIcon className="w-4 h-4"/> Add Example</button>
                            </div>
                        )}
                    </div>
                    {/* Right Pane: Log & Actions */}
                    <div className="w-full md:w-1/2 flex flex-col min-h-0">
                        <div ref={scrollRef} className="flex-grow bg-white/50 p-3 overflow-y-auto rounded-lg border-2 border-amber-800/50">
                            {log.map(entry => (
                                <div key={entry.id} className={`p-2 my-1 border rounded-md ${getLogItemStyle(entry.type)}`}>
                                    <pre className="whitespace-pre-wrap font-sans text-base">{entry.content}</pre>
                                </div>
                            ))}
                            {isLoading && <div className="text-center font-bold text-amber-900">...</div>}
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={handleRunSimulation} disabled={isLoading || challengeCompleted} className="game-board-button bg-blue-700 flex-grow">Simulate</button>
                            {challengeCompleted ? (
                                <button onClick={handleNextChallenge} className="game-board-button bg-green-700 flex-grow">Next Challenge</button>
                            ) : (
                                <button onClick={handleSubmitForEvaluation} disabled={isLoading} className="game-board-button bg-purple-700 flex-grow">Submit for Evaluation</button>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DojoAlignmentModal;