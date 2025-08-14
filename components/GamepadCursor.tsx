import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../hooks/useAppContext.ts';
import { rumbleClick } from '../services/gamepadService.ts';

const CURSOR_SPEED = 12;
const GAMEPAD_INACTIVITY_TIMEOUT = 3000; // ms

// The style element used to globally hide the cursor
const STYLE_ID = 'gamepad-cursor-style';

interface GamepadCursorProps {
  isAnyModalOpen: boolean;
}

const GamepadCursor = ({ isAnyModalOpen }: GamepadCursorProps) => {
  const setUiState = useAppStore(s => s.setUiState);
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const animationFrameId = useRef<number | null>(null);
  const lastGamepadActivityTime = useRef(0);
  
  // Refs to track button press states to prevent repeated actions
  const gamepadStateRef = useRef({
    clickButtonPressed: false,
    backButtonPressed: false,
    dpadUpPressed: false,
    dpadDownPressed: false,
    dpadLeftPressed: false,
    dpadRightPressed: false,
  });

  const isModalOpenRef = useRef(isAnyModalOpen);
  isModalOpenRef.current = isAnyModalOpen;
  const positionRef = useRef(position);
  positionRef.current = position;
  const isVisibleRef = useRef(isVisible);
  isVisibleRef.current = isVisible;

  // Manages a <style> tag to globally hide the real cursor when the virtual one is active.
  useEffect(() => {
    // On mount, create the style element.
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);

    // On unmount, remove it.
    return () => {
      const el = document.getElementById(STYLE_ID);
      if (el) document.head.removeChild(el);
    };
  }, []);

  // Toggles cursor-hiding style based on visibility state.
  useEffect(() => {
    const styleEl = document.getElementById(STYLE_ID);
    if (styleEl) {
      styleEl.innerHTML = isVisible ? `* { cursor: none !important; }` : ``;
    }
    
    // Fallback for when component unmounts
    return () => {
      document.body.style.cursor = '';
    }
  }, [isVisible]);

  useEffect(() => {
    if (isAnyModalOpen) {
      if (!isVisible) {
        setPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        setIsVisible(true);
      }
    } else {
      if (isVisible) setIsVisible(false);
    }
  }, [isAnyModalOpen, isVisible]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isModalOpenRef.current) {
        setPosition({ x: e.clientX, y: e.clientY });
        if (!isVisibleRef.current) setIsVisible(true);
      } else {
        if (isVisibleRef.current) setIsVisible(false);
      }
    };
    
    const handleMouseDown = () => {
        if (!isModalOpenRef.current && isVisibleRef.current) setIsVisible(false);
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isModalOpenRef.current && isVisibleRef.current && e.key !== 'Tab') setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);

    const gameLoop = () => {
      animationFrameId.current = requestAnimationFrame(gameLoop);
      try {
        const gamepads = navigator.getGamepads();
        const gamepad = Array.from(gamepads).find(p => p);

        if (!gamepad) {
          if (isVisibleRef.current && !isModalOpenRef.current && Date.now() - lastGamepadActivityTime.current > GAMEPAD_INACTIVITY_TIMEOUT) {
            setIsVisible(false);
          }
          return;
        }

        const stickX = gamepad.axes[0] ?? 0;
        const stickY = gamepad.axes[1] ?? 0;
        const deadzone = 0.1;
        
        const dx = Math.abs(stickX) > deadzone ? stickX : 0;
        const dy = Math.abs(stickY) > deadzone ? stickY : 0;
        
        const clickPressed = gamepad.buttons[0]?.pressed ?? false;
        const backPressed = gamepad.buttons[1]?.pressed ?? false;
        const dpadUp = gamepad.buttons[12]?.pressed ?? false;
        const dpadDown = gamepad.buttons[13]?.pressed ?? false;
        const dpadLeft = gamepad.buttons[14]?.pressed ?? false;
        const dpadRight = gamepad.buttons[15]?.pressed ?? false;
        
        const isGamepadActive = dx !== 0 || dy !== 0 || clickPressed || backPressed || dpadUp || dpadDown || dpadLeft || dpadRight;

        if (isGamepadActive) {
          lastGamepadActivityTime.current = Date.now();
          if (!isVisibleRef.current) setIsVisible(true);

          setPosition(prev => ({
            x: Math.max(0, Math.min(window.innerWidth - 1, prev.x + dx * CURSOR_SPEED)),
            y: Math.max(0, Math.min(window.innerHeight - 1, prev.y + dy * CURSOR_SPEED)),
          }));
          
          if (clickPressed && !gamepadStateRef.current.clickButtonPressed) {
            rumbleClick();
            setIsClicking(true);
            setTimeout(() => setIsClicking(false), 150);
            
            const cursorEl = document.getElementById('gamepad-cursor');
            if (cursorEl) cursorEl.style.display = 'none';
            const { x, y } = positionRef.current;
            const element = document.elementFromPoint(x, y);
            if (cursorEl) cursorEl.style.display = '';

            if (element) {
              const clickEvents = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
              clickEvents.forEach(type => {
                  element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
              });
            }
          }
          
          if (backPressed && !gamepadStateRef.current.backButtonPressed) {
            const closeButton = document.querySelector('.pixel-modal button[data-close-button="true"]');
            if (closeButton) {
                rumbleClick();
                (closeButton as HTMLElement).click();
            }
          }
          
          // D-Pad Menu Controls
          if (dpadUp && !gamepadStateRef.current.dpadUpPressed) {
             setUiState({ isSettingsOpen: true });
             rumbleClick();
          }
           if (dpadLeft && !gamepadStateRef.current.dpadLeftPressed) {
             setUiState({ isLogOpen: true });
             rumbleClick();
          }
           if (dpadRight && !gamepadStateRef.current.dpadRightPressed) {
             setUiState({ isInventoryOpen: true });
             rumbleClick();
          }

          gamepadStateRef.current = {
              clickButtonPressed: clickPressed,
              backButtonPressed: backPressed,
              dpadUpPressed: dpadUp,
              dpadDownPressed: dpadDown,
              dpadLeftPressed: dpadLeft,
              dpadRightPressed: dpadRight,
          };

        } else if (isVisibleRef.current && !isModalOpenRef.current && Date.now() - lastGamepadActivityTime.current > GAMEPAD_INACTIVITY_TIMEOUT) {
          setIsVisible(false);
        }

      } catch (e) { /* silent fail */ }
    };

    gameLoop();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setUiState]);

  if (!isVisible) return null;

  return (
    <div
      id="gamepad-cursor"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: 32,
        height: 32,
        zIndex: 10000,
        pointerEvents: 'none',
        transformOrigin: '0 0',
      }}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: '100%',
          transform: isClicking ? 'scale(0.8)' : 'scale(1)',
          transition: 'transform 0.1s ease-out',
          filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.5))',
        }}
      >
        <path
          d="M4.34315 4.34315L13 13M4.34315 4.34315L10.364 19.636L13 13L19.636 10.364L4.34315 4.34315Z"
          stroke="black"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4.34315 4.34315L13 13L10.364 19.636L4.34315 4.34315ZM13 13L19.636 10.364L4.34315 4.34315"
          fill="white"
        />
      </svg>
    </div>
  );
};

export default GamepadCursor;