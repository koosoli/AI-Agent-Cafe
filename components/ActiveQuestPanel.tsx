import React, { useState } from 'react';
import { shallow } from 'zustand/shallow';
import { useAppStore } from '../hooks/useAppContext.ts';
import { getRoomGuidance } from '../services/learningGuidanceService.ts';
import { ArrowDownIcon, ArrowUpIcon, CloseIcon, InfoIcon } from './icons.tsx';

interface ActiveQuestPanelProps {
    roomId?: string;
}

type PanelMode = 'expanded' | 'compact' | 'hidden';

const ActiveQuestPanel = ({ roomId }: ActiveQuestPanelProps) => {
    const state = useAppStore(s => ({
        agents: s.agents,
        messages: s.messages,
        game: s.game,
    }), shallow);
    const [panelMode, setPanelMode] = useState<PanelMode>('expanded');

    const guidance = getRoomGuidance(state, roomId);
    if (!guidance) return null;
    
    if (panelMode === 'hidden') {
        return (
            <aside className="absolute left-2 top-2 md:left-4 md:top-4 z-20 w-auto pointer-events-none">
                <button
                    type="button"
                    className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border transition-opacity hover:opacity-100"
                    style={{
                        background: 'rgba(15, 23, 42, 0.72)',
                        borderColor: guidance.palette.border,
                        color: guidance.palette.text,
                        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                        opacity: 0.72,
                    }}
                    onClick={() => setPanelMode('compact')}
                    aria-label="Open room challenge popup"
                    title="Open room challenge"
                >
                    <InfoIcon className="h-4 w-4" />
                </button>
            </aside>
        );
    }

    const isExpanded = panelMode === 'expanded';

    return (
        <aside className={`absolute left-2 top-2 md:left-4 md:top-4 z-20 max-w-[calc(100%-1rem)] pointer-events-none ${isExpanded ? 'w-[22rem]' : 'w-[18rem]'}`}>
            <div
                className={`pointer-events-auto border-2 text-sm transition-all md:text-base ${isExpanded ? 'p-3 md:p-4' : 'p-3'}`}
                style={{
                    background: guidance.palette.surface,
                    borderColor: guidance.palette.border,
                    color: guidance.palette.text,
                    boxShadow: isExpanded
                        ? `0 0 0 2px rgba(0,0,0,0.55), 6px 6px 0 rgba(0,0,0,0.45)`
                        : `0 0 0 1px rgba(0,0,0,0.45), 3px 3px 0 rgba(0,0,0,0.3)`,
                    textShadow: '1px 1px rgba(0,0,0,0.35)',
                    opacity: isExpanded ? 1 : 0.94,
                }}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] opacity-80">
                            {guidance.roomId === 'outside' ? 'Campus Guide' : 'Room Challenge'}
                        </p>
                        <h2 className="text-xl md:text-2xl leading-tight">{guidance.name}</h2>
                    </div>
                    <div className="flex items-start gap-2">
                        <div
                            className="shrink-0 px-2 py-1 border text-xs uppercase"
                            style={{ borderColor: guidance.palette.border, color: guidance.palette.text }}
                        >
                            {guidance.skill}
                        </div>
                        <button
                            type="button"
                            className="shrink-0 border p-1"
                            style={{ borderColor: guidance.palette.border, color: guidance.palette.text }}
                            onClick={() => setPanelMode(current => current === 'expanded' ? 'compact' : 'expanded')}
                            aria-label={isExpanded ? 'Collapse room challenge popup' : 'Expand room challenge popup'}
                        >
                            {isExpanded ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                        </button>
                        <button
                            type="button"
                            className="shrink-0 border p-1 opacity-80 transition-opacity hover:opacity-100"
                            style={{ borderColor: guidance.palette.border, color: guidance.palette.text }}
                            onClick={() => setPanelMode('hidden')}
                            aria-label="Hide room challenge popup"
                        >
                            <CloseIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className={`mt-3 ${isExpanded ? '' : 'mt-2'}`}>
                    <div className="flex items-center justify-between text-xs uppercase opacity-80">
                        <span>Progress</span>
                        <span>{guidance.progress.label}</span>
                    </div>
                    <div className="mt-1 h-3 border border-black/50 bg-black/30">
                        <div
                            className="h-full"
                            style={{
                                width: `${guidance.progress.percent}%`,
                                background: guidance.palette.accent,
                                boxShadow: `0 0 12px ${guidance.palette.accent}`,
                            }}
                        />
                    </div>
                </div>

                {isExpanded ? (
                    <>
                        <p className="mt-3 text-sm md:text-base opacity-95">{guidance.summary}</p>

                        <div className="mt-4 border-t border-white/20 pt-3">
                            <p className="text-xs uppercase tracking-[0.2em] opacity-80">How To Win</p>
                            <p className="mt-1">{guidance.mastery}</p>
                        </div>

                        <div className="mt-3 space-y-2">
                            {guidance.steps.map(step => (
                                <div key={step.label} className="flex items-start gap-2">
                                    <span
                                        className="mt-1 h-3 w-3 shrink-0 border border-black/60"
                                        style={{
                                            background: step.status === 'done'
                                                ? guidance.palette.accent
                                                : step.status === 'current'
                                                    ? 'rgba(255,255,255,0.8)'
                                                    : 'rgba(0,0,0,0.25)',
                                        }}
                                    />
                                    <span className={step.status === 'todo' ? 'opacity-70' : ''}>{step.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 border-t border-white/20 pt-3">
                            <p className="text-xs uppercase tracking-[0.2em] opacity-80">Next Action</p>
                            <p className="mt-1">{guidance.nextAction}</p>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] opacity-80">Coach Tip</p>
                                <p className="mt-1 text-sm">{guidance.coachTip}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] opacity-80">Prompt Ideas</p>
                                <ul className="mt-1 space-y-1 text-sm">
                                    {guidance.promptIdeas.slice(0, 2).map(idea => <li key={idea}>- {idea}</li>)}
                                </ul>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="mt-3 space-y-3">
                        <p className="text-sm opacity-90">{guidance.nextAction}</p>
                        <div className="border-t border-white/20 pt-2">
                            <p className="text-[11px] uppercase tracking-[0.2em] opacity-70">Win Condition</p>
                            <p className="mt-1 text-sm opacity-85">{guidance.mastery}</p>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default React.memo(ActiveQuestPanel);
