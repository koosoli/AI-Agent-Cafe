import { useEffect, useRef } from 'react';
import type { Agent } from '../types';
import { USER_AGENT } from '../constants';
import { isPositionValid } from '../services/collisionService';
import { startPlayerWalking, stopPlayerWalking } from '../services/audioService';

const PLAYER_SPEED = 2.5;

export function usePlayerMovement(
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>,
  onPlayerMoved: () => void
) {
  const keysPressed = useRef<Record<string, boolean>>({});
  const animationFrameId = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);
  const isMoving = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      keysPressed.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const gameLoop = (now: number) => {
      if (lastFrameTime.current === 0) {
        lastFrameTime.current = now;
      }

      const deltaTime = now - lastFrameTime.current;
      lastFrameTime.current = now;
      const moveFactor = deltaTime / (1000 / 60);

      let dx = 0;
      let dy = 0;
      if (keysPressed.current['ArrowUp']) dy -= 1;
      if (keysPressed.current['ArrowDown']) dy += 1;
      if (keysPressed.current['ArrowLeft']) dx -= 1;
      if (keysPressed.current['ArrowRight']) dx += 1;
      
      const playerIsTryingToMove = dx !== 0 || dy !== 0;

      if (playerIsTryingToMove) {
        onPlayerMoved();
        setAgents(prevAgents => {
            const player = prevAgents.find(a => a.id === USER_AGENT.id);
            if (!player) return prevAgents;

            const magnitude = Math.sqrt(dx * dx + dy * dy);
            const normDx = magnitude > 0 ? (dx / magnitude) * PLAYER_SPEED * moveFactor : 0;
            const normDy = magnitude > 0 ? (dy / magnitude) * PLAYER_SPEED * moveFactor : 0;

            const newPos = {
              left: player.position.left + normDx,
              top: player.position.top + normDy,
            };

            if (isPositionValid(newPos.left, newPos.top)) {
                if (!isMoving.current) {
                    isMoving.current = true;
                    startPlayerWalking();
                }
                return prevAgents.map(a => a.id === USER_AGENT.id ? { ...a, position: newPos } : a);
            } else {
                if (isMoving.current) {
                    isMoving.current = false;
                    stopPlayerWalking();
                }
                return prevAgents;
            }
        });
      } else {
        if (isMoving.current) {
            isMoving.current = false;
            stopPlayerWalking();
        }
      }

      animationFrameId.current = requestAnimationFrame(gameLoop);
    };
    
    lastFrameTime.current = 0;
    animationFrameId.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
      stopPlayerWalking(); // Ensure sound is stopped on cleanup
    };
  }, [setAgents, onPlayerMoved]);
}
