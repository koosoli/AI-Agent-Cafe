import React from 'react';
import { useAppStore } from '../hooks/useAppContext.ts';
import { getRoomPalette } from '../services/learningGuidanceService.ts';

const LearningDebriefCard = () => {
    const learningDebrief = useAppStore(s => s.ui.learningDebrief);
    const setUiState = useAppStore(s => s.setUiState);

    if (!learningDebrief) return null;

    const palette = getRoomPalette(learningDebrief.roomId);

    return (
        <div className="fixed right-3 top-20 z-[2050] w-[24rem] max-w-[calc(100%-1.5rem)]">
            <div
                className="border-2 p-4"
                style={{
                    background: palette.surface,
                    borderColor: palette.border,
                    color: palette.text,
                    boxShadow: `0 0 0 2px rgba(0,0,0,0.55), 8px 8px 0 rgba(0,0,0,0.45)`,
                    textShadow: '1px 1px rgba(0,0,0,0.3)',
                }}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] opacity-80">
                            {learningDebrief.tone === 'mastered' ? 'Lesson Cleared' : 'Coach Debrief'}
                        </p>
                        <h3 className="text-xl leading-tight">{learningDebrief.title}</h3>
                    </div>
                    <button
                        type="button"
                        className="border px-2 py-1 text-xs uppercase"
                        style={{ borderColor: palette.border }}
                        onClick={() => setUiState({ learningDebrief: null })}
                    >
                        Dismiss
                    </button>
                </div>

                <p className="mt-3">{learningDebrief.summary}</p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] opacity-80">Lesson</p>
                        <p className="mt-1 text-sm">{learningDebrief.lesson}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] opacity-80">Next Step</p>
                        <p className="mt-1 text-sm">{learningDebrief.nextStep}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LearningDebriefCard;
