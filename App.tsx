import React, { useState, useEffect, useRef, useCallback } from 'react';
import Room from './components/Room';
import UserInput from './components/UserInput';
import SettingsModal from './components/SettingsModal';
import ChatLogModal from './components/ChatLogModal';
import WelcomeModal from './components/WelcomeModal';
import { SettingsIcon, LogIcon } from './components/icons';
import { useConversationManager } from './hooks/useConversationManager';
import { DEFAULT_AGENTS, USER_AGENT, AI_CAFE_SCENARIO_PROMPT } from './constants';
import type { Agent, Scenario, AgentMoveAction } from './types';
import { ScenarioType } from './types';
import * as audioService from './services/audioService';
import { isPositionValid } from './services/collisionService';
import { usePlayerMovement } from './hooks/usePlayerMovement';

function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [scenario, setScenario] = useState<Scenario>({ type: ScenarioType.CAFE, prompt: AI_CAFE_SCENARIO_PROMPT, movementEnabled: true });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(true);
  const [isAutoPanEnabled, setIsAutoPanEnabled] = useState(true);

  // Audio State
  const [musicMuted, setMusicMuted] = useState(() => JSON.parse(localStorage.getItem('musicMuted') || 'false'));
  const [sfxMuted, setSfxMuted] = useState(() => JSON.parse(localStorage.getItem('sfxMuted') || 'false'));
  const [musicVolume, setMusicVolume] = useState(() => JSON.parse(localStorage.getItem('musicVolume') || '0.3'));
  const [sfxVolume, setSfxVolume] = useState(() => JSON.parse(localStorage.getItem('sfxVolume') || '1.0'));
  const [currentTrack, setCurrentTrack] = useState(() => {
    const savedTrack = localStorage.getItem('currentTrack');
    const validTracks = Object.values(audioService.MUSIC_TRACKS);
    if (savedTrack && validTracks.includes(savedTrack)) {
        return savedTrack;
    }
    // Default to the first available track that is not 'None'
    return validTracks.find(t => t) || '';
  });
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    const initialAgents = [USER_AGENT, ...JSON.parse(JSON.stringify(DEFAULT_AGENTS))];
    setAgents(initialAgents);
  }, []);

  const handleWelcomeClose = useCallback(async () => {
    setIsWelcomeModalOpen(false);
    if (!audioReady) {
      try {
        await audioService.warmupAudio();
        setAudioReady(true);
      } catch (error) {
        console.error("Audio warmup failed:", error);
      }
    }
  }, [audioReady]);
  
  // --- Audio Effects ---
  useEffect(() => {
    localStorage.setItem('musicMuted', JSON.stringify(musicMuted));
    audioService.setMusicMuted(musicMuted);
  }, [musicMuted]);

  useEffect(() => {
    localStorage.setItem('sfxMuted', JSON.stringify(sfxMuted));
    audioService.setSfxMuted(sfxMuted);
  }, [sfxMuted]);

  useEffect(() => {
    localStorage.setItem('musicVolume', JSON.stringify(musicVolume));
    audioService.setMusicVolume(musicVolume);
  }, [musicVolume]);

  useEffect(() => {
    localStorage.setItem('sfxVolume', JSON.stringify(sfxVolume));
    audioService.setSfxVolume(sfxVolume);
  }, [sfxVolume]);

  useEffect(() => {
    localStorage.setItem('currentTrack', currentTrack);
    // Play music only when audio is ready and settings are closed
    if (audioReady && !isSettingsOpen) {
        audioService.playMusic(currentTrack);
    }
  }, [currentTrack, isSettingsOpen, audioReady]);

  useEffect(() => {
      if (isSettingsOpen) {
          audioService.playMenuMusic();
      } else {
          audioService.stopMenuMusic();
      }
  }, [isSettingsOpen]);


  const handleAgentMove = useCallback((agentId: string, newPos: {left: number, top: number}) => {
    if (!isPositionValid(newPos.left, newPos.top)) {
      return false;
    }
    setAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, position: newPos } : agent
      )
    );
    return true;
  }, []);

  const onAgentMove = useCallback((agentId: string, action: AgentMoveAction) => {
    const agentToMove = agents.find(agent => agent.id === agentId);
    if (!agentToMove) return;

    const newPos = { ...agentToMove.position };
    const distance = Math.min(Math.max(action.distance, 10), 100);
    switch (action.direction) {
      case 'up': newPos.top -= distance; break;
      case 'down': newPos.top += distance; break;
      case 'left': newPos.left -= distance; break;
      case 'right': newPos.left += distance; break;
    }
    if (handleAgentMove(agentId, newPos)) {
      audioService.playAiWalkSound();
    }
  }, [agents, handleAgentMove]);

  const { messages, isLoading, currentSubtitle, startDiscussion, cancelDiscussion } = useConversationManager({
    agents,
    scenario,
    onAgentMove,
  });
  
  const [viewport, setViewport] = useState({ scale: 0.8, offset: { x: 0, y: 0 } });
  const [dragState, setDragState] = useState<{ type: 'pan' | 'agent'; id?: string; start: { x: number; y: number }, initialOffset?: {x:number, y:number}, initialPos?: {top:number, left:number} } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const onPlayerMoved = useCallback(() => {
    setIsAutoPanEnabled(true);
  }, []);

  usePlayerMovement(setAgents, onPlayerMoved);

  const player = agents.find(a => a.id === USER_AGENT.id);
  const playerPosition = player?.position;

  useEffect(() => {
    if (!isAutoPanEnabled || !playerPosition || !viewportRef.current) {
      return;
    }

    const viewportWidth = viewportRef.current.offsetWidth;
    const viewportHeight = viewportRef.current.offsetHeight;

    const targetOffsetX = (viewportWidth / 2 / viewport.scale) - playerPosition.left;
    const targetOffsetY = (viewportHeight / 2 / viewport.scale) - playerPosition.top;
    
    setViewport(v => ({
        ...v,
        offset: {
            x: targetOffsetX,
            y: targetOffsetY,
        }
    }));

  }, [isAutoPanEnabled, playerPosition?.left, playerPosition?.top, viewport.scale]);


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!dragState) return;

        const dx = (e.clientX - dragState.start.x) / viewport.scale;
        const dy = (e.clientY - dragState.start.y) / viewport.scale;

        if (dragState.type === 'pan' && dragState.initialOffset) {
            setViewport(v => ({ ...v, offset: { x: dragState.initialOffset!.x + dx, y: dragState.initialOffset!.y + dy } }));
        } else if (dragState.type === 'agent' && dragState.id && dragState.initialPos) {
            handleAgentMove(dragState.id, {
                left: dragState.initialPos.left + dx,
                top: dragState.initialPos.top + dy,
            });
        }
    };
    const handleMouseUp = () => setDragState(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, viewport.scale, handleAgentMove]);

  useEffect(() => {
    if (currentSubtitle) {
      audioService.playMessageSound();
    }
  }, [currentSubtitle]);

  const handleDragStart = (e: React.MouseEvent, agentId?: string) => {
      e.preventDefault();
      e.stopPropagation();
      const agent = agents.find(a => a.id === agentId);
      if (agentId && agent && agent.id !== USER_AGENT.id) {
          setDragState({ type: 'agent', id: agentId, start: { x: e.clientX, y: e.clientY }, initialPos: agent.position });
      } else if (!agentId) {
          setIsAutoPanEnabled(false);
          setDragState({ type: 'pan', start: { x: e.clientX, y: e.clientY }, initialOffset: viewport.offset });
      }
  };

  const handleViewportChange = (e: React.WheelEvent, type: 'wheel' | 'pan') => {
    if (type === 'wheel') {
        if (!viewportRef.current) return;
        e.preventDefault();
        const rect = viewportRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const oldScale = viewport.scale;
        const scaleDelta = e.deltaY * -0.001;
        const newScale = Math.min(Math.max(0.5, oldScale + scaleDelta), 2);
        if (newScale === oldScale) return;
        const worldX = (mouseX / oldScale) - viewport.offset.x;
        const worldY = (mouseY / oldScale) - viewport.offset.y;
        const newOffsetX = (mouseX / newScale) - worldX;
        const newOffsetY = (mouseY / newScale) - worldY;
        setViewport({ scale: newScale, offset: { x: newOffsetX, y: newOffsetY } });
    }
  };

  const handleSaveSettings = (data: { agents: Agent[]; scenario: Scenario }) => {
    setAgents(data.agents);
    setScenario(data.scenario);
  };
  
  const handleStartDiscussion = (prompt: string) => {
    if (isLoading) {
      cancelDiscussion();
    }
    startDiscussion(prompt);
  };

  return (
    <div className="min-h-screen text-white flex flex-col items-center p-4 overflow-hidden">
      <WelcomeModal isOpen={isWelcomeModalOpen} onClose={handleWelcomeClose} />

      <header className="w-full max-w-7xl mx-auto flex justify-between items-center mb-4 z-10">
        <h1 className="text-5xl text-yellow-200 tracking-wider">AI Agent Cafe</h1>
        <div className="flex items-center gap-4">
            <button onClick={() => setIsLogOpen(true)} className="pixel-button !p-3" aria-label="View chat log">
              <LogIcon className="w-8 h-8 text-white" />
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="pixel-button !p-3" aria-label="Open settings">
              <SettingsIcon className="w-8 h-8 text-white" />
            </button>
        </div>
      </header>

      <main className="w-full flex-grow flex items-center justify-center">
        <Room 
          ref={viewportRef}
          agents={agents} 
          currentSubtitle={currentSubtitle}
          viewport={viewport}
          onViewportChange={handleViewportChange}
          onDragStart={handleDragStart}
        />
      </main>

      <footer className="w-full mt-4 z-10">
        <UserInput onSubmit={handleStartDiscussion} isLoading={isLoading} />
      </footer>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        agents={agents}
        scenario={scenario}
        onSave={handleSaveSettings}
        musicMuted={musicMuted}
        onMusicMuteChange={setMusicMuted}
        sfxMuted={sfxMuted}
        onSfxMuteChange={setSfxMuted}
        currentTrack={currentTrack}
        onTrackChange={setCurrentTrack}
        musicVolume={musicVolume}
        onMusicVolumeChange={setMusicVolume}
        sfxVolume={sfxVolume}
        onSfxVolumeChange={setSfxVolume}
      />
      <ChatLogModal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        messages={messages}
        agents={agents}
      />
    </div>
  );
}

export default App;