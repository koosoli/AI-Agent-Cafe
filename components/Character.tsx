
import React from 'react';

interface CharacterProps {
  name: string;
  spriteSeed: string;
  isUser?: boolean;
  isActive: boolean;
  messageText: string | null;
  isConclusion?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

const SpeechBubble = ({ text, isConclusion }: { text: string; isConclusion?: boolean }) => {
  const conclusionStyles = isConclusion ? 'border-green-500 bg-green-200' : 'border-black bg-white';

  return (
    <div className={`absolute bottom-full mb-3 w-64 transform -translate-x-1/2 left-1/2 z-10`}>
      <div className={`relative p-2 rounded-lg border-2 text-xl shadow-lg text-black ${conclusionStyles}`}>
        {isConclusion && <p className="font-bold text-green-700 text-center pb-1">~ Conclusion ~</p>}
        <p className="whitespace-pre-wrap break-words">{text}</p>
        <div 
          className="absolute left-1/2 top-full -translate-x-1/2"
          style={{
            width: 0, height: 0,
            borderTop: `10px solid ${isConclusion ? '#22c55e' : 'black'}`,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
          }}
        />
        <div 
           className="absolute left-1/2 top-full -translate-x-1/2"
           style={{
             width: 0, height: 0,
             marginTop: '-2px',
             borderTop: `10px solid ${isConclusion ? '#86efac' : 'white'}`,
             borderLeft: '10px solid transparent',
             borderRight: '10px solid transparent',
           }}
        />
      </div>
    </div>
  );
};

const Character = ({ name, spriteSeed, isUser = false, isActive, messageText, isConclusion, onMouseDown }: CharacterProps) => {
  const spriteUrl = `https://api.dicebear.com/9.x/pixel-art/svg?seed=${spriteSeed}`;

  return (
    <div 
      className="relative w-20 h-24 flex flex-col items-center justify-end cursor-grab"
      onMouseDown={onMouseDown}
    >
      <div className={`w-20 h-20 relative transition-transform duration-300 ${isActive ? 'talking-animation' : ''}`}>
        <img 
            src={spriteUrl} 
            alt={name} 
            className="w-full h-full object-contain filter drop-shadow-md"
            style={{ pointerEvents: 'none' }} // Prevent img from capturing mouse events
        />
      </div>
      <div className="mt-1 bg-black/50 text-white text-xl px-2 rounded">
        {name}
      </div>
      {isUser && (
        <div className="absolute top-[-20px] left-1/2 -translate-x-1/2">
            <svg width="30" height="30" viewBox="0 0 100 100">
                <polygon points="50,100 0,0 100,0" fill="#00ff00" stroke="black" strokeWidth="5"/>
            </svg>
        </div>
      )}
      {messageText && <SpeechBubble text={messageText} isConclusion={isConclusion}/>}
    </div>
  );
};

export default Character;