import React, { useEffect, useRef } from 'react';
import ModalHeader from './ModalHeader.tsx';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal = ({ isOpen, onClose }: WelcomeModalProps) => {
  const gamepadButtonPressedRef = useRef(false);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // This event listener helps "wake up" the Gamepad API in Firefox.
    // The polling loop below will then be able to see the connected controller.
    const handleGamepadConnected = () => {
        // We don't need to do anything here; the polling loop will handle it.
        // The simple act of listening for the event is often enough for Firefox.
    };
    window.addEventListener('gamepadconnected', handleGamepadConnected);

    // Gamepad polling loop
    const pollGamepad = () => {
      try {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gamepad of gamepads) {
          if (!gamepad) continue;

          // Main button on most controllers (A on Xbox, X on PlayStation)
          const mainButtonPressed = gamepad.buttons[0]?.pressed ?? false;
          
          if (mainButtonPressed && !gamepadButtonPressedRef.current) {
            onClose();
            // We can break here since we've acted.
            break;
          }
          
          gamepadButtonPressedRef.current = mainButtonPressed;
        }
      } catch (e) {
        // Silently ignore gamepad errors
      }
      
      animationFrameId.current = requestAnimationFrame(pollGamepad);
    };
    
    animationFrameId.current = requestAnimationFrame(pollGamepad);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div
        className="pixel-modal w-full max-w-2xl welcome-modal-animation flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-heading"
      >
        <ModalHeader title="Welcome to the AI Agent Cafe!" onClose={onClose} headingId="welcome-heading" />
        <div className="p-4 md:p-6 text-lg md:text-xl space-y-4 overflow-y-auto flex-grow">
          <p>
            This is a living world where AI agents discuss topics you provide. Explore different buildings to change the conversation!
          </p>
          <div className="bg-black/20 p-4 border-2 border-black">
            <h3 className="text-xl md:text-2xl text-yellow-300 mb-2">How to Play:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Use the <strong className="text-green-400">Arrow Keys</strong> or <strong className='text-green-400'>WASD</strong> to walk around the world.</li>
              <li>Hold <strong className="text-yellow-400">Shift</strong> while moving to run.</li>
              <li>Enable <strong className="text-pink-400">Agent Voices</strong> in Settings to hear them speak (off by default).</li>
              <li>Press <strong className="text-blue-400">Enter/Esc</strong> or <strong className="text-blue-400">Gamepad 'B' / '○'</strong> to skip the current speech bubble.</li>
              <li>Click the <strong className="text-purple-400">Mic icon</strong> or press <strong className="text-purple-400">Gamepad 'Y' / '△'</strong> to dictate your prompts.</li>
              <li>Enter a building to start a discussion with the agents inside.</li>
              <li>Walk close to a single agent to chat with them one-on-one.</li>
              <li><strong className='text-yellow-400'>Master Each Room:</strong> Each room has a hidden challenge. Impress the AI judges with your prompts to complete it and earn a star!</li>
              <li><strong className='text-yellow-400'>Double-click</strong> an agent to edit their persona directly.</li>
              <li>Drag agents to move them, or drag them to the <strong className='text-red-500'>trash can</strong> to delete.</li>
              <li>Click the <strong className="text-yellow-400">Settings</strong> icon for global options and to add new agents.</li>
            </ul>
          </div>
          <p>
            The world is alive. What will you discover?
          </p>
        </div>
        <div className="p-4 border-t-2 border-black mt-auto">
          <button onClick={onClose} className="pixel-button bg-green-700 w-full text-xl md:text-2xl">
            Start Exploring
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
