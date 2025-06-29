import React from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal = ({ isOpen, onClose }: WelcomeModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="pixel-modal w-full max-w-2xl welcome-modal-animation">
        <header className="pixel-header p-4">
          <h2 className="text-4xl">Welcome to the AI Agent Cafe!</h2>
        </header>
        <div className="p-6 text-xl space-y-4">
          <p>
            In this virtual space, you can assign different personas to AI agents and watch them discuss topics you provide.
          </p>
          <div className="bg-black/20 p-4 border-2 border-black">
            <h3 className="text-2xl text-yellow-300 mb-2">How to Play:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Type a topic in the input box below and press Enter to start a discussion.</li>
              <li>Use the <strong className="text-green-400">Arrow Keys</strong> to move your character.</li>
              <li>Click the <strong className="text-yellow-400">Settings</strong> icon to configure agents, scenarios, and audio.</li>
              <li>You can drag agents (except your own) or pan the view by dragging the background.</li>
            </ul>
          </div>
          <p>
            The stage is set, the agents are waiting. What will they talk about?
          </p>
        </div>
        <div className="p-4 border-t-2 border-black">
          <button onClick={onClose} className="pixel-button bg-green-700 w-full text-2xl">
            Start
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;