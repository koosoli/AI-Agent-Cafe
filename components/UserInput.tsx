import React, { useState } from 'react';
import { SendIcon } from './icons';

interface UserInputProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

const UserInput = ({ onSubmit, isLoading }: UserInputProps) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto p-4">
      <div className="flex items-center bg-black/30 p-2 border-2 border-black" style={{boxShadow: '4px 4px 0px black'}}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isLoading ? "Agents are discussing... (you can interrupt)" : "e.g. 'Do aliens exist?' or '@Izzy what do you think?'"}
          rows={2}
          className="flex-grow bg-transparent text-white placeholder-gray-300 text-2xl resize-none focus:outline-none p-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="ml-4 pixel-button bg-green-700 disabled:bg-gray-600"
        >
          <SendIcon className="w-6 h-6" />
        </button>
      </div>
    </form>
  );
};

export default UserInput;
