import React from 'react';
import type { WorldImageArtifact } from '../types.ts';
import { CloseIcon } from './icons.tsx';

interface WorldArtifactModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: WorldImageArtifact | null;
}

const WorldArtifactModal = ({ isOpen, onClose, artifact }: WorldArtifactModalProps) => {
  if (!isOpen || !artifact) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div
        className="pixel-modal w-full max-w-2xl welcome-modal-animation flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="artifact-heading"
      >
        <header className="pixel-header flex justify-between items-center p-4">
          <h2 id="artifact-heading" className="text-3xl md:text-4xl">Art Inspector</h2>
          <button onClick={onClose} className="text-white hover:text-red-500 ml-4" data-close-button="true"><CloseIcon className="w-8 h-8" /></button>
        </header>
        
        <main className="p-4 md:p-6 overflow-y-auto space-y-4 flex-grow flex flex-col items-center justify-center">
          <div className="w-full max-w-lg aspect-square bg-black border-4 border-yellow-800 shadow-lg relative flex items-center justify-center p-2" style={{ backgroundColor: '#2a1a1f'}}>
            <img src={artifact.imageUrl} alt={artifact.prompt} className="max-w-full max-h-full object-contain" />
          </div>
        </main>
        
        <footer className="p-4 border-t-2 border-black mt-auto space-y-2">
            <div>
                <p className="text-yellow-300 font-bold">Artist:</p>
                <p className="text-lg">{artifact.agentName}</p>
            </div>
             <div>
                <p className="text-yellow-300 font-bold">Prompt:</p>
                <p className="text-base italic">"{artifact.prompt}"</p>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default WorldArtifactModal;