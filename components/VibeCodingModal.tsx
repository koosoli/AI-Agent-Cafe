import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CloseIcon, SendIcon, ExportIcon } from './icons.tsx';
import type { CodeArtifact } from '../types.ts';
import { GEMINI_MODELS } from '../constants.ts';

interface VibeCodingModalProps {
  isOpen: boolean;
  initialPrompt: string;
  onClose: (code: { html: string; css: string; javascript: string; } | null, prompt: string | null, getFeedback: boolean) => void;
  onGenerate: (description: string, model: string) => Promise<{ html: string; css: string; javascript: string; }>;
  onSaveArtifact: (artifact: CodeArtifact) => void;
  openAIModels: string[];
  openRouterModels: string[];
  openAiApiKey: string;
  openRouterApiKey: string;
  previewArtifact?: CodeArtifact | null;
}

type CodeTab = 'html' | 'css' | 'javascript';

const VibeCodingModal = ({ 
    isOpen,
    initialPrompt,
    onClose, 
    onGenerate, 
    onSaveArtifact, 
    openAIModels, 
    openRouterModels,
    openAiApiKey,
    openRouterApiKey,
    previewArtifact = null,
}: VibeCodingModalProps) => {
  const [prompt, setPrompt] = useState('');
  const [lastUsedPrompt, setLastUsedPrompt] = useState<string | null>(null);
  const [code, setCode] = useState<{ html: string; css: string; javascript: string; } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CodeTab>('html');
  const [selectedModel, setSelectedModel] = useState<string>(GEMINI_MODELS[0]);
  const [getFeedback, setGetFeedback] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cooldownIntervalRef = useRef<number | null>(null);
  const initialPromptProcessedRef = useRef(false);
  
  const isPreviewMode = !!previewArtifact;

  const handleGenerate = useCallback(async (description: string) => {
      if (!description.trim() || isLoading || cooldown > 0) return;
      
      setIsLoading(true);
      setError(null);
      setCode(null);
      setIsSaved(false); // Reset save state on new generation
      setLastUsedPrompt(description);

      try {
        const result = await onGenerate(description, selectedModel);
        setCode(result);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
        setCooldown(5); // 5-second cooldown
      }
  }, [isLoading, onGenerate, selectedModel, cooldown]);

  const handleGenerateRef = useRef(handleGenerate);
  handleGenerateRef.current = handleGenerate;
  
  useEffect(() => {
    if (cooldown > 0) {
        cooldownIntervalRef.current = window.setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) {
                    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => {
        if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, [cooldown]);

  useEffect(() => {
    if (isOpen) {
      if (isPreviewMode && previewArtifact) {
        // Preview Mode
        setCode({ html: previewArtifact.html, css: previewArtifact.css, javascript: previewArtifact.javascript });
        setPrompt(previewArtifact.prompt);
        setLastUsedPrompt(previewArtifact.prompt);
        setIsLoading(false);
        setError(null);
        setIsSaved(true); // Can't re-save an existing artifact from here
      } else {
        // Generation Mode
        setLastUsedPrompt(null);
        setCode(null);
        setError(null);
        setIsLoading(false);
        setGetFeedback(true);
        setActiveTab('html');
        setIsSaved(false);
        setCooldown(0);

        let defaultModel = GEMINI_MODELS[0];
        if (openAiApiKey && openAIModels.length > 0) defaultModel = openAIModels[0];
        else if (openRouterApiKey && openRouterModels.length > 0) defaultModel = openRouterModels[0];
        setSelectedModel(defaultModel);
        
        setPrompt(initialPrompt || '');

        if (initialPrompt && !initialPromptProcessedRef.current) {
            initialPromptProcessedRef.current = true;
            handleGenerateRef.current(initialPrompt);
        } else if (!initialPrompt) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    } else {
      initialPromptProcessedRef.current = false;
    }
  }, [isOpen, initialPrompt, openAiApiKey, openRouterApiKey, openAIModels, openRouterModels, previewArtifact, isPreviewMode]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate(prompt);
  };

  const handleCloseAndFeedback = () => {
    onClose(code, lastUsedPrompt, getFeedback);
  };
  
  const handleDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    if (!code || !lastUsedPrompt) return;
    
    const artifact: CodeArtifact = {
        id: `code-artifact-${Date.now()}`,
        type: 'code',
        prompt: lastUsedPrompt,
        html: code.html,
        css: code.css,
        javascript: code.javascript,
        timestamp: Date.now(),
    };
    onSaveArtifact(artifact);
    setIsSaved(true);
  };
  
  useEffect(() => {
    if (iframeRef.current && code) {
      const srcDoc = `
        <html>
          <head>
            <style>
              body { 
                margin: 0; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                background-color: #f0f0f0; 
                font-family: sans-serif;
              }
              ${code.css}
            </style>
          </head>
          <body>
            ${code.html}
            <script>${code.javascript}</script>
          </body>
        </html>`;
      iframeRef.current.srcdoc = srcDoc;
    } else if (iframeRef.current) {
        iframeRef.current.srcdoc = '<html><body style="background-color: #f0f0f0;"></body></html>';
    }
  }, [code]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div className="retro-terminal-modal w-full max-w-6xl welcome-modal-animation flex flex-col max-h-[90vh] relative">
        <div className="scanline-effect"></div>
        <header className="retro-header flex justify-between items-center p-2 px-4 flex-shrink-0">
          <h2 className="text-2xl md:text-3xl">VIBE-CODING TERMINAL // {isPreviewMode ? 'ARTIFACT VIEWER' : 'PROTO-GEN v1.0'}</h2>
          <button onClick={handleCloseAndFeedback} className="text-green-400 hover:text-red-500 ml-4" data-close-button="true"><CloseIcon className="w-8 h-8" /></button>
        </header>

        <main className="p-4 flex flex-col md:flex-row gap-4 flex-grow min-h-0">
          {/* Left Pane: Code Editor */}
          <div className="flex flex-col w-full md:flex-1 min-h-0">
             <div className="code-tabs flex-shrink-0">
                <button onClick={() => setActiveTab('html')} className={activeTab === 'html' ? 'active' : ''}>HTML</button>
                <button onClick={() => setActiveTab('css')} className={activeTab === 'css' ? 'active' : ''}>CSS</button>
                <button onClick={() => setActiveTab('javascript')} className={activeTab === 'javascript' ? 'active' : ''}>JS</button>
             </div>
             <pre className="code-editor h-64 md:h-auto flex-grow">
                <code>{code ? code[activeTab] : `// Waiting for generation...`}</code>
             </pre>
          </div>
          
          {/* Right Pane: Live Preview */}
          <div className="flex flex-col w-full md:flex-1 min-h-0">
            <div className="border-2 border-gray-600 p-1 bg-gray-800 flex-shrink-0">
                <p className="text-center text-sm text-yellow-300">LIVE PREVIEW</p>
            </div>
            <div className="w-full h-64 md:h-auto flex-grow bg-gray-800 border-2 border-t-0 border-gray-600 p-2">
                {isLoading && !isPreviewMode ? (
                    <div className="text-center text-yellow-300 flex flex-col items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-400 mx-auto"></div>
                        <p className="mt-4 text-2xl">Compiling vibes...</p>
                    </div>
                ) : (
                    <iframe
                        ref={iframeRef}
                        title="Vibe Code Preview"
                        sandbox="allow-scripts"
                        className="w-full h-full bg-gray-200"
                    />
                )}
            </div>
          </div>
        </main>
        
        {error && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl p-2 bg-red-900/80 border-2 border-red-500 text-red-200 text-center rounded">
                <p className="font-bold">Generation Failed:</p>
                <p className="text-sm">{error}</p>
            </div>
        )}

        <footer className="p-4 border-t-2 border-green-800 mt-auto flex-shrink-0">
          {isPreviewMode ? (
             <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <button onClick={() => code && handleDownload(code.html, 'index.html', 'text/html')} className="pixel-button bg-orange-600 flex items-center gap-2"><ExportIcon className="w-5 h-5"/> HTML</button>
                    <button onClick={() => code && handleDownload(code.css, 'style.css', 'text/css')} className="pixel-button bg-blue-600 flex items-center gap-2"><ExportIcon className="w-5 h-5"/> CSS</button>
                    <button onClick={() => code && handleDownload(code.javascript, 'script.js', 'application/javascript')} className="pixel-button bg-yellow-500 flex items-center gap-2"><ExportIcon className="w-5 h-5"/> JS</button>
                </div>
                <button onClick={handleCloseAndFeedback} className="pixel-button bg-gray-600">Close</button>
             </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                <div className="flex-grow flex items-center gap-2">
                  <span className="text-xl md:text-2xl text-green-400 flex-shrink-0">&gt;</span>
                  <input 
                    ref={inputRef}
                    type="text" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="a retro button that says 'Launch'"
                    className="retro-input !p-0 !border-none flex-grow text-lg"
                    disabled={isLoading || isPreviewMode || cooldown > 0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && prompt.trim() && !isLoading && cooldown === 0) {
                          e.preventDefault();
                          handleGenerate(prompt);
                        }
                      }}
                  />
                </div>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="pixel-select !w-auto bg-[#222] text-green-400 border-green-800"
                    disabled={isLoading || cooldown > 0}
                  >
                    <optgroup label="Google Gemini">
                      {GEMINI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                    </optgroup>
                    {openAiApiKey && openAIModels.length > 0 && (
                      <optgroup label="OpenAI">
                          {openAIModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </optgroup>
                    )}
                    {openRouterApiKey && openRouterModels.length > 0 && (
                      <optgroup label="OpenRouter">
                          {openRouterModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </optgroup>
                    )}
                  </select>
                <button type="submit" className="pixel-button !p-2 bg-green-700" disabled={isLoading || !prompt.trim() || cooldown > 0}>
                   {cooldown > 0 ? <span className="w-6 h-6 flex items-center justify-center">{cooldown}s</span> : <SendIcon className="w-6 h-6"/>}
                </button>
              </form>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input 
                        type="checkbox"
                        id="feedback-checkbox"
                        checked={getFeedback}
                        onChange={(e) => setGetFeedback(e.target.checked)}
                        className="w-5 h-5 accent-yellow-400"
                        disabled={isLoading || cooldown > 0}
                    />
                    <label htmlFor="feedback-checkbox" className="text-green-400 select-none">Get feedback from agents</label>
                  </div>
                  {code && (
                    <button
                      onClick={handleSave}
                      disabled={isSaved || isLoading}
                      className="pixel-button bg-purple-600"
                    >
                      {isSaved ? 'Saved ✓' : 'Save'}
                    </button>
                  )}
                </div>
                {code && (
                  <button onClick={handleCloseAndFeedback} className="pixel-button bg-blue-600">
                    Finish &amp; Close
                  </button>
                )}
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  );
};

export default VibeCodingModal;