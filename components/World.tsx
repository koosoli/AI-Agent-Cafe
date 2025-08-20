import React, { useCallback } from 'react';
import type { Agent, Message, DojoBelt, WorldImageArtifact, Memory } from '../types.ts';
import Character from './Character.tsx';
import Scenery from './Scenery.tsx';
import { USER_AGENT } from '../constants.ts';
import { ADD_AGENT_LOCATIONS, INTERACTIVE_OBJECTS } from '../data/layout.ts';
import { PlusIcon } from './icons.tsx';

interface WorldProps {
  agents: Agent[];
  currentSubtitle: Message | null;
  selectedAgentId: string | null;
  targetAgentId: string | null;
  participantIds: string[];
  thinkingAgentId: string | null;
  thinkingMemories: Memory[] | null;
  viewport: { scale: number; offset: { x: number; y: number } };
  playerRoomId: string | undefined;
  displayedImageUrl: string | null;
  worldArtifacts: WorldImageArtifact[];
  moveTarget: { x: number; y: number } | null;
  agentElementRefs: React.RefObject<Map<string, HTMLDivElement | null>>;
  onViewportChange: (e: React.WheelEvent | React.TouchEvent, isManual: boolean, scaleMultiplier?: number) => void;
  onDragStart: (e: React.MouseEvent, agentId?: string) => void;
  onAgentClick: (agentId: string) => void;
  onAgentDoubleClick: (agentId: string) => void;
  onAddAgentClick: (spawnPos: { top: number, left: number, roomId: string }) => void;
  onArtEaselClick: () => void;
  onGroundingComputerClick: () => void;
  onVibeComputerClick: () => void;
  onScreenplayTerminalClick: () => void;
  onModelComparisonTerminalClick: () => void;
  onGameBoardClick: () => void;
  onWorldTouchStart: (e: React.TouchEvent) => void;
  onAgentTouchStart: (e: React.TouchEvent, agentId: string) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onWorldArtifactClick: (artifact: WorldImageArtifact) => void;
  proximityFlags: {
    isNearArtEasel: boolean;
    isNearGroundingComputer: boolean;
    isNearVibeComputer: boolean;
    isNearScreenplayTerminal: boolean;
    isNearModelComparisonTerminal: boolean;
    isNearGameBoard: boolean;
  };
}

const InteractionLabel = ({ text, x, y }: { text: string; x: number; y: number }) => (
    <div
      className="absolute bg-black/70 text-white text-base px-3 py-1 border-2 border-black pointer-events-none z-[1000] activity-bubble-animation"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -120%)',
        textShadow: '1px 1px #000',
        boxShadow: '2px 2px 0px black'
      }}
    >
      {text}
    </div>
);

const MoveTargetIndicator = ({ x, y }: { x: number; y: number }) => (
  <div
    className="absolute pointer-events-none"
    style={{
      left: x,
      top: y,
      transform: 'translate(-50%, -50%)',
      zIndex: 999,
    }}
  >
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-yellow-300 move-target-indicator-ring"></div>
      <div className="absolute inset-2 rounded-full border-2 border-yellow-300 opacity-75"></div>
    </div>
  </div>
);

const World = React.forwardRef<HTMLDivElement, WorldProps>(({ agents, currentSubtitle, selectedAgentId, targetAgentId, participantIds, thinkingAgentId, thinkingMemories, viewport, playerRoomId, displayedImageUrl, worldArtifacts, moveTarget, agentElementRefs, onViewportChange, onDragStart, onAgentClick, onAgentDoubleClick, onAddAgentClick, onArtEaselClick, onGroundingComputerClick, onVibeComputerClick, onScreenplayTerminalClick, onModelComparisonTerminalClick, onGameBoardClick, onWorldTouchStart, onAgentTouchStart, onTouchMove, onTouchEnd, onWorldArtifactClick, proximityFlags }, ref) => {
  const activeAgentId = currentSubtitle?.agentId || null;
  
  const handleBackgroundClick = useCallback(() => onAgentClick(''), [onAgentClick]);

  return (
    <div 
        ref={ref}
        className="relative w-full h-full max-w-7xl mx-auto border-4 border-black shadow-[8px_8px_0px_black] overflow-hidden cursor-move outline-none world-container"
        style={{ backgroundColor: playerRoomId && playerRoomId !== 'outside' ? '#0c142c' : '#1f2937' }}
        onWheel={(e) => onViewportChange(e, true)}
        onMouseDown={(e) => onDragStart(e)}
        onTouchStart={onWorldTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleBackgroundClick} // Click on background deselects
        tabIndex={-1} // Make it focusable
    >
      <div 
        className="absolute"
        style={{ 
            transform: `scale(${viewport.scale}) translate(${viewport.offset.x}px, ${viewport.offset.y}px)`,
            transformOrigin: 'top left',
        }}
      >
        <div className="relative" style={{width: 5000, height: 3000}}>
            <Scenery 
              playerRoomId={playerRoomId} 
              onArtEaselClick={onArtEaselClick} 
              onGroundingComputerClick={onGroundingComputerClick}
              onVibeComputerClick={onVibeComputerClick}
              onScreenplayTerminalClick={onScreenplayTerminalClick}
              onModelComparisonTerminalClick={onModelComparisonTerminalClick}
              onGameBoardClick={onGameBoardClick}
              displayedImageUrl={displayedImageUrl}
              worldArtifacts={worldArtifacts}
              onWorldArtifactClick={onWorldArtifactClick}
            />
            {moveTarget && <MoveTargetIndicator x={moveTarget.x} y={moveTarget.y} />}

            {/* Render Interaction Labels */}
            {proximityFlags.isNearArtEasel && <InteractionLabel text={INTERACTIVE_OBJECTS.PLAYER_EASEL.name} x={INTERACTIVE_OBJECTS.PLAYER_EASEL.left + INTERACTIVE_OBJECTS.PLAYER_EASEL.width / 2} y={INTERACTIVE_OBJECTS.PLAYER_EASEL.top} />}
            {proximityFlags.isNearGroundingComputer && <InteractionLabel text={INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.name} x={INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.left + INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.width / 2} y={INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.top} />}
            {proximityFlags.isNearVibeComputer && <InteractionLabel text={INTERACTIVE_OBJECTS.VIBE_COMPUTER.name} x={INTERACTIVE_OBJECTS.VIBE_COMPUTER.left + INTERACTIVE_OBJECTS.VIBE_COMPUTER.width / 2} y={INTERACTIVE_OBJECTS.VIBE_COMPUTER.top} />}
            {proximityFlags.isNearScreenplayTerminal && <InteractionLabel text={INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.name} x={INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.left + INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.width / 2} y={INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.top} />}
            {proximityFlags.isNearModelComparisonTerminal && <InteractionLabel text={INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.name} x={INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.left + INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.width / 2} y={INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.top} />}
            {proximityFlags.isNearGameBoard && <InteractionLabel text={INTERACTIVE_OBJECTS.GAME_BOARD.name} x={INTERACTIVE_OBJECTS.GAME_BOARD.left + INTERACTIVE_OBJECTS.GAME_BOARD.width / 2} y={INTERACTIVE_OBJECTS.GAME_BOARD.top} />}

            {/* Render Add Agent buttons */}
            {playerRoomId && ADD_AGENT_LOCATIONS[playerRoomId] && (
                <div
                    className="absolute w-12 h-12 bg-green-600 rounded-full flex items-center justify-center cursor-pointer border-2 border-black shadow-lg pulsing-plus"
                    style={{
                        top: ADD_AGENT_LOCATIONS[playerRoomId].top,
                        left: ADD_AGENT_LOCATIONS[playerRoomId].left,
                        zIndex: 990,
                        pointerEvents: 'all'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddAgentClick(ADD_AGENT_LOCATIONS[playerRoomId]);
                    }}
                >
                    <PlusIcon className="w-8 h-8 text-white"/>
                </div>
            )}
            {agents.map(agent => {
                const isActive = activeAgentId === agent.id;
                const isThinking = agent.id === thinkingAgentId;
                return (
                    <div 
                        key={agent.id} 
                        ref={el => { agentElementRefs.current?.set(agent.id, el); }}
                        className="absolute" style={{
                            top: 0,
                            left: 0,
                            zIndex: Math.floor(agent.position.top / 10) + (isActive ? 1000 : 10),
                            transform: `translate(${agent.position.left}px, ${agent.position.top}px)`
                    }}>
                        <div style={{ transform: 'translate(-50%, -100%)' }}>
                            <Character
                                agent={agent}
                                isUser={agent.id === USER_AGENT.id}
                                isActive={isActive}
                                isSelected={selectedAgentId === agent.id}
                                isTargeted={targetAgentId === agent.id}
                                isParticipant={participantIds.includes(agent.id)}
                                isThinking={isThinking}
                                thinkingMemories={isThinking ? thinkingMemories : null}
                                message={isActive ? currentSubtitle : null}
                                onAgentMouseDown={onDragStart}
                                onAgentTouchStart={onAgentTouchStart}
                                onAgentClick={onAgentClick}
                                onAgentDoubleClick={onAgentDoubleClick}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  );
});

export default React.memo(World);