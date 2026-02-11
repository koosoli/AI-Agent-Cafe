import React from 'react';
import { UserInput } from './UserInput.tsx';

interface AppFooterProps {
  userInputRef: React.RefObject<HTMLTextAreaElement>;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

const AppFooter = ({ userInputRef, onSubmit, onCancel }: AppFooterProps) => {
  return (
    <footer className="w-full z-10">
      <UserInput 
        ref={userInputRef}
        onSubmit={onSubmit} 
        onCancel={onCancel}
      />
    </footer>
  );
};

export default AppFooter;