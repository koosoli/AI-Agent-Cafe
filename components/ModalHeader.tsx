import React from 'react';
import { CloseIcon } from './icons.tsx';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  headingId: string;
}

const ModalHeader = ({ title, onClose, headingId }: ModalHeaderProps) => {
  return (
    <header className="pixel-header flex justify-between items-center p-4">
      <h2 id={headingId} className="text-3xl md:text-4xl">{title}</h2>
      <button 
        onClick={onClose} 
        className="text-white hover:text-red-500 ml-4" 
        data-close-button="true" 
        aria-label={`Close ${title} modal`}
      >
        <CloseIcon className="w-8 h-8" />
      </button>
    </header>
  );
};

export default ModalHeader;
