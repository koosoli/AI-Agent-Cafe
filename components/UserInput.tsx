/*
--- HACK: Add SpeechRecognition types to Window object for browsers that support it ---

These are types for the Web Speech API
to satisfy TypeScript without needing a full `@types` package.
*/
interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}
interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

// According to MDN, the event for `onerror` is SpeechRecognitionErrorEvent,
// but some browsers might still use a generic ErrorEvent. Let's create a compatible type.
interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onresult: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => any;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: (this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any;
    start(): void;
    stop(): void;
    abort(): void;
}

// This extends the global Window interface
declare global {
  interface Window {
    SpeechRecognition?: { new(): SpeechRecognition };
    webkitSpeechRecognition?: { new(): SpeechRecognition };
  }
}
// --- END HACK ---


import React, { useState, forwardRef, useEffect, useRef, useCallback, useMemo } from 'react';
import { SendIcon, StopIcon, MicrophoneIcon, MicrophoneOffIcon } from './icons.tsx';
import { useAppStore } from '../hooks/useAppContext.ts';
import { SpeechServiceProvider, type Artifact } from '../types.ts';
import * as speechService from '../services/speechService.ts';
import { shallow } from 'zustand/shallow';

interface UserInputProps {
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export const UserInput = forwardRef<HTMLTextAreaElement, UserInputProps>(({ onSubmit, onCancel }, ref) => {
  // Granular state selection for performance. Each selector only subscribes
  // the component to the minimum state required, preventing unnecessary re-renders.
  const { isLoading, isAnyModalOpen } = useAppStore(s => ({ isLoading: s.isLoading, isAnyModalOpen: s.ui.isAnyModalOpen }), shallow);
  const isListeningForSpeech = useAppStore(s => s.ui.isListeningForSpeech);
  const setUiState = useAppStore(s => s.setUiState);
  
  const { sttProvider } = useAppStore(s => s.audio, shallow);
  const { openAiApiKey, microsoftApiKey, microsoftApiRegion } = useAppStore(s => s.services, shallow);
  
  const equippedArtifactId = useAppStore(s => s.game.equippedArtifactId);

  const proximityFlags = useAppStore(s => ({
    isNearArtEasel: s.ui.isNearArtEasel,
    isNearGroundingComputer: s.ui.isNearGroundingComputer,
    isNearVibeComputer: s.ui.isNearVibeComputer,
    isNearScreenplayTerminal: s.ui.isNearScreenplayTerminal,
    isNearModelComparisonTerminal: s.ui.isNearModelComparisonTerminal,
    isNearGameBoard: s.ui.isNearGameBoard,
  }), shallow);

  // Select only the data needed for the placeholder text to avoid re-renders on agent position changes.
  const targetAgentName = useAppStore(s => {
    const agent = s.ui.targetAgentId ? s.agents.find(a => a.id === s.ui.targetAgentId) : null;
    return agent?.name ?? null;
  });

  const equippedArtifactInfo = useAppStore(s => {
      if (!s.game.equippedArtifactId) return null;
      const artifact = s.inventory.find(art => art.id === s.game.equippedArtifactId);
      if (!artifact) return null;
      switch (artifact.type) {
          case 'image': return { type: artifact.type, name: `'${artifact.prompt.substring(0, 30)}...'` };
          case 'code': return { type: artifact.type, name: `the code for '${artifact.prompt.substring(0, 30)}...'` };
          case 'screenplay': return { type: artifact.type, name: `the screenplay '${artifact.title}'` };
          default: return null;
      }
  }, shallow);
  
  const [text, setText] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Effect to clear stale input when a modal opens
  useEffect(() => {
    if (isAnyModalOpen) {
        setText('');
        setSpeechError(null);
    }
  }, [isAnyModalOpen]);


  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechEndTimeoutRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); 
  const audioChunksRef = useRef<Blob[]>([]); 
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceDetectionFrameRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (speechError) setSpeechError(null);
  };
  
  useEffect(() => {
    if (ref && 'current' in ref && ref.current) {
        ref.current.style.height = 'auto';
        const scrollHeight = ref.current.scrollHeight;
        ref.current.style.height = `${scrollHeight}px`;
    }
  }, [text, ref]);


  const startBrowserRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
     if (!SpeechRecognition) {
        if(isMounted.current) setSpeechError('Speech Recognition is not supported in this browser.');
        if(isMounted.current) setUiState({ isListeningForSpeech: false });
        return;
    }
    if (recognitionRef.current) return;
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    let finalTranscript = '';
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!isMounted.current) return;
      if (speechEndTimeoutRef.current) clearTimeout(speechEndTimeoutRef.current);

      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript.trim() + ' ';
        else interimTranscript += event.results[i][0].transcript;
      }
      setText(finalTranscript + interimTranscript);
      
      if (event.results[event.results.length - 1].isFinal) {
          speechEndTimeoutRef.current = window.setTimeout(() => {
            if (!isMounted.current) return;
            const submissionText = finalTranscript.trim();
            if (submissionText) {
              onSubmit(submissionText);
              setText('');
              finalTranscript = '';
            }
            recognitionRef.current?.stop();
          }, 800);
      }
    };

    recognition.onend = () => {
      if (speechEndTimeoutRef.current) clearTimeout(speechEndTimeoutRef.current);
      if (recognitionRef.current === recognition) {
          if(isMounted.current) setUiState({ isListeningForSpeech: false });
          recognitionRef.current = null;
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (!isMounted.current) return;
        console.error('Speech recognition error:', event.error, event.message);
        if (event.error === 'not-allowed') setSpeechError("Microphone permission was denied. Please enable it in your browser settings.");
        else if (event.error === 'no-speech') console.log('No speech detected.');
        else if (event.error !== 'aborted') setSpeechError(`A speech recognition error occurred: ${event.error}`);
    };
    try {
      recognition.start();
    } catch (err) {
      if (!isMounted.current) return;
      console.error("Error starting speech recognition:", err);
      setUiState({ isListeningForSpeech: false });
    }
  }, [setUiState, onSubmit]);

  const startApiBasedRecordingWithSilenceDetection = useCallback(async (provider: SpeechServiceProvider.OPENAI | SpeechServiceProvider.MICROSOFT) => {
    if (mediaRecorderRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isMounted.current) { stream.getTracks().forEach(track => track.stop()); return; }
      activeStreamRef.current = stream;

      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      
      recorder.onstop = async () => {
        if (!isMounted.current) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size < 100) { if(mediaRecorderRef.current) setUiState({ isListeningForSpeech: false }); return; }

        try {
          if(isMounted.current) setText('Transcribing...');
          let transcript = '';
          if (provider === SpeechServiceProvider.OPENAI) transcript = await speechService.transcribeWithOpenAI(audioBlob, openAiApiKey);
          else if (provider === SpeechServiceProvider.MICROSOFT) transcript = await speechService.transcribeWithMicrosoft(audioBlob, microsoftApiKey, microsoftApiRegion);
          
          if (isMounted.current) {
            if (transcript.trim()) onSubmit(transcript);
            setText('');
          }
        } catch (err: any) {
          if (isMounted.current) { setSpeechError(err.message || 'Transcription failed.'); setText(''); }
        } finally {
          if (isMounted.current) setUiState({ isListeningForSpeech: false });
        }
      };

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') audioContextRef.current = new AudioContext();
      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      lastSpeechTimeRef.current = Date.now();
      
      const detectSilence = () => {
        if (!isMounted.current) return;
        analyser.getByteTimeDomainData(dataArray);
        const isSpeaking = dataArray.some(v => v !== 128);

        if (isSpeaking) lastSpeechTimeRef.current = Date.now();
        else if (Date.now() - lastSpeechTimeRef.current > 1000) { if(mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current?.stop(); return; }
        silenceDetectionFrameRef.current = requestAnimationFrame(detectSilence);
      };

      recorder.start();
      silenceDetectionFrameRef.current = requestAnimationFrame(detectSilence);

    } catch (err: any) {
      if (!isMounted.current) return;
      console.error(`Error starting ${provider} recording:`, err);
      setSpeechError(err.message || 'Could not start recording.');
      setUiState({ isListeningForSpeech: false });
    }
  }, [setUiState, onSubmit, openAiApiKey, microsoftApiKey, microsoftApiRegion]);

  useEffect(() => {
    if (isListeningForSpeech) {
      setSpeechError(null);
      setText('');
      if (sttProvider === SpeechServiceProvider.OPENAI) startApiBasedRecordingWithSilenceDetection(SpeechServiceProvider.OPENAI);
      else if (sttProvider === SpeechServiceProvider.MICROSOFT) startApiBasedRecordingWithSilenceDetection(SpeechServiceProvider.MICROSOFT);
      else startBrowserRecognition();
    } else {
      if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop();
    }
    
    return () => {
        if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; }
        if (mediaRecorderRef.current) { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); mediaRecorderRef.current = null; }
        if (activeStreamRef.current) { activeStreamRef.current.getTracks().forEach(track => track.stop()); activeStreamRef.current = null; }
        if (silenceDetectionFrameRef.current) { cancelAnimationFrame(silenceDetectionFrameRef.current); silenceDetectionFrameRef.current = null; }
        if (audioContextRef.current?.state === 'running') { audioContextRef.current.close().catch(console.error); audioContextRef.current = null; }
        if (speechEndTimeoutRef.current) clearTimeout(speechEndTimeoutRef.current);
    }
  }, [isListeningForSpeech, sttProvider, startApiBasedRecordingWithSilenceDetection, startBrowserRecognition]);


  const handleMicClick = () => {
    setUiState({ isListeningForSpeech: !isListeningForSpeech });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text);
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };
  
  const placeholderText = useMemo(() => {
    if (equippedArtifactId) {
      const artifactName = equippedArtifactInfo?.name || "your creation";
      return `Click on an agent to show them ${artifactName}`;
    }
    if (isAnyModalOpen) return 'A modal is open...';
    if (isLoading) return 'Agents are responding... (Enter to interject)';
    if (isListeningForSpeech) return 'Listening...';
    if (speechError) return speechError;
    if (proximityFlags.isNearGameBoard) return 'Interact with the board to begin your adventure...';
    if (proximityFlags.isNearArtEasel) return 'Describe an image for the easel...';
    if (proximityFlags.isNearGroundingComputer) return 'Enter a query for the Grounding Computer...';
    if (proximityFlags.isNearVibeComputer) return "Describe the 'vibe' of the component you want to create...";
    if (proximityFlags.isNearScreenplayTerminal) return "Start the screenplay by setting a scene...";
    if (proximityFlags.isNearModelComparisonTerminal) return "Enter a prompt to compare models...";
    if (targetAgentName) return `Talk to ${targetAgentName}...`;
    return 'Say something to start a discussion...';
  }, [
    equippedArtifactId, equippedArtifactInfo, isAnyModalOpen, isLoading, isListeningForSpeech, speechError,
    proximityFlags, targetAgentName
  ]);
  
  const isSttEnabled = sttProvider === SpeechServiceProvider.BROWSER || (sttProvider === SpeechServiceProvider.OPENAI && !!openAiApiKey) || (sttProvider === SpeechServiceProvider.MICROSOFT && !!microsoftApiKey && !!microsoftApiRegion);
  
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ref && 'current' in ref && ref.current) ref.current.focus();
  };

  return (
    <div className="bg-black/50 p-2 md:p-4 backdrop-blur-sm border-t-2 border-black user-input-container" onClick={handleContainerClick}>
      <div className="w-full max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 user-input-form">
            <button
                type="button" onClick={handleMicClick}
                className={`pixel-button !p-2 md:!p-3 ${isListeningForSpeech ? 'bg-red-600 animate-pulse' : 'bg-blue-600'} disabled:bg-gray-500`}
                aria-label={isListeningForSpeech ? 'Stop voice input' : 'Start voice input'} disabled={!isSttEnabled || isAnyModalOpen || !!equippedArtifactId}
                title={isSttEnabled ? (isListeningForSpeech ? 'Stop' : 'Listen') : 'Speech-to-Text disabled. Check API keys.'}
            >
                {isListeningForSpeech ? <MicrophoneOffIcon className="w-6 h-6 md:w-8 md:h-8 text-white" /> : <MicrophoneIcon className="w-6 h-6 md:w-8 md:h-8 text-white" />}
            </button>
            <textarea
                ref={ref} value={text} onChange={handleTextChange} onKeyDown={handleKeyDown} placeholder={placeholderText}
                className="pixel-input flex-grow text-lg md:text-xl resize-none" rows={1} disabled={isListeningForSpeech || isAnyModalOpen || !!equippedArtifactId}
                aria-label="Your message input"
            />
            {isLoading ? (
                 <button type="button" onClick={onCancel} className="pixel-button bg-red-600 !p-2 md:!p-3" aria-label="Stop agent responses and cancel discussion">
                    <StopIcon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </button>
            ) : (
                <button type="submit" className="pixel-button bg-green-700 !p-2 md:!p-3" disabled={!text.trim() || !!equippedArtifactId} aria-label="Send your message">
                    <SendIcon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </button>
            )}
        </form>
      </div>
    </div>
  );
});