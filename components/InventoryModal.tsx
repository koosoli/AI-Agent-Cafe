import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppContext.ts';
import type { Artifact, ImageArtifact, CodeArtifact, ScreenplayArtifact } from '../types.ts';
import { CloseIcon, ExportIcon, TrashIcon, CopyIcon } from './icons.tsx';
import { shallow } from 'zustand/shallow';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const downloadImage = (artifact: ImageArtifact) => {
    const a = document.createElement('a');
    a.href = artifact.imageUrl;
    // Sanitize prompt for filename
    const filename = artifact.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `art_studio_${filename}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

const CodeInventoryItem = ({ artifact, onDelete, onUse, onPreview }: { artifact: CodeArtifact, onDelete: (id: string) => void, onUse: (id: string) => void, onPreview: (artifact: CodeArtifact) => void }) => {
    const [copiedPart, setCopiedPart] = useState<string | null>(null);

    const handleCopy = (content: string, part: 'html' | 'css' | 'js') => {
        navigator.clipboard.writeText(content);
        setCopiedPart(part);
        setTimeout(() => setCopiedPart(null), 2000);
    };

    return (
        <div className="bg-black/20 p-2 border-2 border-black flex flex-col group h-full">
            <button onClick={() => onPreview(artifact)} className="aspect-square bg-gray-900 border-2 border-gray-700 flex flex-col items-center justify-center p-4 relative hover:bg-gray-800 transition-colors">
                <div className="text-6xl text-gray-500">&lt;/&gt;</div>
                <p className="mt-2 text-gray-400 text-center">Preview Component</p>
            </button>
            <div className="mt-2 flex-grow">
                <p className="text-sm text-gray-300 line-clamp-2" title={artifact.prompt}>
                    <span className="text-yellow-300">Prompt:</span> {artifact.prompt}
                </p>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2">
                 <button onClick={() => onUse(artifact.id)} className='pixel-button !p-2 bg-green-700'>
                    Use
                 </button>
                 <button onClick={() => onDelete(artifact.id)} className="pixel-button !p-2 bg-red-700" title="Delete">
                    <TrashIcon className="w-5 h-5"/>
                 </button>
            </div>
             <div className="flex justify-start gap-1 mt-1">
                <button onClick={() => handleCopy(artifact.html, 'html')} className="pixel-button !p-2 bg-orange-600" title="Copy HTML">
                    {copiedPart === 'html' ? '✓' : 'H'}
                </button>
                <button onClick={() => handleCopy(artifact.css, 'css')} className="pixel-button !p-2 bg-blue-600" title="Copy CSS">
                    {copiedPart === 'css' ? '✓' : 'C'}
                </button>
                <button onClick={() => handleCopy(artifact.javascript, 'js')} className="pixel-button !p-2 bg-yellow-500" title="Copy JS">
                    {copiedPart === 'js' ? '✓' : 'J'}
                </button>
            </div>
        </div>
    );
};

const ScreenplayInventoryItem = ({ artifact, onDelete, onUse }: { artifact: ScreenplayArtifact, onDelete: (id: string) => void, onUse: (id: string) => void }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(artifact.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
         <div className="bg-black/20 p-2 border-2 border-black flex flex-col group h-full">
            <div className="aspect-square bg-gray-900 border-2 border-gray-700 flex flex-col items-center justify-center p-4 relative">
                <div className="text-6xl text-gray-500">📜</div>
                <p className="mt-2 text-gray-400 text-center">Screenplay</p>
            </div>
            <div className="mt-2 flex-grow">
                <p className="text-sm text-gray-300 line-clamp-2" title={artifact.title}>
                    <span className="text-yellow-300">Title:</span> {artifact.title}
                </p>
            </div>
            <div className="flex justify-between items-center mt-2 gap-1">
                <button onClick={() => onUse(artifact.id)} className='pixel-button !p-2 flex-grow bg-green-700'>
                    Use
                 </button>
                 <button onClick={handleCopy} className="pixel-button !p-2 bg-blue-700" title="Copy Script">
                    {copied ? <span className="text-sm">✓</span> : <CopyIcon className="w-5 h-5"/>}
                </button>
                 <button onClick={() => onDelete(artifact.id)} className="pixel-button !p-2 bg-red-700" title="Delete">
                    <TrashIcon className="w-5 h-5"/>
                 </button>
            </div>
        </div>
    );
};


const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
  const { inventory, equippedArtifactId } = useAppStore(s => ({
    inventory: s.inventory,
    equippedArtifactId: s.game.equippedArtifactId,
  }), shallow);
  const { setEquippedArtifact, removeArtifact, setUiState } = useAppStore.getState();

  if (!isOpen) return null;

  const handleDelete = (artifactId: string) => {
    if (window.confirm("Are you sure you want to delete this item from your inventory?")) {
      if (equippedArtifactId === artifactId) {
        setEquippedArtifact(null);
      }
      removeArtifact(artifactId);
    }
  };

  const handleUse = (artifactId: string) => {
    setEquippedArtifact(artifactId);
    onClose();
  };
  
  const handlePreview = (artifact: CodeArtifact) => {
    setUiState({ vibeCodingArtifactToPreview: artifact, isInventoryOpen: false });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div
        className="pixel-modal w-full max-w-5xl max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-heading"
      >
        <header className="pixel-header flex justify-between items-center p-4">
          <h2 id="inventory-heading" className="text-3xl md:text-4xl">Inventory</h2>
          <button onClick={onClose} className="text-white hover:text-red-500 ml-4" data-close-button="true"><CloseIcon className="w-8 h-8" /></button>
        </header>

        <main className="p-4 md:p-6 overflow-y-auto flex-grow">
          {inventory.length === 0 ? (
            <div className="text-center text-gray-400 text-xl md:text-2xl h-full flex flex-col justify-center items-center">
                <p className="text-5xl">🎒</p>
                <p className="mt-4">Your inventory is empty.</p>
                <p className="text-lg mt-2">Creations from the Art Studio and Vibe Terminal will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {inventory.slice().reverse().map(artifact => {
                    if (artifact.type === 'image') {
                        return (
                            <div key={artifact.id} className="bg-black/20 p-2 border-2 border-black flex flex-col group">
                                <div className="aspect-square bg-black border-2 border-gray-700 flex items-center justify-center">
                                    <img src={artifact.imageUrl} alt={artifact.prompt} className="max-w-full max-h-full object-contain" />
                                </div>
                                <div className="mt-2 flex-grow">
                                    <p className="text-sm text-gray-300 line-clamp-2" title={artifact.prompt}>
                                        <span className="text-yellow-300">Prompt:</span> {artifact.prompt}
                                    </p>
                                </div>
                                <div className="flex justify-between items-center gap-1 mt-2">
                                     <button onClick={() => handleUse(artifact.id)} className='pixel-button !p-2 flex-grow bg-green-700'>
                                        Use
                                     </button>
                                     <button onClick={() => downloadImage(artifact)} className="pixel-button !p-2 bg-blue-700" title="Export as JPG">
                                        <ExportIcon className="w-5 h-5"/>
                                    </button>
                                     <button onClick={() => handleDelete(artifact.id)} className="pixel-button !p-2 bg-red-700" title="Delete">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        )
                    } else if (artifact.type === 'code') {
                        return (
                           <CodeInventoryItem key={artifact.id} artifact={artifact} onDelete={handleDelete} onUse={handleUse} onPreview={handlePreview} />
                        )
                    } else if (artifact.type === 'screenplay') {
                        return (
                           <ScreenplayInventoryItem key={artifact.id} artifact={artifact} onDelete={handleDelete} onUse={handleUse} />
                        )
                    }
                    return null;
                })}
            </div>
          )}
        </main>
        
        <footer className="p-4 border-t-2 border-black mt-auto flex justify-end">
            <button onClick={onClose} className="pixel-button bg-gray-600 text-lg md:text-xl">Close</button>
        </footer>
      </div>
    </div>
  );
};

export default InventoryModal;