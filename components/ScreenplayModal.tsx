import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { useAppStore } from '../hooks/useAppContext.ts';
import { CloseIcon } from './icons.tsx';
import type { ScreenplayArtifact } from '../types.ts';
import { shallow } from 'zustand/shallow';

interface ScreenplayModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ScreenplayModal = ({ isOpen, onClose }: ScreenplayModalProps) => {
    const { studioConversationState } = useAppStore(s => ({
        studioConversationState: s.game.studioConversationState
    }), shallow);
    const addArtifact = useAppStore(s => s.addArtifact);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isSaved, setIsSaved] = useState(false);
    
    useEffect(() => {
        if(isOpen) setIsSaved(false);
    }, [isOpen]);
    
    useLayoutEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [studioConversationState?.scriptContent, isOpen]);

    if (!isOpen) return null;
    
    const scriptContent = studioConversationState?.scriptContent || "The screenplay is empty. Start a discussion in the Writer's Studio to begin.";
    const title = studioConversationState?.sceneTitle || "Untitled Scene";
    
    const handleSave = () => {
        if (!studioConversationState) return;
        const artifact: ScreenplayArtifact = {
            id: `screenplay-${Date.now()}`,
            type: 'screenplay',
            title: title,
            content: scriptContent,
            timestamp: Date.now()
        };
        addArtifact(artifact);
        setIsSaved(true);
    };


    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
            <div
              className="pixel-modal w-full max-w-4xl max-h-[90vh] flex flex-col welcome-modal-animation"
              role="dialog"
              aria-modal="true"
              aria-labelledby="screenplay-heading"
            >
                <header className="pixel-header flex justify-between items-center p-4">
                    <h2 id="screenplay-heading" className="text-3xl md:text-4xl">Live Screenplay</h2>
                    <button onClick={onClose} className="text-white hover:text-red-500 ml-4" data-close-button="true">
                        <CloseIcon className="w-8 h-8" />
                    </button>
                </header>

                <main ref={scrollRef} className="p-4 md:p-6 overflow-y-auto flex-grow bg-slate-100 text-black font-mono text-lg">
                    <pre className="whitespace-pre-wrap">{scriptContent}</pre>
                </main>

                <footer className="p-4 border-t-2 border-black mt-auto flex justify-between items-center">
                    <button onClick={handleSave} className="pixel-button bg-purple-600" disabled={!studioConversationState || isSaved}>
                        {isSaved ? 'Saved ✓' : 'Save to Inventory'}
                    </button>
                    <button onClick={onClose} className="pixel-button bg-gray-600 text-lg md:text-xl">
                        Close
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ScreenplayModal;