import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { StarIcon, LinkIcon, PauseIcon, PaintBrushIcon, CodeTerminalIcon, ScrollIcon, D20Icon } from './icons.tsx';
import { useAppStore } from '../hooks/useAppContext.ts';
import type { Message, Agent, Memory } from '../types.ts';
import AgentSprite from './AgentSprite.tsx';

interface CharacterProps {
  agent: Agent;
  isUser?: boolean;
  isActive: boolean;
  isSelected: boolean;
  isTargeted: boolean;
  isParticipant: boolean;
  isThinking: boolean;
  thinkingMemories: Memory[] | null;
  message: Message | null;
  onAgentMouseDown: (e: React.MouseEvent, agentId: string) => void;
  onAgentClick: (agentId: string) => void;
  onAgentTouchStart: (e: React.TouchEvent, agentId: string) => void;
  onAgentDoubleClick: (agentId: string) => void;
}

const ActivityBubble = ({ activity }: { activity: string }) => {
    const getIcon = () => {
        switch (activity) {
            case 'painting': return <PaintBrushIcon className="w-5 h-5" />;
            case 'coding': return <CodeTerminalIcon className="w-5 h-5" />;
            case 'writing': return <ScrollIcon className="w-5 h-5" />;
            case 'dnd': return <D20Icon className="w-5 h-5" />;
            case 'research': return <span className="font-bold text-lg">?</span>;
            default: return null;
        }
    };

    return (
        <div className="absolute top-[-25px] left-1/2 -translate-x-1/2 z-20 activity-bubble-animation">
            <div className="bg-white text-black rounded-full w-8 h-8 flex items-center justify-center border-2 border-black shadow-md">
                {getIcon()}
            </div>
        </div>
    );
};

const GreetingBubble = ({ text, isSpecialSprite }: { text: string; isSpecialSprite?: boolean; }) => {
    const mockMessage: Message = {
        id: 'greeting-message',
        agentId: '', // Not used for styling
        text,
        timestamp: Date.now(),
    };
    return <SpeechBubble message={mockMessage} isSpecialSprite={isSpecialSprite} />;
};

const ChattingBubble = () => (
    <div className="absolute bottom-full mb-2 w-auto transform -translate-x-1/2 left-1/2 z-10">
        <div className="relative p-2 rounded-lg text-lg shadow-lg text-black bg-white/90 border-2 border-black/50">
            <p className="whitespace-pre-wrap break-words speech-bubble-text tracking-widest font-bold">...</p>
        </div>
    </div>
);

const SpeechBubble = ({ message, isSpecialSprite }: { message: Message; isSpecialSprite?: boolean }) => {
  const [sourcesVisible, setSourcesVisible] = React.useState(false);
  const { text, isConclusion, groundingChunks } = message;
  const hasSources = groundingChunks && groundingChunks.length > 0;

  const conclusionStyles = isConclusion ? 'border-green-500 bg-green-200' : 'border-black bg-white';
  
  // Moves the bubble down for special sprites to make it closer/overlap, and keeps it above for standard sprites.
  const yOffset = isSpecialSprite ? 'translate-y-12' : '-translate-y-4';
  const positionClass = `absolute bottom-full w-40 sm:w-64 transform -translate-x-1/2 ${yOffset} left-1/2 z-10`;

  return (
    <div className={positionClass}>
      <div className={`relative p-2 rounded-lg border-2 text-base sm:text-xl shadow-lg text-black ${conclusionStyles}`}>
        {isConclusion && <p className="font-bold text-green-700 text-center pb-1 speech-bubble-text">~ Conclusion ~</p>}
        <p className="whitespace-pre-wrap break-words speech-bubble-text">{text}</p>
        
        {hasSources && (
          <div className="mt-2 pt-2 border-t border-black/20">
            <button
              onClick={(e) => { e.stopPropagation(); setSourcesVisible(!sourcesVisible); }}
              className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
            >
              <LinkIcon className="w-4 h-4" />
              {sourcesVisible ? 'Hide Sources' : 'Show Sources'}
            </button>
            {sourcesVisible && (
              <ul className="mt-1 space-y-1 text-xs list-disc list-inside">
                {groundingChunks.map((chunk, index) => (
                  <li key={index}>
                    <a
                      href={chunk.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {chunk.title || chunk.uri}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div 
          className="absolute left-1/2 top-full -translate-x-1/2"
          style={{
            width: 0, height: 0,
            borderTop: `10px solid ${isConclusion ? '#22c55e' : 'black'}`,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
          }}
        />
        <div 
           className="absolute left-1/2 top-full -translate-x-1/2"
           style={{
             marginTop: '-2px',
             borderTop: `10px solid ${isConclusion ? '#86efac' : 'white'}`,
             borderLeft: '10px solid transparent',
             borderRight: '10px solid transparent',
           }}
        />
      </div>
    </div>
  );
};

const ThinkingBubbles = ({ memories }: { memories: Memory[] }) => {
  if (!memories || memories.length === 0) return null;

  // Take up to 5 memories to display
  const memoriesToShow = memories.slice(0, 5);

  const getPositionStyle = (index: number, total: number): React.CSSProperties => {
    const angle = (index / total) * Math.PI * 2 + Math.PI / 4; // Staggered circle
    const radius = 60; // pixels
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius - 20;
    return {
      top: `calc(50% + ${y}px)`,
      left: `calc(50% + ${x}px)`,
      transform: 'translate(-50%, -50%)',
      '--delay': `${index * 0.15}s`,
    } as React.CSSProperties;
  };

  return (
    <div className="absolute inset-0">
      {memoriesToShow.map((mem, index) => (
        <div
          key={mem.id}
          className="thinking-bubble-animation"
          style={getPositionStyle(index, memoriesToShow.length)}
          title={mem.description}
        >
          {mem.description}
        </div>
      ))}
    </div>
  );
};


const Character = ({ agent, isUser = false, isActive, isSelected, isTargeted, isParticipant, isThinking, thinkingMemories, message, onAgentMouseDown, onAgentClick, onAgentTouchStart, onAgentDoubleClick }: CharacterProps) => {
  const isInspectorMode = useAppStore(s => s.ui.isInspectorMode);
  const setAgentGreeting = useAppStore(s => s.setAgentGreeting);
  
  const { id: agentId, name, spriteSeed, isModerator, isWaiting, isChatting, hasNewInsight, isUsingObject, greeting, isSpecialSprite } = agent;
  const isFollowing = !isUser && !!agent.followingAgentId;

  // Effect to handle clearing greeting text after a delay
  useEffect(() => {
    if (!greeting) return;

    const GREETING_DURATION = 2000;
    const timeElapsed = Date.now() - greeting.timestamp;
    const timeRemaining = GREETING_DURATION - timeElapsed;

    if (timeRemaining <= 0) {
        setAgentGreeting(agent.id, null);
    } else {
        const timerId = setTimeout(() => {
            const currentAgentInState = useAppStore.getState().agents.find(a => a.id === agent.id);
            if (currentAgentInState?.greeting?.timestamp === greeting.timestamp) {
                setAgentGreeting(agent.id, null);
            }
        }, timeRemaining);
        return () => clearTimeout(timerId);
    }
  }, [greeting, agent.id, setAgentGreeting]);

  const showGreeting = !!greeting;
  const bobbingAnimationClass = (isActive || isChatting || showGreeting) && 'talking-animation';

  const mainDivClass = isSpecialSprite ? 'w-40 h-44' : 'w-20 h-24';
  const spriteDivClass = isSpecialSprite ? 'w-40 h-40' : 'w-20 h-20';

  const spriteContainerClasses = useMemo(() => [
      'relative', 'transition-transform', 'duration-300', spriteDivClass, 'character-sprite',
      bobbingAnimationClass, isParticipant && 'is-participant', isTargeted && 'is-targeted',
      isInspectorMode && 'is-inspector', isThinking && 'is-thinking', isSelected && 'is-selected',
  ].filter(Boolean).join(' '), [
      spriteDivClass, bobbingAnimationClass, isParticipant, isTargeted, isInspectorMode, isThinking, isSelected
  ]);
  
  const specialSpriteNameTagStyle: React.CSSProperties = {
      maxWidth: '90%',
      transform: 'translateY(-40px)',
      position: 'relative'
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onAgentMouseDown(e, agentId);
  }, [onAgentMouseDown, agentId]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    onAgentTouchStart(e, agentId);
  }, [onAgentTouchStart, agentId]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isUser) onAgentClick(agentId);
  }, [onAgentClick, agentId, isUser]);
  
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAgentDoubleClick(agentId);
  }, [onAgentDoubleClick, agentId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isUser) onAgentClick(agentId);
    }
  }, [onAgentClick, agentId, isUser]);

  return (
    <div 
      className={`relative ${mainDivClass} flex flex-col items-center justify-end ${isInspectorMode ? 'cursor-help' : 'cursor-grab'} focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-black/50 rounded-md`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      role="button"
      aria-label={`${name}. ${isActive ? `Saying: ${message?.text}` : (isSelected ? 'Selected.' : 'Click to select, double click to edit.')}`}
      tabIndex={0}
    >
        {hasNewInsight && (
            <div className="absolute top-[-25px] left-1/2 -translate-x-1/2 insight-animation z-20">
                <span className="text-2xl" style={{ textShadow: '0 0 5px rgba(255,255,0,0.8)' }}>💡</span>
            </div>
        )}
        {isUsingObject && agent.currentTask?.type === 'use_object' && (
            <ActivityBubble activity={agent.currentTask.activity} />
        )}
      <div className={spriteContainerClasses}>
        <AgentSprite spriteSeed={spriteSeed} name={name} className="w-full h-full object-contain" />
        {isActive && message && <SpeechBubble message={message} isSpecialSprite={isSpecialSprite} />}
        {showGreeting && <GreetingBubble text={greeting.text} isSpecialSprite={isSpecialSprite} />}
        {isChatting && !isActive && <ChattingBubble />}
        {isThinking && thinkingMemories && <ThinkingBubbles memories={thinkingMemories} />}
      </div>
      <div
        className="bg-black/50 text-white text-lg px-2 rounded flex items-center justify-center gap-1 w-max mt-1"
        style={isSpecialSprite ? specialSpriteNameTagStyle : {}}
      >
        {isWaiting && <PauseIcon className="w-4 h-4 text-yellow-400" />}
        {!isWaiting && isFollowing && <LinkIcon className="w-4 h-4 text-cyan-400" />}
        {isModerator && <StarIcon className="w-4 h-4 text-yellow-400" filled={true} />}
        {name}
      </div>
      {isUser && (
        <div className="absolute top-[-20px] left-1/2 -translate-x-1/2">
            <svg width="30" height="30" viewBox="0 0 100 100">
                <polygon points="50,100 0,0 100,0" fill="#00ff00" stroke="black" strokeWidth="5"/>
            </svg>
        </div>
      )}
    </div>
  );
};

export default React.memo(Character);