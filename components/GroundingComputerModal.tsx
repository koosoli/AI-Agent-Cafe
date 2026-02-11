import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CloseIcon, SendIcon, LinkIcon } from './icons.tsx';
import type { Message } from '../types.ts';

interface GroundingComputerModalProps {
  isOpen: boolean;
  initialQuery: string;
  onClose: () => void;
  onSearch: (query: string) => Promise<{ text: string; groundingChunks: any[]; }>;
}

const GroundingComputerModal = ({ isOpen, initialQuery, onClose, onSearch }: GroundingComputerModalProps) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ text: string; sources: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setResult(null);
      setError(null);
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
      
      if (initialQuery.trim()) {
        handleSearch(initialQuery);
      }
    }
  }, [isOpen, initialQuery]);
  
  const handleSearch = useCallback(async (searchQuery: string) => {
      if (!searchQuery.trim() || isLoading) return;
      
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const searchResult = await onSearch(searchQuery);
        setResult({ text: searchResult.text, sources: searchResult.groundingChunks || [] });
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
  }, [isLoading, onSearch]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };
  
  const SourcesDisplay = ({ sources }: { sources: Message['groundingChunks'] }) => {
    if (!sources || sources.length === 0) return null;
    return (
      <div className="mt-4 pt-3 border-t-2 border-gray-700">
        <h4 className="text-lg text-blue-300 font-bold flex items-center gap-2"><LinkIcon className="w-5 h-5" /> Sources</h4>
        <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
          {sources.map((chunk, index) => (
            <li key={index}>
              <a
                href={chunk.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline hover:text-blue-200"
              >
                {chunk.title || chunk.uri}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div
        className="pixel-modal w-full max-w-3xl welcome-modal-animation flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grounding-computer-heading"
      >
        <header className="pixel-header flex justify-between items-center p-4">
          <h2 id="grounding-computer-heading" className="text-3xl md:text-4xl">Grounding Terminal</h2>
          <button onClick={onClose} className="text-white hover:text-red-500 ml-4" data-close-button="true"><CloseIcon className="w-8 h-8" /></button>
        </header>

        <main className="p-4 md:p-6 overflow-y-auto space-y-4 flex-grow flex flex-col">
            <div className="bg-black/30 p-4 border-2 border-black flex-grow min-h-[20rem]">
                {isLoading && (
                    <div className="text-center text-yellow-300 flex flex-col items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-400 mx-auto"></div>
                        <p className="mt-4 text-2xl">Searching the web...</p>
                    </div>
                )}
                {!isLoading && result && (
                    <div>
                        <p className="text-lg whitespace-pre-wrap">{result.text}</p>
                        <SourcesDisplay sources={result.sources} />
                    </div>
                )}
                 {!isLoading && !result && !error && (
                    <div className="text-center text-gray-400 p-4 flex flex-col items-center justify-center h-full">
                        <p className="text-5xl">🌐</p>
                        <p className="mt-2 text-xl">Enter a query to research with Google Search.</p>
                        <p className="text-base mt-1">(Best for recent events or factual questions)</p>
                    </div>
                )}
                {error && (
                    <div className="text-center text-red-300 p-4 flex flex-col items-center justify-center h-full">
                         <p className="text-5xl">⚠️</p>
                        <p className="font-bold mt-2 text-xl">Search Failed</p>
                        <p className="text-base">{error}</p>
                    </div>
                )}
            </div>
        </main>

        <footer className="p-4 border-t-2 border-black mt-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
              ref={inputRef}
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., who won the last F1 race?"
              className="pixel-input flex-grow text-lg"
              disabled={isLoading}
            />
            <button type="submit" className="pixel-button bg-green-700" disabled={isLoading || !query.trim()}>
              <SendIcon className="w-6 h-6"/>
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
};

export default GroundingComputerModal;