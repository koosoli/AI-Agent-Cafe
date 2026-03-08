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

    const handleGamepadConnected = () => {};
    window.addEventListener('gamepadconnected', handleGamepadConnected);

    const pollGamepad = () => {
      try {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gamepad of gamepads) {
          if (!gamepad) continue;

          const mainButtonPressed = gamepad.buttons[0]?.pressed ?? false;
          if (mainButtonPressed && !gamepadButtonPressedRef.current) {
            onClose();
            break;
          }

          gamepadButtonPressedRef.current = mainButtonPressed;
        }
      } catch (error) {
        // Ignore transient gamepad API errors.
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
      <div
        className="pixel-modal w-full max-w-3xl welcome-modal-animation flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-heading"
      >
        <ModalHeader title="Welcome to the AI Agent Cafe!" onClose={onClose} headingId="welcome-heading" />
        <div className="p-4 md:p-6 text-lg md:text-xl space-y-4 overflow-y-auto flex-grow">
          <p>
            This is a living campus of AI mentors. Each room teaches a different skill, and every star comes from showing real improvement.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-black/20 p-4 border-2 border-black">
              <h3 className="text-xl md:text-2xl text-yellow-300 mb-2">First Quest</h3>
              <ul className="space-y-2">
                <li>1. Open <strong className="text-cyan-300">Settings</strong> from the top right and add a Gemini or OpenAI API key.</li>
                <li>2. Move with <strong className="text-green-400">Arrow Keys</strong> or <strong className="text-green-400">WASD</strong>.</li>
                <li>3. Talk to the <strong className="text-yellow-300">Tutorial Agent</strong> in the cafe.</li>
                <li>4. Walk up to <strong className="text-yellow-300">Barry</strong> for a one-on-one chat.</li>
                <li>5. Earn your first star, then pick a room with a new skill to learn.</li>
              </ul>
            </div>

            <div className="bg-black/20 p-4 border-2 border-black">
              <h3 className="text-xl md:text-2xl text-cyan-300 mb-2">Controls</h3>
              <ul className="space-y-2">
                <li>Walk close to one agent for a direct chat.</li>
                <li>Stand in open space to address the whole room.</li>
                <li>Hold <strong className="text-yellow-400">Shift</strong> to run.</li>
                <li>Press <strong className="text-blue-400">Enter</strong> to skip speech.</li>
                <li>Use the <strong className="text-purple-400">mic button</strong> for voice input.</li>
              </ul>
            </div>
          </div>

          <div className="bg-black/20 p-4 border-2 border-black">
            <h3 className="text-xl md:text-2xl text-green-300 mb-2">How Stars Work</h3>
            <p>
              Every room teaches a specific AI skill: research, prompt revision, debate, screenwriting, alignment, or role-play.
              The quest panel tells you the room goal, the next action, and what the judges are looking for.
            </p>
            <p className="mt-3 text-base md:text-lg text-cyan-200">
              If conversations are not working yet, check <strong>Settings</strong> first. The agents need a valid API key to respond.
            </p>
          </div>

          <p>
            Explore deliberately. The fastest way to progress is to treat each room like a lesson, not just a chat.
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
