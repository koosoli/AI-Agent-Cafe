import React, { useEffect, useState } from 'react';
import { InfoIcon } from './icons.tsx';

interface TouchControlsProps {
  visible: boolean;
  onMoveChange: (vector: { x: number; y: number } | null) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterView: () => void;
}

interface DirectionButtonProps {
  label: string;
  direction: { x: number; y: number };
  onMoveChange: (vector: { x: number; y: number } | null) => void;
}

const DirectionButton = ({ label, direction, onMoveChange }: DirectionButtonProps) => {
  const handleStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onMoveChange(direction);
  };

  const handleEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onMoveChange(null);
  };

  return (
    <button
      type="button"
      className="flex h-12 w-12 items-center justify-center rounded-xl border text-xl font-bold transition-transform active:scale-95"
      style={{
        background: 'rgba(58, 45, 33, 0.82)',
        borderColor: 'rgba(214, 192, 160, 0.24)',
        color: '#f8fafc',
        boxShadow: '0 6px 16px rgba(41, 30, 22, 0.18)',
        touchAction: 'none',
      }}
      onPointerDown={handleStart}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
      onPointerLeave={handleEnd}
      aria-label={`Move ${label}`}
    >
      <span aria-hidden="true">{label}</span>
    </button>
  );
};

const TouchControls = ({ visible, onMoveChange, onZoomIn, onZoomOut, onCenterView }: TouchControlsProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const release = () => onMoveChange(null);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);

    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
  }, [visible, onMoveChange]);

  useEffect(() => {
    if (!visible) {
      setIsCollapsed(false);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <aside className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex items-end justify-between gap-3 px-3 md:hidden">
      {isCollapsed ? (
        <button
          type="button"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl border"
          style={{
            background: 'rgba(58, 45, 33, 0.86)',
            borderColor: 'rgba(214, 192, 160, 0.24)',
            color: '#f8fafc',
            boxShadow: '0 6px 16px rgba(41, 30, 22, 0.18)',
            touchAction: 'none',
          }}
          onClick={() => setIsCollapsed(false)}
          aria-label="Show touch controls"
        >
          <InfoIcon className="h-5 w-5" />
        </button>
      ) : (
        <div
          className="pointer-events-auto rounded-2xl border p-3"
          style={{
            background: 'rgba(58, 45, 33, 0.72)',
            borderColor: 'rgba(214, 192, 160, 0.16)',
            boxShadow: '0 8px 20px rgba(41, 30, 22, 0.2)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-200/80">
              <InfoIcon className="h-3.5 w-3.5" />
              <span>Touch Controls</span>
            </div>
            <button
              type="button"
              className="rounded border px-2 py-1 text-[10px] uppercase tracking-[0.16em]"
              style={{
                background: 'rgba(30, 41, 59, 0.78)',
                borderColor: 'rgba(214, 192, 160, 0.22)',
                color: '#f3e7d1',
                touchAction: 'none',
              }}
              onClick={() => setIsCollapsed(true)}
              aria-label="Hide touch controls"
            >
              Hide
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border p-2 retro-inset" style={{ background: 'rgba(15, 23, 42, 0.35)' }}>
            <div />
            <DirectionButton label="^" direction={{ x: 0, y: -1 }} onMoveChange={onMoveChange} />
            <div />
            <DirectionButton label="<" direction={{ x: -1, y: 0 }} onMoveChange={onMoveChange} />
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-xl border text-[11px] uppercase tracking-[0.15em]"
              style={{
                background: 'rgba(74, 54, 38, 0.78)',
                borderColor: 'rgba(214, 192, 160, 0.22)',
                color: '#f3e7d1',
                touchAction: 'none',
              }}
              onClick={onCenterView}
              aria-label="Center camera on player"
            >
              View
            </button>
            <DirectionButton label=">" direction={{ x: 1, y: 0 }} onMoveChange={onMoveChange} />
            <div />
            <DirectionButton label="v" direction={{ x: 0, y: 1 }} onMoveChange={onMoveChange} />
            <div />
          </div>
          <p className="mt-2 text-[11px] text-slate-200/70">
            Tap the world to walk. Pinch or use the side controls to zoom.
          </p>
        </div>
      )}

      <div className="pointer-events-auto flex flex-col gap-2">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl border text-2xl"
          style={{
            background: 'rgba(58, 45, 33, 0.82)',
            borderColor: 'rgba(214, 192, 160, 0.22)',
            color: '#f8fafc',
            boxShadow: '0 6px 16px rgba(41, 30, 22, 0.18)',
            touchAction: 'none',
          }}
          onClick={onZoomIn}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl border text-2xl"
          style={{
            background: 'rgba(58, 45, 33, 0.82)',
            borderColor: 'rgba(214, 192, 160, 0.22)',
            color: '#f8fafc',
            boxShadow: '0 6px 16px rgba(41, 30, 22, 0.18)',
            touchAction: 'none',
          }}
          onClick={onZoomOut}
          aria-label="Zoom out"
        >
          -
        </button>
      </div>
    </aside>
  );
};

export default React.memo(TouchControls);
