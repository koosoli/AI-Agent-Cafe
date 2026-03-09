import { useEffect, useRef } from 'react';
import { USER_AGENT } from '../constants.ts';
import { isPositionValid, getRoomForPosition } from '../services/collisionService.ts';
import { startPlayerWalking, stopPlayerWalking } from '../services/audioService.ts';
import { useAppStore } from './useAppContext.ts';

export function usePlayerMovement(
  onPlayerMoved: () => void,
  moveTarget: { x: number; y: number } | null,
  touchMoveVector: { x: number; y: number } | null,
  clearMoveTarget: () => void,
  onPlayerMoveStart: () => void,
  isModalOpen: boolean,
  onSkip: () => void,
  agentElementRefs: React.RefObject<Map<string, HTMLDivElement | null>>
) {
  const keysPressed = useRef<Record<string, boolean>>({});
  const animationFrameId = useRef<number | null>(null);
  const isMoving = useRef(false);
  const gamepadSkipButtonPressed = useRef(false);
  const gamepadListenButtonPressed = useRef(false);
  const lastGamepadListenTime = useRef(0);

  const setUiState = useAppStore(s => s.setUiState);
  const setGameState = useAppStore(s => s.setGameState);
  const setAgents = useAppStore(s => s.setAgents);
  const moveTargetRef = useRef(moveTarget);
  const touchMoveVectorRef = useRef(touchMoveVector);
  const clearMoveTargetRef = useRef(clearMoveTarget);
  const onPlayerMovedRef = useRef(onPlayerMoved);
  const onPlayerMoveStartRef = useRef(onPlayerMoveStart);
  const onSkipRef = useRef(onSkip);
  const isModalOpenRef = useRef(isModalOpen);

  const latestState = useRef(useAppStore.getState());
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(newState => {
        latestState.current = newState;
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    moveTargetRef.current = moveTarget;
    touchMoveVectorRef.current = touchMoveVector;
    clearMoveTargetRef.current = clearMoveTarget;
    onPlayerMovedRef.current = onPlayerMoved;
    onPlayerMoveStartRef.current = onPlayerMoveStart;
    onSkipRef.current = onSkip;
    isModalOpenRef.current = isModalOpen;
  }, [moveTarget, touchMoveVector, clearMoveTarget, onPlayerMoved, onPlayerMoveStart, onSkip, isModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      
      const key = e.key.toLowerCase();
      if (key === 'shift') keysPressed.current[key] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
        keysPressed.current[key] = true;
      }

      if (key === 'enter' || e.key === 'Escape') {
        e.preventDefault();
        onSkipRef.current();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const gameLoop = () => {
        if (isModalOpenRef.current) {
          if (isMoving.current) {
            isMoving.current = false;
            stopPlayerWalking();
          }
          animationFrameId.current = requestAnimationFrame(gameLoop);
          return;
        }

        let dx = 0;
        let dy = 0;
        let isRunning = false;
        let hasMoveIntent = false;

        const currentState = latestState.current;
        const player = currentState.agents.find(a => a.id === USER_AGENT.id);

        // --- Keyboard & Gamepad Input ---
        const keyMove = {
            up: keysPressed.current['arrowup'] || keysPressed.current['w'],
            down: keysPressed.current['arrowdown'] || keysPressed.current['s'],
            left: keysPressed.current['arrowleft'] || keysPressed.current['a'],
            right: keysPressed.current['arrowright'] || keysPressed.current['d'],
        };
        if (keyMove.up) dy -= 1;
        if (keyMove.down) dy += 1;
        if (keyMove.left) dx -= 1;
        if (keyMove.right) dx += 1;
        if (touchMoveVectorRef.current) {
            dx += touchMoveVectorRef.current.x;
            dy += touchMoveVectorRef.current.y;
        }
        
        let runFromGamepad = false;
        if (navigator.getGamepads) {
            try {
                const gamepads = navigator.getGamepads();
                for (const gamepad of gamepads) {
                    if (!gamepad) continue; 
                    const stickX = gamepad.axes[0] ?? 0;
                    const stickY = gamepad.axes[1] ?? 0;
                    const deadzone = 0.2;
                    if (Math.abs(stickX) > deadzone) dx = stickX;
                    if (Math.abs(stickY) > deadzone) dy = stickY;
                    if (gamepad.buttons[0]?.pressed) runFromGamepad = true;
                    // Other gamepad button logic... (skip, listen)
                    const skipButtonPressed = gamepad.buttons[1]?.pressed ?? false;
                    if (!currentState.ui.isAnyModalOpen && skipButtonPressed && !gamepadSkipButtonPressed.current) {
                        onSkipRef.current();
                        gamepadSkipButtonPressed.current = true;
                    } else if (!skipButtonPressed) {
                        gamepadSkipButtonPressed.current = false;
                    }
                    const listenButtonPressed = gamepad.buttons[3]?.pressed ?? false;
                    if (!currentState.ui.isAnyModalOpen && listenButtonPressed && !gamepadListenButtonPressed.current) {
                        const now = Date.now();
                        if (now - lastGamepadListenTime.current > 1000) {
                            setUiState({ isListeningForSpeech: !currentState.ui.isListeningForSpeech });
                            lastGamepadListenTime.current = now;
                        }
                        gamepadListenButtonPressed.current = true;
                    } else if (!listenButtonPressed) {
                        gamepadListenButtonPressed.current = false;
                    }
                    if (dx !== 0 || dy !== 0) break;
                }
            } catch(e) { console.warn("Could not process gamepad input:", e); }
        }

        const manualMoveMagnitude = Math.hypot(dx, dy);
        if (manualMoveMagnitude > 0) {
            hasMoveIntent = true;
            clearMoveTargetRef.current(); // Manual movement cancels click-to-move
            isRunning = keysPressed.current['shift'] || runFromGamepad;
            const speed = isRunning ? currentState.game.playerSpeed * currentState.game.runMultiplier : currentState.game.playerSpeed;
            dx = (dx / manualMoveMagnitude) * speed;
            dy = (dy / manualMoveMagnitude) * speed;
        } else if (moveTargetRef.current && player) {
            const SNAP_DISTANCE = 10;
            const targetDx = moveTargetRef.current.x - player.position.left;
            const targetDy = moveTargetRef.current.y - player.position.top;
            const distanceToTarget = Math.hypot(targetDx, targetDy);

            if (distanceToTarget < SNAP_DISTANCE) {
                const finalPos = { left: moveTargetRef.current.x, top: moveTargetRef.current.y };
                const newRoomId = getRoomForPosition(finalPos.left, finalPos.top);
                const newAgents = latestState.current.agents.map(a =>
                    a.id === USER_AGENT.id ? { ...a, position: finalPos, roomId: newRoomId } : a
                );
                setAgents(newAgents);
                clearMoveTargetRef.current();
                hasMoveIntent = false;
            } else {
                hasMoveIntent = true;
                isRunning = true;
                const baseSpeed = currentState.game.playerSpeed * currentState.game.runMultiplier;
                const speed = Math.min(baseSpeed, distanceToTarget * 0.15 + 4); // Easing with slightly faster approach
                dx = (targetDx / distanceToTarget) * speed;
                dy = (targetDy / distanceToTarget) * speed;
            }
        }
        
        // --- Movement Application & Audio ---
        if (hasMoveIntent) {
            onPlayerMovedRef.current();
            if (!isMoving.current) {
                isMoving.current = true;
                onPlayerMoveStartRef.current();
            }
            startPlayerWalking(isRunning);
        } else {
            if (isMoving.current) {
                isMoving.current = false;
                stopPlayerWalking();
            }
            animationFrameId.current = requestAnimationFrame(gameLoop);
            return;
        }

        const isActuallyMoving = dx !== 0 || dy !== 0;
        const isPlayerRunning = isActuallyMoving && isRunning;
        if (isPlayerRunning !== currentState.game.isPlayerRunning) {
          setGameState({ isPlayerRunning });
        }

        if (isActuallyMoving && player) {
            const newPos = { left: player.position.left, top: player.position.top };
            
            const tempXPos = { ...newPos, left: newPos.left + dx };
            if (isPositionValid(tempXPos.left, tempXPos.top, false, player)) {
                newPos.left = tempXPos.left;
            }
            
            const tempYPos = { ...newPos, top: newPos.top + dy };
            if (isPositionValid(newPos.left, tempYPos.top, false, player)) {
                newPos.top = tempYPos.top;
            }

            if (newPos.left !== player.position.left || newPos.top !== player.position.top) {
                const newRoomId = getRoomForPosition(newPos.left, newPos.top);
                const newAgents = latestState.current.agents.map(a =>
                    a.id === USER_AGENT.id
                      ? { ...a, position: newPos, roomId: newRoomId }
                      : a
                );
                setAgents(newAgents);
            }
        }
        
        animationFrameId.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setUiState, setGameState, setAgents, agentElementRefs]);
}
