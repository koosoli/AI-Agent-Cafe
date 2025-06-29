import React from 'react';
import type { Agent, Message } from '../types';
import Character from './Character';
import { USER_AGENT } from '../constants';

interface RoomProps {
  agents: Agent[];
  currentSubtitle: Message | null;
  viewport: { scale: number; offset: { x: number; y: number } };
  onViewportChange: (e: React.WheelEvent | React.MouseEvent, type: 'wheel' | 'pan') => void;
  onDragStart: (e: React.MouseEvent, agentId?: string) => void;
}

const Scenery = () => (
    <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
        {/* Floor */}
        <div className="absolute bg-[#7a5e48] bg-[linear-gradient(to_right,#00000010_2px,transparent_2px),linear-gradient(to_bottom,#00000010_2px,transparent_2px)] bg-[size:32px_32px]" style={{top: 0, left: 0, width: '100%', height: 600}}></div>
        
        {/* OUTSIDE AREA */}
        <div className="absolute bg-gray-500" style={{top: 600, left: 0, width: '100%', height: 80}}></div>
        <div className="absolute bg-green-700" style={{top: 680, left: 0, width: '100%', height: 520}}></div>


        {/* Walls */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-[#3d2516]"></div>
        <div className="absolute top-0 left-0 w-8 bg-[#3d2516]" style={{height: 600}}></div>
        <div className="absolute top-0 right-0 w-8 bg-[#3d2516]" style={{height: 600}}></div>
        
        {/* Bottom wall with door */}
        <div className="absolute left-0 bg-[#3d2516]" style={{top: 570, height: 30, width: 'calc(50% - 50px)'}}></div>
        <div className="absolute right-0 bg-[#3d2516]" style={{top: 570, height: 30, width: 'calc(50% - 50px)'}}></div>


        {/* Counter */}
        <div className="absolute bg-[#c2c2c2] border-t-8 border-gray-500" style={{ top: 120, left: 150, width: 600, height: 60, zIndex: 0}}></div>
        <div className="absolute bg-[#a1a1a1]" style={{ top: 180, left: 150, width: 600, height: 30, zIndex: 2 }}></div>

        {/* Fridge */}
        <div className="absolute bg-gray-300 border-2 border-gray-400" style={{ top: 40, left: 50, width: 80, height: 120, zIndex: 0}}>
             <div className="absolute bg-gray-500 h-full w-1 top-0 left-1/2 -translate-x-1/2"></div>
        </div>
        
        {/* Tables & Chairs */}
        <div className="absolute bg-[#8B4513] border-2 border-[#65330f]" style={{ top: 320, left: 180, width: 120, height: 80, zIndex: 0}}></div>
        <div className="absolute bg-[#a0522d] border-2 border-[#65330f] rounded-t-md" style={{ top: 320, left: 140, width: 32, height: 40, zIndex: 0}}></div>
        <div className="absolute bg-[#a0522d] border-2 border-[#65330f] rounded-t-md" style={{ top: 360, left: 140, width: 32, height: 40, zIndex: 1}}></div>
        <div className="absolute bg-[#a0522d] border-2 border-[#65330f] rounded-t-md" style={{ top: 320, left: 308, width: 32, height: 40, zIndex: 0}}></div>
        <div className="absolute bg-[#a0522d] border-2 border-[#65330f] rounded-t-md" style={{ top: 360, left: 308, width: 32, height: 40, zIndex: 1}}></div>
        
        <div className="absolute bg-[#8B4513] border-2 border-[#65330f]" style={{ top: 280, left: 500, width: 100, height: 100, zIndex: 0}}></div>
        <div className="absolute bg-[#d2691e] border-2 border-[#65330f] rounded-t-md" style={{ top: 250, left: 480, width: 40, height: 40, zIndex: 0}}></div>
        <div className="absolute bg-[#d2691e] border-2 border-[#65330f] rounded-t-md" style={{ top: 330, left: 480, width: 40, height: 40, zIndex: 0}}></div>
        <div className="absolute bg-[#d2691e] border-2 border-[#65330f] rounded-t-md" style={{ top: 250, left: 580, width: 40, height: 40, zIndex: 0}}></div>
        <div className="absolute bg-[#d2691e] border-2 border-[#65330f] rounded-t-md" style={{ top: 330, left: 580, width: 40, height: 40, zIndex: 0}}></div>
        
        <div className="absolute bg-[#4a2e1d] border-2 border-[#3d2516] rounded-t-lg" style={{ top: 380, left: 720, width: 120, height: 80, zIndex: 0}}></div>
        <div className="absolute bg-[#2f1d12] border-2 border-[#3d2516]" style={{ top: 400, left: 700, width: 30, height: 40, zIndex: 0}}></div>
    </div>
);


const Room = React.forwardRef<HTMLDivElement, RoomProps>(({ agents, currentSubtitle, viewport, onViewportChange, onDragStart }, ref) => {
  const activeAgentId = currentSubtitle?.agentId || null;

  return (
    <div 
        ref={ref}
        className="relative w-full h-[70vh] max-w-7xl mx-auto border-4 border-black shadow-[8px_8px_0px_black] overflow-hidden cursor-move bg-gray-800"
        onWheel={(e) => onViewportChange(e, 'wheel')}
        onMouseDown={(e) => onDragStart(e)}
    >
      <div 
        className="absolute"
        style={{ 
            transform: `scale(${viewport.scale}) translate(${viewport.offset.x}px, ${viewport.offset.y}px)`,
            transformOrigin: 'top left',
        }}
      >
        <div className="relative" style={{width: 1024, height: 1200}}>
            <Scenery />
            {agents.map(agent => (
                <div key={agent.id} className="absolute transition-all duration-500" style={{
                    top: agent.position.top,
                    left: agent.position.left,
                    zIndex: Math.floor(agent.position.top / 10) + (activeAgentId === agent.id ? 1000 : 10),
                    transform: 'translate(-50%, -50%)'
                }}>
                    <Character
                        name={agent.name}
                        spriteSeed={agent.spriteSeed}
                        isUser={agent.id === USER_AGENT.id}
                        isActive={activeAgentId === agent.id}
                        messageText={activeAgentId === agent.id ? currentSubtitle?.text || null : null}
                        isConclusion={activeAgentId === agent.id ? currentSubtitle?.isConclusion : false}
                        onMouseDown={(e) => onDragStart(e, agent.id)}
                    />
                </div>
            ))}
        </div>
      </div>
    </div>
  );
});

export default Room;
