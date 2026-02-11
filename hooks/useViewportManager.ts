import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useAppStore } from './useAppContext.ts';
import { ZONES } from '../data/layout.ts';
import { USER_AGENT } from '../constants.ts';
import { shallow } from 'zustand/shallow';

export const useViewportManager = (
  viewportRef: React.RefObject<HTMLDivElement>,
  isPlayerBeingDragged: boolean
) => {
  const { ui, game, agents, sessionId } = useAppStore(s => ({
    ui: s.ui,
    game: s.game,
    agents: s.agents,
    sessionId: s.game.sessionId,
  }), shallow);
  const { isWelcomeModalOpen, isAnyModalOpen } = ui;
  const { isPlayerRunning } = game;
  const player = agents.find(a => a.id === USER_AGENT.id);

  const [viewport, setViewport] = useState({ scale: 1, offset: { x: 0, y: 0 } });
  const [targetViewport, setTargetViewport] = useState({ scale: 1, offset: { x: 0, y: 0 } });
  const [isAutoViewEnabled, setIsAutoViewEnabled] = useState(true);
  const [isMobileZoomLocked, setIsMobileZoomLocked] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const hasInitializedView = useRef(false);
  const prevSessionId = useRef(sessionId);
  const playerRoomId = player?.roomId;
  const prevPlayerRoomId = useRef(playerRoomId);
  const targetViewportRef = useRef(targetViewport);
  targetViewportRef.current = targetViewport;
  
  // Effect to track window resizes
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      setIsAutoViewEnabled(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (sessionId !== prevSessionId.current) {
      hasInitializedView.current = false;
      prevSessionId.current = sessionId;
    }
  }, [sessionId]);

  useLayoutEffect(() => {
    if (hasInitializedView.current || isWelcomeModalOpen || !viewportRef.current || !player) {
      return;
    }
    
    const viewportWidth = viewportRef.current.offsetWidth;
    const viewportHeight = viewportRef.current.offsetHeight;
    if (viewportWidth === 0 || viewportHeight === 0) return;

    const isMobile = window.innerWidth < 768;
    let newScale: number;
    let newOffsetX: number;
    let newOffsetY: number;

    if (player.roomId && player.roomId !== 'outside') {
        const targetRect = ZONES[player.roomId as keyof typeof ZONES];
        if (!targetRect) return;
        
        const verticalPadding = 250;
        const horizontalPadding = 100;

        const roomWidth = targetRect.x2 - targetRect.x1;
        const roomHeight = targetRect.y2 - targetRect.y1;

        const scaleX = viewportWidth / (roomWidth + horizontalPadding);
        const scaleY = viewportHeight / (roomHeight + verticalPadding);
        
        newScale = Math.min(scaleX, scaleY, 1.5);

        const roomCenterX = targetRect.x1 + roomWidth / 2;
        const roomCenterY = (targetRect.y1 + roomHeight / 2) - 50;

        // --- Viewport Offset Calculation (World Space) ---
        // This is the core logic for centering the camera on a target in world space.
        // 1. `viewportWidth / (2 * newScale)`: This calculates the horizontal center of the screen, but translated into "world units".
        //    For example, if the screen is 800px wide and the scale is 2, the center of the screen in world units is 200 (800 / (2*2)).
        // 2. `roomCenterX`: This is the target's X coordinate in the world.
        // 3. By subtracting the target's world coordinate from the screen's center in world units, we get the necessary offset
        //    to align the two points. The CSS `translate` property then applies this offset.
        newOffsetX = (viewportWidth / (2 * newScale)) - roomCenterX;
        newOffsetY = (viewportHeight / (2 * newScale)) - roomCenterY;
    } else {
        newScale = isMobile ? 1.0 : 0.8;
        newOffsetX = (viewportWidth / (2 * newScale)) - player.position.left;
        newOffsetY = (viewportHeight / (2 * newScale)) - player.position.top;
    }

    const initialViewport = { scale: newScale, offset: { x: newOffsetX, y: newOffsetY } };
    setViewport(initialViewport);
    setTargetViewport(initialViewport);

    hasInitializedView.current = true;
  }, [isWelcomeModalOpen, player?.position.left, player?.position.top, player?.roomId, sessionId, viewportRef, windowSize]);

  useEffect(() => {
    let animationFrameId: number;
    const lerpFactor = 0.15;
    const animate = () => {
      if (!isAnyModalOpen) {
        setViewport(current => {
          const target = targetViewportRef.current;
          const dx = target.offset.x - current.offset.x;
          const dy = target.offset.y - current.offset.y;
          const ds = target.scale - current.scale;
          if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01 && Math.abs(ds) < 0.001) {
            return current.scale !== target.scale || current.offset.x !== target.offset.x || current.offset.y !== target.offset.y ? target : current;
          }
          return { scale: current.scale + ds * lerpFactor, offset: { x: current.offset.x + dx * lerpFactor, y: current.offset.y + dy * lerpFactor } };
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAnyModalOpen]);
  
  useEffect(() => {
    if (!isAutoViewEnabled || !viewportRef.current || !player) {
      return;
    }

    const viewportWidth = viewportRef.current.offsetWidth;
    const viewportHeight = viewportRef.current.offsetHeight;
    if (viewportWidth === 0 || viewportHeight === 0) return;

    const isMobile = windowSize.width < 768;
    let newScale;
    let newOffsetX;
    let newOffsetY;

    if (playerRoomId && playerRoomId !== 'outside') {
        const targetRect = ZONES[playerRoomId as keyof typeof ZONES];
        if (!targetRect) return;
        
        const verticalPadding = 250;
        const horizontalPadding = 100;

        const roomWidth = targetRect.x2 - targetRect.x1;
        const roomHeight = targetRect.y2 - targetRect.y1;

        const scaleX = viewportWidth / (roomWidth + horizontalPadding);
        const scaleY = viewportHeight / (roomHeight + verticalPadding);
        
        newScale = (isMobile && isMobileZoomLocked) ? viewport.scale : Math.min(scaleX, scaleY, 1.5);

        const roomCenterX = targetRect.x1 + roomWidth / 2;
        const roomCenterY = (targetRect.y1 + roomHeight / 2) - 50;

        // --- World Space Offset Calculation (Same as initialization) ---
        // This logic ensures that as the player enters a new room, the camera smoothly
        // transitions to frame that room perfectly, keeping the character centered.
        newOffsetX = (viewportWidth / (2 * newScale)) - roomCenterX;
        newOffsetY = (viewportHeight / (2 * newScale)) - roomCenterY;
    } else {
        newScale = (isMobile && isMobileZoomLocked) ? viewport.scale : (isMobile ? 1.0 : 0.8);
        if (isPlayerRunning && playerRoomId === 'outside') {
            newScale *= 0.85;
        }
        // Center on the player when they are outside.
        newOffsetX = (viewportWidth / (2 * newScale)) - player.position.left;
        newOffsetY = (viewportHeight / (2 * newScale)) - player.position.top;
    }
    
    setTargetViewport({ scale: newScale, offset: { x: newOffsetX, y: newOffsetY } });
    
  }, [
    player?.position.left, 
    player?.position.top, 
    playerRoomId, 
    isAutoViewEnabled, 
    isMobileZoomLocked, 
    isPlayerRunning, 
    windowSize,
    viewport.scale,
    viewportRef,
  ]);


  useEffect(() => {
    if (playerRoomId !== prevPlayerRoomId.current) {
        if (isPlayerBeingDragged) {
            return;
        }
        setIsAutoViewEnabled(true);
        setIsMobileZoomLocked(false);
        prevPlayerRoomId.current = playerRoomId;
    }
  }, [playerRoomId, isPlayerBeingDragged]);

  return { viewport, setViewport, setTargetViewport, isAutoViewEnabled, setIsAutoViewEnabled, isMobileZoomLocked, setIsMobileZoomLocked };
};