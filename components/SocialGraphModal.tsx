import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useAppStore } from '../hooks/useAppContext.ts';
import { CloseIcon } from './icons.tsx';
import AgentSprite from './AgentSprite.tsx';
import { USER_AGENT } from '../constants.ts';
import { shallow } from 'zustand/shallow';
import type { Agent } from '../types.ts';

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

  const resetLayout = useCallback(() => {
    const initialPositions: Record<string, { x: number, y: number }> = {};
    const centerX = 400;
    const centerY = 400;
    const radius = 300;
    initialPositions[USER_AGENT.id] = { x: centerX, y: centerY };
    const angleStep = aiAgents.length > 0 ? (2 * Math.PI) / aiAgents.length : 0;
    aiAgents.forEach((agent, i) => {
      initialPositions[agent.id] = {
        x: centerX + radius * Math.cos(i * angleStep - Math.PI / 2),
        y: centerY + radius * Math.sin(i * angleStep - Math.PI / 2),
      };
    });
    setNodePositions(initialPositions);
    setSelectedNodeId(null);
  }, [aiAgents]);

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
      resetLayout();
    }
  }, [isOpen, resetLayout]);

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
  const fitGraphToView = useCallback(() => {
    if (!svgRef.current || Object.keys(nodePositions).length === 0 || graphBounds.width === 0) return;
    const { width: svgWidth, height: svgHeight } = svgRef.current.getBoundingClientRect();
    const PADDING = 100;
    const scaleX = svgWidth / (graphBounds.width + PADDING);
    const scaleY = svgHeight / (graphBounds.height + PADDING);
    const nextScale = Math.min(scaleX, scaleY, 1.5);
    const nextViewport = clampViewport({ scale: nextScale, offset: { x: 0, y: 0 } });
    setTargetViewport(nextViewport);
  }, [clampViewport, graphBounds, nodePositions]);

  const centerOnNode = useCallback((nodeId: string) => {
    if (!svgRef.current || !nodePositions[nodeId]) return;
    const { width: svgWidth, height: svgHeight } = svgRef.current.getBoundingClientRect();
    const current = targetViewportRef.current;
    const node = nodePositions[nodeId];
    const nextViewport = clampViewport({
      scale: current.scale,
      offset: {
        x: (svgWidth / 2) - (node.x * current.scale),
        y: (svgHeight / 2) - (node.y * current.scale),
      },
    });
    setTargetViewport(nextViewport);
  }, [clampViewport, nodePositions]);

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

  const selectedAgent = useMemo(() => selectedNodeId ? getAgentById(selectedNodeId) || null : null, [selectedNodeId, getAgentById]);
  const relationshipSummary = useMemo(() => {
    if (!selectedAgent) return { outgoing: [], incoming: [], strongestPositive: null as null | { agent: Agent; score: number }, strongestNegative: null as null | { agent: Agent; score: number } };

    const outgoing = Object.entries(selectedAgent.relationships || {})
      .map(([targetId, score]) => ({ agent: getAgentById(targetId), score }))
      .filter((entry): entry is { agent: Agent; score: number } => Boolean(entry.agent))
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

    const incoming = allNodes
      .filter(agent => agent.id !== selectedAgent.id)
      .map(agent => ({ agent, score: agent.relationships?.[selectedAgent.id] }))
      .filter((entry): entry is { agent: Agent; score: number } => typeof entry.score === 'number')
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

    const combined = [...outgoing, ...incoming];
    const strongestPositive = combined.filter(edge => edge.score > 0).sort((a, b) => b.score - a.score)[0] || null;
    const strongestNegative = combined.filter(edge => edge.score < 0).sort((a, b) => a.score - b.score)[0] || null;

    return { outgoing, incoming, strongestPositive, strongestNegative };
  }, [selectedAgent, getAgentById, allNodes]);

  const totalRelationshipCount = edges.length;
  const positiveEdgeCount = edges.filter(edge => edge.score > 0).length;
  const negativeEdgeCount = edges.filter(edge => edge.score < 0).length;

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
          <div className="flex h-full flex-col gap-2 lg:flex-row">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-2 flex flex-wrap items-center gap-2 border border-white/10 bg-black/20 p-2 text-xs uppercase tracking-[0.2em] text-gray-300">
                <span className="border border-white/10 px-2 py-1">Nodes {allNodes.length}</span>
                <span className="border border-green-400/30 px-2 py-1 text-green-300">Positive {positiveEdgeCount}</span>
                <span className="border border-red-400/30 px-2 py-1 text-red-300">Negative {negativeEdgeCount}</span>
                <span className="border border-white/10 px-2 py-1">Visible edges {totalRelationshipCount}</span>
                <button onClick={() => fitGraphToView()} className="border border-white/20 px-2 py-1 transition-colors hover:bg-white/10">Fit</button>
                <button onClick={() => centerOnNode(USER_AGENT.id)} className="border border-white/20 px-2 py-1 transition-colors hover:bg-white/10">Center Player</button>
                {selectedNodeId && (
                  <button onClick={() => centerOnNode(selectedNodeId)} className="border border-white/20 px-2 py-1 transition-colors hover:bg-white/10">Center Selection</button>
                )}
                <button onClick={resetLayout} className="border border-white/20 px-2 py-1 transition-colors hover:bg-white/10">Reset Layout</button>
              </div>
              <svg 
                ref={svgRef} 
                className="h-full w-full cursor-grab active:cursor-grabbing rounded-sm border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.08),_rgba(15,23,42,0.85)_55%)]" 
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
                    const strokeColor = isFriend ? '#39FF14' : '#FF3131';
                    const intensity = Math.max(0.35, Math.min(1, Math.abs(score) / 10));

                    return (
                      <g key={`${source}-${target}`} style={{ pointerEvents: 'none' }}>
                        <line
                          x1={sourcePos.x} y1={sourcePos.y}
                          x2={targetPos.x} y2={targetPos.y}
                          stroke={strokeColor}
                          strokeWidth={(8 + Math.abs(score) * 0.4) / viewport.scale}
                          opacity={0.18 + intensity * 0.24}
                          strokeLinecap="round"
                          style={{ filter: `blur(${3 / viewport.scale}px)` }}
                        />
                        <line
                          x1={sourcePos.x} y1={sourcePos.y}
                          x2={targetPos.x} y2={targetPos.y}
                          stroke={strokeColor}
                          strokeWidth={(2 + Math.abs(score) * 0.15) / viewport.scale}
                          opacity={0.65 + intensity * 0.25}
                          strokeLinecap="round"
                          strokeDasharray={`${15 / viewport.scale} ${10 / viewport.scale}`}
                          style={{ animation: 'dash-flow 40s linear infinite' }}
                        />
                        <text
                          x={(sourcePos.x + targetPos.x) / 2}
                          y={(sourcePos.y + targetPos.y) / 2 - (10 / viewport.scale)}
                          fill={strokeColor}
                          fontSize={12 / viewport.scale}
                          textAnchor="middle"
                          opacity={0.9}
                        >
                          {score > 0 ? '+' : ''}{score}
                        </text>
                      </g>
                    );
                  })}
                  {allNodes.map(agent => {
                    const pos = nodePositions[agent.id];
                    if (!pos) return null;
                    const isSelected = selectedNodeId === agent.id;
                    const isConnected = !selectedNodeId || (connectedIds && connectedIds.has(agent.id));
                    const opacity = isConnected ? 1 : 0.22;

                    return (
                      <foreignObject key={agent.id} x={pos.x - 44} y={pos.y - 44} width="88" height="88" onMouseDown={(e) => handleMouseDown(e, agent.id)} data-agent-id={agent.id}>
                        <div className={`flex h-full w-full flex-col items-center justify-center rounded-md p-1 transition-all duration-200 cursor-pointer ${isSelected ? 'bg-yellow-400/60 ring-2 ring-yellow-200' : agent.id === USER_AGENT.id ? 'bg-cyan-400/20 ring-1 ring-cyan-300/60' : 'bg-black/20'}`} style={{ opacity, pointerEvents: 'all' }}>
                          <AgentSprite spriteSeed={agent.spriteSeed || 'default'} className="w-12 h-12" />
                          <p className="w-full truncate bg-black/50 px-1 text-center text-xs text-white">{agent.name}</p>
                        </div>
                      </foreignObject>
                    );
                  })}
                </g>
              </svg>
            </div>
            <aside className="flex w-full shrink-0 flex-col border border-white/10 bg-black/25 p-3 text-sm text-gray-200 lg:w-[21rem]">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Selection</p>
              {selectedAgent ? (
                <>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="rounded-md bg-black/30 p-2">
                      <AgentSprite spriteSeed={selectedAgent.spriteSeed || 'default'} className="w-12 h-12" />
                    </div>
                    <div>
                      <h3 className="text-xl text-white">{selectedAgent.name}</h3>
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{selectedAgent.id === USER_AGENT.id ? 'Player' : 'Agent'}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs uppercase tracking-[0.2em]">
                    <div className="border border-green-400/20 bg-green-400/10 p-2 text-green-200">
                      <div>Warmest link</div>
                      <div className="mt-1 text-sm normal-case text-white">{relationshipSummary.strongestPositive ? `${relationshipSummary.strongestPositive.agent.name} (${relationshipSummary.strongestPositive.score > 0 ? '+' : ''}${relationshipSummary.strongestPositive.score})` : 'None yet'}</div>
                    </div>
                    <div className="border border-red-400/20 bg-red-400/10 p-2 text-red-200">
                      <div>Sharpest conflict</div>
                      <div className="mt-1 text-sm normal-case text-white">{relationshipSummary.strongestNegative ? `${relationshipSummary.strongestNegative.agent.name} (${relationshipSummary.strongestNegative.score})` : 'None yet'}</div>
                    </div>
                  </div>
                  <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Outgoing</p>
                      <div className="mt-2 space-y-2">
                        {relationshipSummary.outgoing.length > 0 ? relationshipSummary.outgoing.map(({ agent, score }) => (
                          <button key={`out-${agent.id}`} onClick={() => setSelectedNodeId(agent.id)} className="flex w-full items-center justify-between border border-white/10 bg-black/20 px-3 py-2 text-left transition-colors hover:bg-white/10">
                            <span>{agent.name}</span>
                            <span className={score >= 0 ? 'text-green-300' : 'text-red-300'}>{score > 0 ? '+' : ''}{score}</span>
                          </button>
                        )) : <p className="text-sm text-gray-500">No outgoing relationships recorded.</p>}
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Incoming</p>
                      <div className="mt-2 space-y-2">
                        {relationshipSummary.incoming.length > 0 ? relationshipSummary.incoming.map(({ agent, score }) => (
                          <button key={`in-${agent.id}`} onClick={() => setSelectedNodeId(agent.id)} className="flex w-full items-center justify-between border border-white/10 bg-black/20 px-3 py-2 text-left transition-colors hover:bg-white/10">
                            <span>{agent.name}</span>
                            <span className={score >= 0 ? 'text-green-300' : 'text-red-300'}>{score > 0 ? '+' : ''}{score}</span>
                          </button>
                        )) : <p className="text-sm text-gray-500">No incoming relationships recorded.</p>}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-3 flex h-full items-center justify-center border border-dashed border-white/15 bg-black/10 p-4 text-center text-sm text-gray-400">
                  Click a node to inspect incoming and outgoing relationships. The graph highlights only the selected network slice.
                </div>
              )}
            </aside>
          </div>
        </main>
        <footer className="p-2 border-t-2 border-black mt-auto text-center text-sm text-gray-400">
            Click an agent to inspect links. Drag nodes to rearrange, use mouse wheel or pinch to zoom, and use Fit or Center to reframe the graph.
        </footer>
      </div>
    </div>
  );
};

export default SocialGraphModal;
