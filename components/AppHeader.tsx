import React, { useMemo, useState, useRef, useEffect } from 'react';
import { SettingsIcon, LogIcon, FullscreenEnterIcon, FullscreenExitIcon, InventoryIcon, NetworkIcon, CloseIcon, TaskAltIcon, MenuIcon } from './icons.tsx';
import MasteryHud from './MasteryHud.tsx';
import { useAppStore } from '../hooks/useAppContext.ts';
import type { Artifact } from '../types.ts';
import { shallow } from 'zustand/shallow';

interface ActiveItemDisplayProps {
    artifact: Artifact;
    onUnequip: () => void;
}

const ActiveItemDisplay = ({ artifact, onUnequip }: ActiveItemDisplayProps) => {
    const getIcon = () => {
        switch(artifact.type) {
            case 'image': return '🎨';
            case 'code': return '</>';
            case 'screenplay': return '📜';
            default: return '❓';
        }
    };
    
    const getName = () => {
        switch(artifact.type) {
            case 'image': return `"${artifact.prompt.substring(0, 20)}..."`;
            case 'code': return `Code: "${artifact.prompt.substring(0, 20)}..."`;
            case 'screenplay': return `Script: ${artifact.title}`;
            default: return 'Unknown Item';
        }
    };

    return (
        <div className="flex items-center gap-2 bg-black/30 p-1 pl-3 border-2 border-black" style={{boxShadow: '2px 2px 0px black'}}>
            <span className="text-xl mr-1">{getIcon()}</span>
            <span className="text-lg text-yellow-200 truncate" title={getName()}>{getName()}</span>
            <button onClick={onUnequip} className="pixel-button !p-1 !shadow-none bg-red-700 hover:bg-red-600" aria-label="Unequip item">
                <CloseIcon className="w-5 h-5"/>
            </button>
        </div>
    );
};


interface AppHeaderProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const AppHeader = ({ isFullscreen, onToggleFullscreen }: AppHeaderProps) => {
  const { masteredRooms, isMenuOpen, equippedArtifactId, inventory } = useAppStore(s => ({
    masteredRooms: s.game.masteredRooms,
    isMenuOpen: s.ui.isMenuOpen,
    equippedArtifactId: s.game.equippedArtifactId,
    inventory: s.inventory
  }), shallow);
  const { setUiState, setEquippedArtifact } = useAppStore(s => ({
    setUiState: s.setUiState,
    setEquippedArtifact: s.setEquippedArtifact
  }));

  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);

  const equippedArtifact = useMemo(() => {
    return inventory.find(a => a.id === equippedArtifactId) || null;
  }, [inventory, equippedArtifactId]);

  const handleUnequip = () => {
    setEquippedArtifact(null);
  };
  
  const toggleMenu = () => {
    setUiState({ isMenuOpen: !isMenuOpen });
  };

  const handleMenuAction = (action: () => void) => {
    action();
    setUiState({ isMenuOpen: false });
  };

  useEffect(() => {
    if (isMenuOpen && firstMenuItemRef.current) {
        firstMenuItemRef.current.focus();
    }
  }, [isMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node) && menuButtonRef.current && !menuButtonRef.current.contains(event.target as Node)) {
        setUiState({ isMenuOpen: false });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, setUiState]);
  
  const onOpenLog = () => setUiState({ isLogOpen: true });
  const onOpenSettings = () => setUiState({ isSettingsOpen: true });
  const onOpenInventory = () => setUiState({ isInventoryOpen: true });
  const onOpenSocialGraph = () => setUiState({ isSocialGraphModalOpen: true });
  const onOpenObjectiveTracker = () => setUiState({ isObjectiveTrackerOpen: true });

  return (
    <header className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row sm:justify-between items-center gap-2 p-2 md:p-4 z-10 app-header">
      <h1 className="text-3xl sm:text-4xl md:text-5xl text-yellow-200 tracking-wider">AI Agent Cafe</h1>
      <div className="flex items-center gap-2 md:gap-4">
        {equippedArtifact && <ActiveItemDisplay artifact={equippedArtifact} onUnequip={handleUnequip} />}
        <div className="flex-shrink min-w-0">
            <MasteryHud masteredRooms={masteredRooms} />
        </div>
        <div className="relative">
            <button ref={menuButtonRef} onClick={toggleMenu} className="pixel-button !p-2 md:!p-3" aria-label="Open menu" aria-haspopup="true" aria-expanded={isMenuOpen}>
                <MenuIcon className="w-4 h-4 sm:w-5 h-5 md:w-6 h-6 text-white" />
            </button>

            {isMenuOpen && (
                <div 
                    ref={menuRef}
                    className="absolute top-full right-0 mt-2 w-64 bg-[#3a2d21] border-2 border-black shadow-[4px_4px_0px_black] p-2 z-50 space-y-2"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="menu-button"
                >
                    <button ref={firstMenuItemRef} onClick={() => handleMenuAction(onOpenObjectiveTracker)} className="pixel-button w-full !justify-start !p-2 flex items-center gap-2" role="menuitem">
                        <TaskAltIcon className="w-5 h-5"/> Objectives
                    </button>
                    <button onClick={() => handleMenuAction(onOpenSocialGraph)} className="pixel-button w-full !justify-start !p-2 flex items-center gap-2" role="menuitem">
                        <NetworkIcon className="w-5 h-5"/> Social Graph
                    </button>
                    <button onClick={() => handleMenuAction(onOpenInventory)} className="pixel-button w-full !justify-start !p-2 flex items-center gap-2" role="menuitem">
                        <InventoryIcon className="w-5 h-5"/> Inventory
                    </button>
                    <button onClick={() => handleMenuAction(onOpenLog)} className="pixel-button w-full !justify-start !p-2 flex items-center gap-2" role="menuitem">
                        <LogIcon className="w-5 h-5"/> Chat Log
                    </button>
                    <button onClick={() => handleMenuAction(onOpenSettings)} className="pixel-button w-full !justify-start !p-2 flex items-center gap-2" role="menuitem">
                        <SettingsIcon className="w-5 h-5"/> Settings
                    </button>
                    <button onClick={() => handleMenuAction(onToggleFullscreen)} className="pixel-button w-full !justify-start !p-2 flex items-center gap-2" role="menuitem">
                        {isFullscreen ? <FullscreenExitIcon className="w-5 h-5" /> : <FullscreenEnterIcon className="w-5 h-5" />}
                        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </button>
                </div>
            )}
        </div>
      </div>
    </header>
  );
};
