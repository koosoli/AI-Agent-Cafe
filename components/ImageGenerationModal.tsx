import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CloseIcon, SendIcon } from './icons.tsx';
import { useAppStore } from '../hooks/useAppContext.ts';
import { IMAGEN_MODELS, OPENAI_IMAGE_MODELS } from '../constants.ts';
import { shallow } from 'zustand/shallow';

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: (getFeedback: boolean) => void;
  onGenerate: (prompt: string, model: string) => Promise<string>;
}

const ImageGenerationModal = ({ isOpen, onClose, onGenerate }: ImageGenerationModalProps) => {
  const { game, services } = useAppStore(s => ({
    game: s.game,
    services: s.services
  }), shallow);
  const { openAiApiKey } = services;

  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [getFeedback, setGetFeedback] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  const handlePrimaryAction = useCallback(() => {
    if (isLoading) return;

    if (imageUrl || error) {
      onClose(getFeedback);
    } else if (prompt.trim() && selectedModel) {
      setIsLoading(true);
      setError(null);
      setImageUrl(null);
      onGenerate(prompt, selectedModel)
        .then(url => setImageUrl(url))
        .catch(err => setError(err.message || 'An unknown error occurred during image generation.'))
        .finally(() => setIsLoading(false));
    }
  }, [isLoading, imageUrl, error, prompt, selectedModel, onGenerate, onClose, getFeedback]);

  useEffect(() => {
    if (isOpen) {
      setPrompt(game.lastArtPrompt || '');
      setSelectedModel(services.imageGenerationModel || IMAGEN_MODELS[0]);
      setIsLoading(false);
      setError(null);
      setImageUrl(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setGetFeedback(true);
    }
  }, [isOpen, game.lastArtPrompt, services.imageGenerationModel]);
  
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    handlePrimaryAction();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div
        className="pixel-modal w-full max-w-2xl welcome-modal-animation flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-gen-heading"
      >
        <header className="pixel-header flex justify-between items-center p-4">
          <h2 id="image-gen-heading" className="text-3xl md:text-4xl">Art Studio Easel</h2>
          <button onClick={() => onClose(getFeedback)} className="text-white hover:text-red-500 ml-4" data-close-button="true"><CloseIcon className="w-8 h-8" /></button>
        </header>
        
        <main className="p-4 md:p-6 overflow-y-auto space-y-4 flex-grow flex flex-col items-center justify-center">
            <div className="w-full max-w-lg aspect-square bg-black border-4 border-yellow-800 shadow-lg relative flex items-center justify-center p-2" style={{ backgroundColor: '#2a1a1f'}}>
                {isLoading && (
                    <div className="text-center text-yellow-300">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400 mx-auto"></div>
                        <p className="mt-4 text-2xl">Painting in progress...</p>
                    </div>
                )}
                {!isLoading && imageUrl && (
                     <img src={imageUrl} alt={prompt} className="max-w-full max-h-full object-contain" />
                )}
                {!isLoading && !imageUrl && (
                    <div className="text-center text-gray-400 p-4">
                        <p className="text-4xl">🎨</p>
                        <p className="mt-2 text-xl">Describe the masterpiece you want to create.</p>
                    </div>
                )}
            </div>
            {error && (
                <div className="w-full max-w-lg mt-4 p-3 bg-red-900/60 border-2 border-red-500 text-red-200 text-center rounded">
                    <p className="font-bold">Generation Failed</p>
                    <p>{error}</p>
                </div>
            )}
        </main>
        
        <footer className="p-4 border-t-2 border-black mt-auto space-y-3">
          <form onSubmit={handleSubmitForm} className="flex gap-2">
            <input 
                ref={inputRef}
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A surrealist painting of..."
                className="pixel-input flex-grow text-lg"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePrimaryAction();
                  }
                }}
            />
            <button type="submit" className="pixel-button bg-green-700" disabled={isLoading || !prompt.trim()}>
                <SendIcon className="w-6 h-6"/>
            </button>
          </form>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input 
                    type="checkbox"
                    id="feedback-checkbox"
                    checked={getFeedback}
                    onChange={(e) => setGetFeedback(e.target.checked)}
                    className="w-5 h-5 accent-yellow-400"
                    disabled={isLoading}
                />
                <label htmlFor="feedback-checkbox" className="text-gray-300 select-none">Get feedback from artists</label>
              </div>

              <div className="flex gap-2 items-center ml-auto">
                  <label htmlFor="model-select" className="text-gray-300">Model:</label>
                  <select
                      id="model-select"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="pixel-select"
                      disabled={isLoading}
                      style={{minWidth: '150px'}}
                  >
                      <optgroup label="Google Imagen">
                          {IMAGEN_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                      </optgroup>
                      {openAiApiKey && (
                          <optgroup label="OpenAI DALL-E">
                              {OPENAI_IMAGE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                          </optgroup>
                      )}
                  </select>
              </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ImageGenerationModal;