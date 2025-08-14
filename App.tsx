import React, { useRef, useCallback, useEffect, useState } from 'react';
import Layout from './components/Layout.tsx';
import Overlays from './components/Overlays.tsx';
import Modals from './components/Modals.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { useAppStore } from './hooks/useAppContext.ts';
import { useAutoSave } from './hooks/useAutoSave.ts';
import { shallow } from 'zustand/shallow';
import * as speechService from './services/speechService.ts';

function App() {
  const { equippedArtifactId } = useAppStore(s => ({
    equippedArtifactId: s.game.equippedArtifactId,
  }), shallow);
  
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const { setAudioState, hydrateState } = useAppStore.getState();
  const viewportRef = useRef<HTMLDivElement>(null);

  // --- Activate Auto-Save ---
  useAutoSave();

  // --- State Hydration ---
  useEffect(() => {
    hydrateState();
  }, [hydrateState]);
  
  // Effect to handle virtual keyboard on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const { height } = window.visualViewport;
        const bottomOffset = window.innerHeight - height;
        // Add a threshold to avoid minor fluctuations triggering the layout shift
        setKeyboardHeight(bottomOffset > 100 ? bottomOffset : 0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => {
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleResize);
        }
      };
    }
  }, []);

  const focusViewport = useCallback(() => {
    if (viewportRef.current && document.activeElement !== viewportRef.current) {
      viewportRef.current.focus();
    }
  }, []);

  // Set the real focus function into the global store once the ref is available.
  useEffect(() => {
    useAppStore.setState({ focusViewport });
    
    // Initialize audio on first user interaction
    const initAudio = () => {
      setAudioState({ ready: true });
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('keydown', initAudio);

    // Initialize speech synthesis service to load voices
    speechService.init();
    
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
  }, [focusViewport, setAudioState]);

  return (
    <div
      className={`h-[100dvh] w-screen text-white flex flex-col transition-all duration-200 ease-out ${equippedArtifactId ? 'is-targeting-item' : ''}`}
      style={{ paddingBottom: keyboardHeight }}
      onClick={focusViewport}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Overlays />
      <ErrorBoundary>
        <Layout ref={viewportRef} />
      </ErrorBoundary>
      <Modals />
    </div>
  );
}

export default App;