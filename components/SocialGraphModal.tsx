import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useAppStore } from '../hooks/useAppContext.ts';
import { CloseIcon } from './icons.tsx';
import AgentSprite from './AgentSprite.tsx';
import { USER_AGENT } from '../constants.ts';
import { shallow } from 'zustand/shallow';

interface SocialGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Viewport = { scale: number; offset: { x: number; y: number } };
type DragState = {
  type: 'pan' | 'node';
  id?: string;
  start: { x: number; y: number };
  initialOffset?: { x: number; y: number };
  initialPos?: { x: number; y: number };
  didMove: boolean;
} | null;


const SocialGraphModal = ({ isOpen, onClose }: SocialGraphModalProps) => {
  const agents = useAppStore(s => s.agents, shallow);
  const svgRef = useRef<SVGSVGElement>(null);

  const [viewport, setViewport] = useState<Viewport>({ scale: 1, offset: { x: 0, y: 0 } });
  const [targetViewport, setTargetViewport] = useState<Viewport>({ scale: 1, offset: { x: 0, y: 0 } });
  const targetViewportRef = useRef(targetViewport);
  targetViewportRef.current = targetViewport;

  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const panMomentumRef = useRef({ vx: 0, vy: 0, lastTime: 0, lastPos: { x: 0, y: 0 } });
  const touchStateRef = useRef<{
    isPinch: boolean;
    initialPinchDist: number;
    initialScale: number;
    pivotWorldPoint: { x: number; y: number } | null;
  } | null>(null);

  const allNodes = useMemo(() => {
    const aiAgents = agents.filter(a => !a.isAnimal && !a.isLocked);
    if (!aiAgents.find(a => a.id === USER_AGENT.id)) {
        return [...aiAgents, USER_AGENT];
    }
    return aiAgents;
  }, [agents]);

  const aiAgents = useMemo(() => allNodes.filter(a => a.id !== USER_AGENT.id), [allNodes]);
  
  const graphBounds = useMemo(() => {
    const nodes = Object.values(nodePositions);
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    const minX = Math.min(...nodes.map(p => p.x));
    const maxX = Math.max(...nodes.map(p => p.x));
    const minY = Math.min(...nodes.map(p => p.y));
    const maxY = Math.max(...nodes.map(p => p.y));
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }, [nodePositions]);

  const clampViewport = useCallback((vp: Viewport): Viewport => {
    if (!svgRef.current || graphBounds.width === 0) return vp;
    const { width: svgWidth, height: svgHeight } = svgRef.current.getBoundingClientRect();
    const { scale, offset } = vp;
    const PADDING = 80;

    let clampedX = offset.x;
    let clampedY = offset.y;
    const renderWidth = graphBounds.width * scale;
    const renderHeight = graphBounds.height * scale;
    
    if (renderWidth < svgWidth - PADDING * 2) {
      clampedX = (svgWidth / 2) - ((graphBounds.minX + graphBounds.width / 2) * scale);
    } else {
      const minOffsetX = PADDING - (graphBounds.maxX * scale);
      const maxOffsetX = svgWidth - PADDING - (graphBounds.minX * scale);
      clampedX = Math.max(minOffsetX, Math.min(maxOffsetX, offset.x));
    }
    
    if (renderHeight < svgHeight - PADDING * 2) {
      clampedY = (svgHeight / 2) - ((graphBounds.minY + graphBounds.height / 2) * scale);
    } else {
      const minOffsetY = PADDING - (graphBounds.maxY * scale);
      const maxOffsetY = svgHeight - PADDING - (graphBounds.minY * scale);
      clampedY = Math.max(minOffsetY, Math.min(maxOffsetY, offset.y));
    }

    return { scale, offset: { x: clampedX, y: clampedY } };
  }, [graphBounds]);

  useLayoutEffect(() => {
    if (isOpen) {
      setSelectedNodeId(null);
      const initialPositions: Record<string, { x: number, y: number }> = {};
      const centerX = 400, centerY = 400, radius = 300;
      initialPositions[USER_AGENT.id] = { x: centerX, y: centerY };
      const angleStep = aiAgents.length > 0 ? (2 * Math.PI) / aiAgents.length : 0;
      aiAgents.forEach((agent, i) => {
        initialPositions[agent.id] = {
          x: centerX + radius * Math.cos(i * angleStep - Math.PI / 2),
          y: centerY + radius * Math.sin(i * angleStep - Math.PI / 2),
        };
      });
      setNodePositions(initialPositions);
    }
  }, [isOpen, aiAgents]);

  useLayoutEffect(() => {
    if (isOpen && Object.keys(nodePositions).length > 0 && svgRef.current) {
      const { width: svgWidth, height: svgHeight } = svgRef.current.getBoundingClientRect();
      if (svgWidth === 0 || svgHeight === 0 || graphBounds.width === 0) return;
      
      const PADDING = 100;
      const scaleX = svgWidth / (graphBounds.width + PADDING);
      const scaleY = svgHeight / (graphBounds.height + PADDING);
      const initialScale = Math.min(scaleX, scaleY, 1.5);
      
      const initialVp = clampViewport({ scale: initialScale, offset: { x: 0, y: 0 } });
      setViewport(initialVp);
      setTargetViewport(initialVp);
    }
  }, [isOpen, nodePositions, graphBounds, clampViewport]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    let animationFrameId: number;
    const lerpFactor = 0.1;
    const animate = () => {
      setViewport(current => {
        const target = targetViewportRef.current;
        const dx = target.offset.x - current.offset.x;
        const dy = target.offset.y - current.offset.y;
        const ds = target.scale - current.scale;
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01 && Math.abs(ds) < 0.001) {
          return current.scale !== target.scale || current.offset.x !== target.offset.x || current.offset.y !== target.offset.y ? target : current;
        }
        return {
          scale: current.scale + ds * lerpFactor,
          offset: { x: current.offset.x + dx * lerpFactor, y: current.offset.y + dy * lerpFactor }
        };
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isOpen]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!svgRef.current) return;
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const current = targetViewportRef.current;

    const worldX = (mouseX / current.scale) - current.offset.x;
    const worldY = (mouseY / current.scale) - current.offset.y;

    const newScale = Math.min(Math.max(0.2, current.scale * Math.pow(0.999, e.deltaY)), 4);
    
    const newOffsetX = (mouseX / newScale) - worldX;
    const newOffsetY = (mouseY / newScale) - worldY;
    
    setTargetViewport(clampViewport({ scale: newScale, offset: { x: newOffsetX, y: newOffsetY } }));
  }, [clampViewport]);

  const handleInteractionMove = useCallback((clientX: number, clientY: number) => {
    if (!dragState) return;
    let newDragState = { ...dragState };
    if (!dragState.didMove && Math.hypot(clientX - dragState.start.x, clientY - dragState.start.y) > 5) {
      newDragState.didMove = true;
    }

    if (dragState.type === 'pan') {
      const now = Date.now();
      const dt = now - panMomentumRef.current.lastTime;
      if (dt > 0) {
        const vx = (clientX - panMomentumRef.current.lastPos.x) / dt;
        const vy = (clientY - panMomentumRef.current.lastPos.y) / dt;
        panMomentumRef.current.vx = panMomentumRef.current.vx * 0.8 + vx * 0.2;
        panMomentumRef.current.vy = panMomentumRef.current.vy * 0.8 + vy * 0.2;
      }
      panMomentumRef.current.lastTime = now;
      panMomentumRef.current.lastPos = { x: clientX, y: clientY };
      const dx = clientX - dragState.start.x;
      const dy = clientY - dragState.start.y;
      const newOffset = { x: dragState.initialOffset!.x + dx, y: dragState.initialOffset!.y + dy };
      setTargetViewport(prev => clampViewport({ ...prev, offset: newOffset }));
    } else if (dragState.type === 'node') {
      const dx = (clientX - dragState.start.x) / viewport.scale;
      const dy = (clientY - dragState.start.y) / viewport.scale;
      const { x, y } = dragState.initialPos!;
      setNodePositions(prev => ({ ...prev, [dragState.id!]: { x: x + dx, y: y + dy } }));
    }
    setDragState(newDragState);
  }, [dragState, viewport.scale, clampViewport]);

  const handleInteractionEnd = useCallback(() => {
    if (!dragState) return;
    if (dragState.type === 'pan') {
      if (dragState.didMove) {
        const speed = Math.hypot(panMomentumRef.current.vx, panMomentumRef.current.vy);
        if (speed > 0.1) {
          const current = targetViewportRef.current;
          const newOffsetX = current.offset.x + panMomentumRef.current.vx * 150;
          const newOffsetY = current.offset.y + panMomentumRef.current.vy * 150;
          setTargetViewport(clampViewport({ scale: current.scale, offset: { x: newOffsetX, y: newOffsetY } }));
        }
      } else {
        setSelectedNodeId(null);
      }
    } else if (dragState.type === 'node' && !dragState.didMove) {
      setSelectedNodeId(prev => prev === dragState.id ? null : dragState.id!);
    }
    setDragState(null);
  }, [dragState, clampViewport]);
  
  useEffect(() => {
    if (!dragState) return;
    const move = (e: MouseEvent | TouchEvent) => {
      const point = 'touches' in e ? e.touches[0] : e;
      handleInteractionMove(point.clientX, point.clientY);
    };
    const end = () => handleInteractionEnd();
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move);
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', end);
      window.removeEventListener('touchend', end);
    };
  }, [dragState, handleInteractionMove, handleInteractionEnd]);

  const handleMouseDown = (e: React.MouseEvent, agentId?: string) => {
    e.preventDefault();
    if ((e.target as HTMLElement).closest('foreignObject') && !agentId) return;
    panMomentumRef.current = { vx: 0, vy: 0, lastTime: Date.now(), lastPos: { x: e.clientX, y: e.clientY } };
    if (agentId) {
      setDragState({ type: 'node', id: agentId, start: { x: e.clientX, y: e.clientY }, initialPos: nodePositions[agentId], didMove: false });
    } else {
      setDragState({ type: 'pan', start: { x: e.clientX, y: e.clientY }, initialOffset: targetViewportRef.current.offset, didMove: false });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length >= 2) {
      const t1 = e.touches[0]; const t2 = e.touches[1];
      const rect = svgRef.current!.getBoundingClientRect();
      const current = targetViewportRef.current;
      touchStateRef.current = { isPinch: true, initialPinchDist: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY), initialScale: current.scale, pivotWorldPoint: { x: (((t1.clientX + t2.clientX) / 2 - rect.left) / current.scale) - current.offset.x, y: (((t1.clientY + t2.clientY) / 2 - rect.top) / current.scale) - current.offset.y } };
    } else if (e.touches.length === 1) {
      const agentId = (e.target as HTMLElement).closest('[data-agent-id]')?.getAttribute('data-agent-id') || undefined;
      const touch = e.touches[0];
      panMomentumRef.current = { vx: 0, vy: 0, lastTime: Date.now(), lastPos: { x: touch.clientX, y: touch.clientY } };
      if (agentId) {
        setDragState({ type: 'node', id: agentId, start: { x: touch.clientX, y: touch.clientY }, initialPos: nodePositions[agentId], didMove: false });
      } else {
        setDragState({ type: 'pan', start: { x: touch.clientX, y: touch.clientY }, initialOffset: targetViewportRef.current.offset, didMove: false });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length >= 2 && touchStateRef.current?.isPinch) {
      const t1 = e.touches[0]; const t2 = e.touches[1];
      const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const { initialPinchDist, initialScale, pivotWorldPoint } = touchStateRef.current;
      const scaleDelta = initialPinchDist > 0 ? newDist / initialPinchDist : 1;
      const newScale = Math.min(Math.max(0.2, initialScale * scaleDelta), 4);
      const rect = svgRef.current!.getBoundingClientRect();
      const newMidX = (t1.clientX + t2.clientX) / 2;
      const newMidY = (t1.clientY + t2.clientY) / 2;
      const newOffsetX = ((newMidX - rect.left) / newScale) - pivotWorldPoint!.x;
      const newOffsetY = ((newMidY - rect.top) / newScale) - pivotWorldPoint!.y;
      setTargetViewport(clampViewport({ scale: newScale, offset: { x: newOffsetX, y: newOffsetY } }));
    }
  };
  
  const getAgentById = useCallback((id: string) => allNodes.find(a => a.id === id), [allNodes]);

  const edges = useMemo(() => {
    if (!selectedNodeId) return [];

    const selectedAgent = getAgentById(selectedNodeId);
    if (!selectedAgent) return [];

    const outboundEdges = Object.entries(selectedAgent.relationships || {}).map(([targetId, score]) => ({
        source: selectedNodeId,
        target: targetId,
        score,
    }));
    
    const inboundEdges = allNodes
        .filter(agent => agent.id !== selectedNodeId && agent.relationships?.[selectedNodeId])
        .map(agent => ({
            source: agent.id,
            target: selectedNodeId,
            score: agent.relationships![selectedNodeId]!,
        }));

    return [...outboundEdges, ...inboundEdges];
  }, [selectedNodeId, allNodes, getAgentById]);

  const connectedIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const ids = new Set<string>([selectedNodeId]);
    edges.forEach(edge => {
        ids.add(edge.source);
        ids.add(edge.target);
    });
    return ids;
  }, [selectedNodeId, edges]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div
        className="pixel-modal w-full max-w-7xl max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-graph-heading"
      >
        <header className="pixel-header flex justify-between items-center p-4">
          <h2 id="social-graph-heading" className="text-3xl md:text-4xl">Social Graph</h2>
          <button onClick={onClose} className="text-white hover:text-red-500 ml-4" data-close-button="true">
            <CloseIcon className="w-8 h-8" />
          </button>
        </header>
        <main className="flex-grow bg-gray-900/50 p-2 overflow-hidden">
          <svg 
            ref={svgRef} 
            className="w-full h-full cursor-grab active:cursor-grabbing" 
            onMouseDown={(e) => handleMouseDown(e)}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            <g transform={`translate(${viewport.offset.x} ${viewport.offset.y}) scale(${viewport.scale})`}>
              {edges.map(({ source, target, score }) => {
                const sourcePos = nodePositions[source];
                const targetPos = nodePositions[target];
                if (!sourcePos || !targetPos) return null;
                const isFriend = score > 0;
                const strokeColor = isFriend ? '#39FF14' : '#FF3131'; // Neon Green or Bright Red

                return (
                  <g key={`${source}-${target}`} style={{ pointerEvents: 'none' }}>
                    {/* Glow effect line */}
                    <line
                      x1={sourcePos.x} y1={sourcePos.y}
                      x2={targetPos.x} y2={targetPos.y}
                      stroke={strokeColor}
                      strokeWidth={10 / viewport.scale}
                      opacity={0.3}
                      strokeLinecap="round"
                      style={{ filter: `blur(${3 / viewport.scale}px)` }}
                    />
                    {/* Animated dashed line */}
                    <line
                      x1={sourcePos.x} y1={sourcePos.y}
                      x2={targetPos.x} y2={targetPos.y}
                      stroke={strokeColor}
                      strokeWidth={3 / viewport.scale}
                      opacity={1}
                      strokeLinecap="round"
                      strokeDasharray={`${15 / viewport.scale} ${10 / viewport.scale}`}
                      style={{ animation: 'dash-flow 40s linear infinite' }}
                    />
                  </g>
                );
              })}
              {allNodes.map(agent => {
                const pos = nodePositions[agent.id];
                if (!pos) return null;
                const isSelected = selectedNodeId === agent.id;
                const isConnected = !selectedNodeId || (connectedIds && connectedIds.has(agent.id));
                const opacity = isConnected ? 1 : 0.3;

                return (
                  <foreignObject key={agent.id} x={pos.x - 40} y={pos.y - 40} width="80" height="80" onMouseDown={(e) => handleMouseDown(e, agent.id)} data-agent-id={agent.id}>
                    <div className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 cursor-pointer p-1 rounded-md ${isSelected ? 'bg-yellow-400/50' : 'bg-black/20'}`} style={{ opacity, pointerEvents: 'all' }}>
                      <AgentSprite spriteSeed={agent.spriteSeed || 'default'} className="w-12 h-12" />
                      <p className="text-xs text-white text-center truncate w-full bg-black/50 px-1">{agent.name}</p>
                    </div>
                  </foreignObject>
                )
              })}
            </g>
          </svg>
        </main>
        <footer className="p-2 border-t-2 border-black mt-auto text-center text-sm text-gray-400">
            Click an agent to view their relationships. Drag nodes to rearrange. Use mouse wheel or pinch to zoom.
        </footer>
      </div>
    </div>
  );
};

export default SocialGraphModal;