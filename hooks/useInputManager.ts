import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Agent } from '../types.ts';
import { USER_AGENT } from '../constants.ts';
import { GAME_CONFIG } from '../data/gameConfig.ts';
import { getRoomForPosition, isPositionValid } from '../services/collisionService.ts';
import { useAppStore } from './useAppContext.ts';

type InputManagerProps = {
  viewportRef: React.RefObject<HTMLDivElement>;
  viewport: { scale: number; offset: { x: number, y: number } };
  setViewport: React.Dispatch<React.SetStateAction<{ scale: number; offset: { x: number; y: number; } }>>;
  setTargetViewport: React.Dispatch<React.SetStateAction<{ scale: number; offset: { x: number; y: number; } }>>;
  setIsAutoViewEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMobileZoomLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setMoveTarget: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  onPlayerMoveStart: () => void;
  handleFocus: () => void;
  handleAgentMove: (agentId: string, pos: {left: number, top: number}, isDragging: boolean) => void;
  setIsPlayerBeingDragged: React.Dispatch<React.SetStateAction<boolean>>;
  userInputRef: React.RefObject<HTMLTextAreaElement>;
  onArtEaselClick: () => void;
  onGroundingComputerClick: () => void;
  onVibeComputerClick: () => void;
  onScreenplayTerminalClick: () => void;
  onModelComparisonTerminalClick: () => void;
  onGameBoardClick: () => void;
  onAgentClick: (agentId: string) => void;
  onAgentDoubleClick: (agentId: string) => void;
};

type DragState = { type: 'pan' | 'agent'; id?: string; start: { x: number; y: number }, initialOffset?: {x:number, y:number}, initialPos?: {top:number, left:number} } | null;

export const useInputManager = (props: InputManagerProps) => {
  const {
    viewportRef, viewport, setViewport, setTargetViewport,
    setIsAutoViewEnabled, setIsMobileZoomLocked, setMoveTarget, onPlayerMoveStart,
    handleFocus, handleAgentMove, setIsPlayerBeingDragged, userInputRef,
    onArtEaselClick, onGroundingComputerClick, onVibeComputerClick, onScreenplayTerminalClick, onModelComparisonTerminalClick, onGameBoardClick,
    onAgentClick, onAgentDoubleClick,
  } = props;

  const [dragState, setDragState] = useState<DragState | null>(null);
  const lastTapTime = useRef(0);
  const panVelocity = useRef({ x: 0, y: 0 });
  const lastPanEvent = useRef<{ x: number; y: number; time: number } | null>(null);

  const stateRef = useRef(useAppStore.getState());
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(newState => {
        stateRef.current = newState;
    });
    return unsubscribe;
  }, []);

  const { setAgents, setUiState, setAgentTask } = useAppStore.getState();

  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;
  const viewportRefForCallbacks = useRef(viewport);
  viewportRefForCallbacks.current = viewport;
  const targetViewportRef = useRef(viewport);
  useEffect(() => {
    targetViewportRef.current = viewport;
  }, [viewport]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
      const currentDragState = dragStateRef.current;
      if (!currentDragState) return;
      const currentViewport = viewportRefForCallbacks.current;
      
      if (currentDragState.type === 'pan' && currentDragState.initialOffset) {
          setIsAutoViewEnabled(false);
          
          const now = Date.now();
          if (lastPanEvent.current) {
              const dt = now - lastPanEvent.current.time;
              if (dt > 0) {
                  const velocityX = (e.clientX - lastPanEvent.current.x) / dt;
                  const velocityY = (e.clientY - lastPanEvent.current.y) / dt;
                  panVelocity.current.x = panVelocity.current.x * 0.8 + velocityX * 0.2;
                  panVelocity.current.y = panVelocity.current.y * 0.8 + velocityY * 0.2;
              }
          }
          lastPanEvent.current = { x: e.clientX, y: e.clientY, time: now };

          const dx = (e.clientX - currentDragState.start.x) / currentViewport.scale;
          const dy = (e.clientY - currentDragState.start.y) / currentViewport.scale;
          const newOffset = { x: currentDragState.initialOffset.x + dx, y: currentDragState.initialOffset.y + dy };
          
          setViewport(v => ({ ...v, offset: newOffset }));
          setTargetViewport(v => ({ ...v, offset: newOffset }));
      } else if (currentDragState.type === 'agent' && currentDragState.id && currentDragState.initialPos) {
          const dx = (e.clientX - currentDragState.start.x) / currentViewport.scale;
          const dy = (e.clientY - currentDragState.start.y) / currentViewport.scale;
          handleAgentMove(currentDragState.id, {left: currentDragState.initialPos.left + dx, top: currentDragState.initialPos.top + dy}, true);
      }
  }, [handleAgentMove, setIsAutoViewEnabled, setTargetViewport, setViewport]);

  const handleMouseUp = useCallback(() => {
      setIsPlayerBeingDragged(false);
      const currentDragState = dragStateRef.current;
      
      if (currentDragState?.type === 'pan') {
          const MOMENTUM_FACTOR = 300;
          const MIN_VELOCITY_THRESHOLD = 0.05;
          const velocityMagnitude = Math.hypot(panVelocity.current.x, panVelocity.current.y);

          if (velocityMagnitude > MIN_VELOCITY_THRESHOLD) {
              const currentViewport = viewportRefForCallbacks.current;
              const newTargetX = currentViewport.offset.x + (panVelocity.current.x * MOMENTUM_FACTOR / currentViewport.scale);
              const newTargetY = currentViewport.offset.y + (panVelocity.current.y * MOMENTUM_FACTOR / currentViewport.scale);
              setTargetViewport({ scale: currentViewport.scale, offset: { x: newTargetX, y: newTargetY } });
          }
          panVelocity.current = { x: 0, y: 0 };
          lastPanEvent.current = null;
      }
      
      if (currentDragState?.type === 'agent' && currentDragState.id) {
          const finalAgent = stateRef.current.agents.find(a => a.id === currentDragState.id);
          if (finalAgent) {
              const newRoomId = getRoomForPosition(finalAgent.position.left, finalAgent.position.top);
              if (newRoomId === 'trash' && finalAgent.id !== USER_AGENT.id) {
                  setAgents(stateRef.current.agents.filter(a => a.id !== currentDragState.id!));
                  setUiState({ selectedAgentId: null });
              }
          }
          if (currentDragState.id === USER_AGENT.id) {
              setIsAutoViewEnabled(true);
          }
      }
      setDragState(null);
  }, [setIsAutoViewEnabled, setTargetViewport, setIsPlayerBeingDragged, setAgents, setUiState]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  const touchInteractionRef = useRef<{
    startTime: number; startPos: { x: number; y: number }; isHeld: boolean; holdTimeout: number | null;
    isPinch: boolean; initialPinchDist: number; initialScale: number; hasMoved: boolean;
    initialMidpoint: { x: number; y: number } | null; pivotWorldPoint: { x: number, y: number } | null; agentId: string | null;
  }>({
    startTime: 0, startPos: { x: 0, y: 0 }, isHeld: false, holdTimeout: null, isPinch: false,
    initialPinchDist: 0, initialScale: 1, hasMoved: false, initialMidpoint: null, pivotWorldPoint: null, agentId: null,
  });

  const clearMoveTarget = useCallback(() => setMoveTarget(null), [setMoveTarget]);

  const onAgentTouchStart = useCallback((e: React.TouchEvent, agentId: string) => {
    if (e.touches.length > 1) return;
    handleFocus();

    const agent = stateRef.current.agents.find(a => a.id === agentId);
    if (!agent) return;
    
    const touch = e.touches[0];
    const touchInteraction = touchInteractionRef.current;
    if (touchInteraction.holdTimeout) clearTimeout(touchInteraction.holdTimeout);
    touchInteraction.startTime = Date.now();
    touchInteraction.startPos = { x: touch.clientX, y: touch.clientY };
    touchInteraction.isHeld = false;
    touchInteraction.hasMoved = false;
    touchInteraction.agentId = agentId;

    clearMoveTarget();
    
    touchInteraction.holdTimeout = window.setTimeout(() => {
      if (!touchInteraction.hasMoved) {
        touchInteraction.isHeld = true;
        if (agentId === USER_AGENT.id) {
            setIsPlayerBeingDragged(true);
        }
        setIsAutoViewEnabled(false); // Disable auto-view when starting a touch-drag
        setUiState({ selectedAgentId: agentId });
        // Clear the agent's task to prevent them walking back after being dropped.
        setAgentTask(agentId, null);
        setDragState({ type: 'agent', id: agentId, start: touchInteraction.startPos, initialPos: agent.position });
      }
    }, GAME_CONFIG.TOUCH_HOLD_DRAG_THRESHOLD_MS);
  }, [clearMoveTarget, handleFocus, setDragState, setIsAutoViewEnabled, setIsPlayerBeingDragged, setUiState, setAgentTask]);

  const onWorldTouchStart = useCallback((e: React.TouchEvent) => {
    const touchInteraction = touchInteractionRef.current;
    if (touchInteraction.holdTimeout) clearTimeout(touchInteraction.holdTimeout);
    touchInteraction.agentId = null;
    
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.touches.length >= 2) {
      e.preventDefault();
      const t1 = e.touches[0]; const t2 = e.touches[1];
      const currentViewport = viewportRefForCallbacks.current;
      touchInteraction.isPinch = true;
      touchInteraction.initialPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchInteraction.initialScale = currentViewport.scale;
      const mid = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      touchInteraction.initialMidpoint = mid;
      const worldX = (mid.x - rect.left) / currentViewport.scale - currentViewport.offset.x;
      const worldY = (mid.y - rect.top) / currentViewport.scale - currentViewport.offset.y;
      touchInteraction.pivotWorldPoint = { x: worldX, y: worldY };
      setIsAutoViewEnabled(false);
      setIsMobileZoomLocked(true);
      return;
    }

    if (e.touches.length === 1) {
      handleFocus();
      const touch = e.touches[0];
      touchInteraction.startTime = Date.now();
      touchInteraction.startPos = { x: touch.clientX, y: touch.clientY };
      touchInteraction.isHeld = false;
      touchInteraction.hasMoved = false;

      const currentViewport = viewportRefForCallbacks.current;
      const currentPlayer = stateRef.current.agents.find(a => a.id === USER_AGENT.id);
      const worldX = ((touch.clientX - rect.left) / currentViewport.scale) - currentViewport.offset.x;
      const worldY = ((touch.clientY - rect.top) / currentViewport.scale) - currentViewport.offset.y;
      if (isPositionValid(worldX, worldY, false, currentPlayer)) {
        onPlayerMoveStart();
        setMoveTarget({ x: worldX, y: worldY });
      }
    }
  }, [handleFocus, onPlayerMoveStart, setMoveTarget, viewportRef, setIsAutoViewEnabled, setIsMobileZoomLocked]);
  
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touchInteraction = touchInteractionRef.current;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const currentViewport = viewportRefForCallbacks.current;

    if (!touchInteraction.hasMoved && e.touches.length > 0) {
      const touch = e.touches[0];
      const moveDist = Math.hypot(touch.clientX - touchInteraction.startPos.x, touch.clientY - touchInteraction.startPos.y);
      if (moveDist > 10) {
        touchInteraction.hasMoved = true;
        if (touchInteraction.holdTimeout) clearTimeout(touchInteraction.holdTimeout);
      }
    }

    if (e.touches.length >= 2 && touchInteraction.isPinch && touchInteraction.pivotWorldPoint) {
      e.preventDefault();
      const t1 = e.touches[0]; const t2 = e.touches[1];
      const newMidpoint = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scaleDelta = touchInteraction.initialPinchDist > 0 ? currentDist / touchInteraction.initialPinchDist : 1;
      let newScale = Math.min(Math.max(0.1, touchInteraction.initialScale * scaleDelta), 2.5);

      const pivot = touchInteraction.pivotWorldPoint;
      const newOffsetX = ((newMidpoint.x - rect.left) / newScale) - pivot.x;
      const newOffsetY = ((newMidpoint.y - rect.top) / newScale) - pivot.y;
      
      const newViewport = { scale: newScale, offset: { x: newOffsetX, y: newOffsetY } };
      setViewport(newViewport);
      setTargetViewport(newViewport);
      return;
    }
    
    const currentDragState = dragStateRef.current;
    if (currentDragState?.type === 'agent' && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = (touch.clientX - currentDragState.start.x) / currentViewport.scale;
      const dy = (touch.clientY - currentDragState.start.y) / currentViewport.scale;
      if (currentDragState.id && currentDragState.initialPos) {
        handleAgentMove(currentDragState.id, { left: currentDragState.initialPos.left + dx, top: currentDragState.initialPos.top + dy }, true);
      }
      return;
    }

    const isPlayerMoveIntent = e.touches.length === 1 && !touchInteraction.agentId && !dragStateRef.current;
    if (isPlayerMoveIntent) {
      e.preventDefault();
      
      const touch = e.touches[0];
      const worldX = ((touch.clientX - rect.left) / currentViewport.scale) - currentViewport.offset.x;
      const worldY = ((touch.clientY - rect.top) / currentViewport.scale) - currentViewport.offset.y;

      const currentPlayer = stateRef.current.agents.find(a => a.id === USER_AGENT.id);
      if (isPositionValid(worldX, worldY, false, currentPlayer)) {
        setMoveTarget({ x: worldX, y: worldY });
      }
    }
  }, [handleAgentMove, setViewport, setTargetViewport, viewportRef, setMoveTarget]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    setIsPlayerBeingDragged(false);
    const touchInteraction = touchInteractionRef.current;
    if (touchInteraction.holdTimeout) clearTimeout(touchInteraction.holdTimeout);
    
    clearMoveTarget();

    if (touchInteraction.isPinch) {
      if (e.touches.length < 2) {
        touchInteraction.isPinch = false;
        touchInteraction.pivotWorldPoint = null;
      }
      return;
    }
    
    if (!touchInteraction.hasMoved && !touchInteraction.isHeld) {
      // Logic for tap interaction (not movement)
      if (touchInteraction.agentId) {
        onAgentClick(touchInteraction.agentId);
      }
    }

    const now = Date.now();
    if (!touchInteraction.hasMoved && !touchInteraction.isHeld) {
      if (now - lastTapTime.current < GAME_CONFIG.TOUCH_DOUBLE_TAP_THRESHOLD_MS) {
        if(touchInteraction.agentId) {
          onAgentDoubleClick(touchInteraction.agentId);
        } else {
          setIsAutoViewEnabled(true);
          setIsMobileZoomLocked(false);
        }
        lastTapTime.current = 0;
      } else { lastTapTime.current = now; }
    } else { lastTapTime.current = 0; }

    const currentDragState = dragStateRef.current;
    if (currentDragState?.type === 'agent') {
      const finalAgent = stateRef.current.agents.find(a => a.id === currentDragState.id);
      if (finalAgent) {
        const newRoomId = getRoomForPosition(finalAgent.position.left, finalAgent.position.top);
        if (newRoomId === 'trash' && finalAgent.id !== USER_AGENT.id) {
          setAgents(stateRef.current.agents.filter(a => a.id !== currentDragState.id!));
          setUiState({ selectedAgentId: null });
        }
      }
      if (currentDragState.id === USER_AGENT.id) {
        setIsAutoViewEnabled(true);
      }
      setDragState(null);
    }
    touchInteraction.hasMoved = false; touchInteraction.isHeld = false; touchInteraction.agentId = null;
  }, [setIsAutoViewEnabled, setIsMobileZoomLocked, setDragState, setIsPlayerBeingDragged, onAgentClick, onAgentDoubleClick, clearMoveTarget, setAgents, setUiState]);

  const onDragStart = useCallback((e: React.MouseEvent, agentId?: string) => {
      e.preventDefault(); e.stopPropagation();
      handleFocus();
      if (agentId === USER_AGENT.id) {
        setIsPlayerBeingDragged(true);
      }
      const currentAgents = stateRef.current.agents;
      const agent = currentAgents.find(a => a.id === agentId);
      if (agentId && agent) {
          setIsAutoViewEnabled(false); // Disable auto-view when dragging an agent
          setUiState({ selectedAgentId: agentId });
          // Clear the agent's task to prevent them walking back after being dropped.
          setAgentTask(agentId, null);
          setDragState({ type: 'agent', id: agentId, start: { x: e.clientX, y: e.clientY }, initialPos: agent.position });
      } else if (!agentId) {
          setIsAutoViewEnabled(false);
          setUiState({ selectedAgentId: null });
          setDragState({ type: 'pan', start: { x: e.clientX, y: e.clientY }, initialOffset: viewportRefForCallbacks.current.offset });
          lastPanEvent.current = { x: e.clientX, y: e.clientY, time: Date.now() };
          panVelocity.current = { x: 0, y: 0 };
      }
  }, [handleFocus, setDragState, setIsAutoViewEnabled, setIsPlayerBeingDragged, setUiState, setAgentTask]);
  
  const onViewportChange = useCallback((e: React.WheelEvent, isManual: boolean) => {
    if (!viewportRef.current) return;
    if (isManual) setIsAutoViewEnabled(false);
    e.preventDefault();
    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const current = targetViewportRef.current;

    const worldX = (mouseX / current.scale) - current.offset.x;
    const worldY = (mouseY / current.scale) - current.offset.y;

    const newScale = Math.min(Math.max(0.1, current.scale * Math.pow(0.998, e.deltaY)), 2.5);
    if (newScale === current.scale) return;

    const newOffsetX = (mouseX / newScale) - worldX;
    const newOffsetY = (mouseY / newScale) - worldY;

    setTargetViewport({ scale: newScale, offset: { x: newOffsetX, y: newOffsetY } });
  }, [setIsAutoViewEnabled, setTargetViewport, viewportRef]);
  
  const onAddAgentClick = useCallback((pos: { top: number, left: number, roomId: string }) => {
      setUiState({ isAddAgentModalOpen: true, addAgentSpawnPos: pos });
  }, [setUiState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const activeEl = document.activeElement;
        const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
        
        if (!isTyping && (e.key === 'Delete' || e.key === 'Backspace') && stateRef.current.ui.selectedAgentId && stateRef.current.ui.selectedAgentId !== USER_AGENT.id) {
            setAgents(stateRef.current.agents.filter(a => a.id !== stateRef.current.ui.selectedAgentId));
            setUiState({ selectedAgentId: null });
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setAgents, setUiState]);

  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (stateRef.current.ui.isAnyModalOpen) {
          return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (userInputRef.current) {
          if (document.activeElement === userInputRef.current) {
            userInputRef.current.blur();
            handleFocus();
          } else {
            userInputRef.current.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [handleFocus, userInputRef]);
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
        if (document.activeElement === viewportRef.current) {
            const ignoredKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'shift', 'control', 'alt', 'meta', 'capslock', 'tab', 'escape', 'enter'];
            if (!ignoredKeys.includes(e.key.toLowerCase())) {
                if (userInputRef.current) userInputRef.current.focus();
            }
        }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [userInputRef, viewportRef]);

  return { onDragStart, onAgentClick, onAgentDoubleClick, onAddAgentClick, onWorldTouchStart, onAgentTouchStart, onTouchMove, onTouchEnd, onViewportChange, onArtEaselClick, onGroundingComputerClick, onVibeComputerClick, onScreenplayTerminalClick, onModelComparisonTerminalClick, onGameBoardClick };
};