import React, { useState, useEffect, useRef } from 'react';
import { isPositionValid } from '../services/collisionService.ts';
import { ZONES, DOOR_POSITIONS, INTERACTIVE_OBJECTS } from '../data/layout.ts';
import type { DojoBelt, WorldImageArtifact } from '../types.ts';

// --- Particle System for Fountain ---

interface ParticleState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number;
  maxLifetime: number;
  size: number;
  opacity: number;
}

const useFountainParticleSystem = () => {
  const [particles, setParticles] = useState<ParticleState[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const lastParticleId = useRef(0);

  const options = {
    particleCount: 50,
    gravity: 0.08,
    origin: { x: 1498, y: 1365 }, // Top of fountain spout: left(1450) + width(100)/2 - adjustment, top(1325) + spoutY(40)
    destinationY: 1395, // Water level in basin
    initialVelocity: () => ({ vx: (Math.random() - 0.5) * 0.8, vy: -1.5 - Math.random() * 0.8 }),
    lifetime: () => 40 + Math.random() * 20,
    size: () => 4 + Math.random() * 2,
  };

  useEffect(() => {
    const createParticle = () => {
      const { vx, vy } = options.initialVelocity();
      const maxLifetime = options.lifetime();
      return {
        id: lastParticleId.current++,
        x: options.origin.x + (Math.random() - 0.5) * 5,
        y: options.origin.y,
        vx,
        vy,
        lifetime: maxLifetime,
        maxLifetime,
        size: options.size(),
        opacity: 0,
      };
    };

    const update = () => {
      setParticles(prevParticles => {
        let newParticles = prevParticles
          .map(p => {
            if (p.y > options.destinationY) {
              return { ...p, lifetime: 0 };
            }
            const newLifetime = p.lifetime - 1;
            const newVy = p.vy + options.gravity;
            return {
              ...p,
              x: p.x + p.vx,
              y: p.y + newVy,
              vy: newVy,
              lifetime: newLifetime,
              opacity: Math.max(0, Math.min(1, (1 - newLifetime / p.maxLifetime) * 2, (newLifetime / p.maxLifetime) * 2)),
            };
          })
          .filter(p => p.lifetime > 0);
        
        const needed = options.particleCount - newParticles.length;
        for (let i = 0; i < needed; i++) {
          newParticles.push(createParticle());
        }
        
        return newParticles;
      });

      animationFrameId.current = requestAnimationFrame(update);
    };
    animationFrameId.current = requestAnimationFrame(update);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []); // Empty dependency array ensures this runs only once

  return particles;
};

const FountainParticles = () => {
  const particles = useFountainParticleSystem();
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1001 }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: 'rgba(200, 230, 255, 0.8)',
            borderRadius: '50%',
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
};


// --- Detailed Pixel Art Components ---

const PixelFlower = ({ style, color1, color2, sparkling = false, sparkleDelay = '0s' }: { style: React.CSSProperties; color1: string; color2: string; sparkling?: boolean; sparkleDelay?: string }) => (
    <div
        className={sparkling ? 'sparkle-effect' : ''}
        style={{
            ...style,
            position: 'absolute',
            zIndex: Math.floor(((style.top as number) || 0) / 10),
            '--sparkle-delay': sparkleDelay,
        } as React.CSSProperties}
    >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#228b22" d="M7,12h2v4h-2z" /> {/* Stem */}
            <path fill={color1} d="M6,6h4v4h-4z" /> {/* Center */}
            <path fill={color2} d="M6,4h4v2h-4z M10,6h2v4h-2z M6,10h4v2h-4z M4,6h2v4h-2z" /> {/* Petals */}
        </svg>
    </div>
);

const PixelBush = ({ style, swaying = false }: { style: React.CSSProperties, swaying?: boolean }) => (
    <div 
        style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) + ((style.height as number) || 0)) / 10) }}
        className={swaying ? 'sway-animation' : ''}
    >
        <div className="bg-black/25" style={{ position: 'absolute', bottom: -2, left: '15%', width: '70%', height: 8, borderRadius: '50%', filter: 'blur(1px)' }}></div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#2a552a" d="M5,10h30v15h-30z M10,5h20v5h-20z M2,15h3v5h-3z M35,15h3v5h-3z" />
            <path fill="#3e703e" d="M6,11h28v10h-28z M11,6h18v4h-18z M3,16h2v3h-2z M35,16h2v3h-2z" />
            <path fill="#508c50" d="M10,13h20v6h-20z M14,8h12v2h-12z" />
        </svg>
    </div>
);

const PixelTree = ({ style, leafColor = 'green', swaying = false }: { style: React.CSSProperties, leafColor?: 'green' | 'orange' | 'yellow' | 'red', swaying?: boolean }) => {
    const colors = {
        green: { l1: '#2a552a', l2: '#3e703e', l3: '#508c50' },
        orange: { l1: '#b95000', l2: '#d97706', l3: '#f59e0b' },
        yellow: { l1: '#c8a815', l2: '#eacc15', l3: '#fde047' },
        red: { l1: '#a42626', l2: '#dc2626', l3: '#ef4444' },
    };
    const c = colors[leafColor];
    return (
        <div 
            style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) + ((style.height as number) || 0)) / 10) }}
            className={swaying ? 'sway-animation' : ''}
        >
            <div className="bg-black/25" style={{ position: 'absolute', bottom: -2, left: '15%', width: '70%', height: 10, borderRadius: '50%', filter: 'blur(2px)' }}></div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
                <path fill="#593d2b" d="M14,32h4v8h-4z" />
                <path fill={c.l1} d="M5,15h22v15h-22z M10,10h12v5h-12z M12,5h8v5h-8z M1,20h4v5h-4z M27,20h4v5h-4z M13,30h6v2h-6z" />
                <path fill={c.l2} d="M6,16h20v10h-20z M11,11h10v5h-10z M13,6h6v5h-6z M2,21h3v3h-3z M27,21h3v3h-3z" />
                <path fill={c.l3} d="M8,17h16v6h-16z M12,12h8v4h-8z M14,7h4v4h-4z" />
            </svg>
        </div>
    );
};

const Fountain = ({ style }: { style: React.CSSProperties }) => (
    <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#a0a0a0" d="M20,70h60v10h-60z M30,60h40v10h-40z M10,80h80v10h-80z"/>
            <path fill="#808080" d="M20,70h60v2h-60z M30,60h40v2h-40z M10,80h80v2h-80z"/>
            <path fill="#c0c0c0" d="M22,72h56v6h-56z M32,62h36v6h-36z M12,82h76v6h-76z"/>
            <path fill="#50a0d0" d="M25,70h50v-10h-50z M35,60h30v-10h-30z"/>
            <path fill="#80c0f0" d="M27,68h46v-8h-46z M37,58h26v-8h-26z"/>
            <path fill="#fff" d="M45,50h10v-10h-10z M48,40h4v-10h-4z"/>
        </svg>
    </div>
);

const Bench = ({ style }: { style: React.CSSProperties }) => (
    <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 24" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#6b4a2e" d="M0,8h80v8h-80z"/>
            <path fill="#593d2b" d="M0,16h80v4h-80z M10,20h12v4h-12z M58,20h12v4h-12z"/>
        </svg>
    </div>
);

const ReceptionDesk = ({ style }: { style: React.CSSProperties }) => (
    <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 50" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#f8f9fa" d="M0,10h350v30h-350z" />
            <path fill="#e9ecef" d="M0,10h350v5h-350z" />
            <path fill="#ced4da" d="M0,40h350v10h-350z" />
            <path fill="#adb5bd" d="M0,38h350v2h-350z" />
            <path fill="#adb5bd" d="M20,42h5v6h-5z M80,42h5v6h-5z M140,42h5v6h-5z M200,42h5v6h-5z M260,42h5v6h-5z M320,42h5v6h-5z" />
        </svg>
    </div>
);

const OfficeDesk = ({ style }: { style: React.CSSProperties }) => (
  <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) }}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
      <path fill="#8b5e34" d="M0,0h160v10h-160z"/>
      <path fill="#6b4a2e" d="M0,0h160v2h-160z M5,10h10v40h-10z M145,10h10v40h-10z"/>
    </svg>
  </div>
);

const Computer = ({ style }: { style: React.CSSProperties }) => (
    <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) + 1 }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 45" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#333" d="M0,0h50v35h-50z" />
            <path fill="#555" d="M5,5h40v25h-40z" />
            <path fill="#87ceeb" d="M7,7h36v21h-36z" />
            <path fill="#222" d="M20,35h10v5h-10z M10,40h30v5h-30z" />
        </svg>
    </div>
);

const InteractiveTerminal = ({ style, glowing, onClick, label }: { style: React.CSSProperties; glowing?: boolean; onClick?: (e: React.MouseEvent) => void; label: string; }) => (
    <div
        className={glowing ? 'easel-animation' : ''}
        style={{
            position: 'absolute',
            ...style,
            zIndex: Math.floor(((style.top as number) || 0) / 10),
            ...(onClick && { pointerEvents: 'all', cursor: 'pointer' }),
        }}
        onClick={onClick}
        role="button"
        aria-label={label}
        tabIndex={0}
    >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 70" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            {/* Main Body */}
            <path fill="#333" d="M0,0h50v60h-50z" />
            <path fill="#222" d="M5,5h40v50h-40z" />
            {/* Screen */}
            <path fill="#1a1a1a" d="M10,10h30v30h-30z" />
            <path fill="#0d47a1" d="M12,12h26v26h-26z" />
            <path fill="#1976d2" d="M15,15h3v2h-3z M20,15h12v2h-12z M15,20h10v2h-10z" />
            {/* Keyboard area */}
            <path fill="#555" d="M5,45h40v10h-40z"/>
            {/* Stand */}
            <path fill="#444" d="M20,60h10v10h-10z"/>
        </svg>
    </div>
);


const Whiteboard = ({ style }: { style: React.CSSProperties }) => (
    <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) -1 }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#333" d="M0,0h100v50h-100z" />
            <path fill="#fff" d="M5,5h90v40h-90z" />
            <path fill="#ddd" d="M48,50h4v10h-4z M20,55h60v5h-60z" />
        </svg>
    </div>
);

const RoundCafeTable = ({ style }: { style: React.CSSProperties }) => (
  <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) }}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
      <circle cx="30" cy="30" r="28" fill="#6e5a49"/>
      <circle cx="30" cy="30" r="25" fill="#8b5e34"/>
      <rect x="27" y="27" width="6" height="6" fill="#593d2b"/>
    </svg>
  </div>
);

const Chair = ({ style, facing = 'up' }: { style: React.CSSProperties, facing?: 'up' | 'down' }) => (
  <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10)}}>
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
      {facing === 'up' && <path d="M0 5 H40 V15 H0 Z" fill="#6b4a2e"/>}
      <path d={facing === 'up' ? "M5 15 H35 V35 H5 Z" : "M5 5 H35 V25 H5 Z"} fill="#8b5e34" />
      <path d={facing === 'up' ? "M8 18 H32 V32 H8 Z" : "M8 8 H32 V22 H8 Z" } fill="#a0522d" />
      {facing === 'down' && <path d="M0 25 H40 V35 H0 Z" fill="#6b4a2e"/>}
     </svg>
  </div>
);


const DnDTable = ({ style }: { style: React.CSSProperties }) => (
  <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) }}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
      <path fill="#593d2b" d="M10,0h280v200h-280z"/>
      <path fill="#8b5e34" d="M20,10h260v180h-260z"/>
      {/* Map */}
      <path fill="#d2b48c" d="M50,40h200v120h-200z" />
      <path fill="#228b22" d="M70,60h50v40h-50z" />
      <path fill="#4682b4" d="M150,90h80v50h-80z" />
    </svg>
  </div>
);

const Bookshelf = ({ style }: { style: React.CSSProperties }) => (
  <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) -1 }}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 150" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
      <path fill="#8b5e34" d="M0,0h30v150h-30z"/>
      <path fill="#593d2b" d="M5,10h20v130h-20z"/>
      {/* Books */}
      <path fill="#b22222" d="M7,15h5v15h-5z"/> <path fill="#228b22" d="M13,15h6v15h-6z"/>
      <path fill="#4682b4" d="M7,35h8v15h-8z"/> <path fill="#daa520" d="M16,35h4v15h-4z"/>
      <path fill="#4b0082" d="M7,55h4v15h-4z"/> <path fill="#2f4f4f" d="M12,55h8v15h-8z"/>
       <path fill="#b22222" d="M7,75h5v15h-5z"/> <path fill="#228b22" d="M13,75h6v15h-6z"/>
      <path fill="#4682b4" d="M7,95h8v15h-8z"/> <path fill="#daa520" d="M16,95h4v15h-4z"/>
    </svg>
  </div>
);

const CoffeeMachine = ({ style }: { style: React.CSSProperties }) => (
    <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) + 1 }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#4a4a4a" d="M0,0h40v50h-40z" />
            <path fill="#333" d="M5,5h30v40h-30z" />
            <path fill="#ddd" d="M10,10h20v5h-20z" />
            <path fill="#f00" d="M15,12h2v2h-2z" />
            <path fill="#0f0" d="M23,12h2v2h-2z" />
            <path fill="#777" d="M10,20h5v15h-5z" />
        </svg>
    </div>
);


const CounterSegment = ({ style }: { style: React.CSSProperties }) => (
    <div style={{ 
        position: 'absolute', 
        ...style, 
        zIndex: Math.floor(((style.top as number) || 0) / 10), 
        backgroundColor: '#8b5e34',
        boxSizing: 'border-box',
        borderTop: '15px solid #a0522d',
        borderBottom: '10px solid #6b4a2e',
        borderLeft: '8px solid #6b4a2e',
        borderRight: '8px solid #6b4a2e',
    }}>
    </div>
);

const StudentDesk = ({ style }: { style: React.CSSProperties }) => (
    <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 40" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#a0522d" d="M0,0h70v25h-70z" />
            <path fill="#8b5e34" d="M5,5h60v15h-60z" />
            <path fill="#6b4a2e" d="M5,25h10v15h-10z M55,25h10v15h-10z" />
        </svg>
    </div>
);

const Blackboard = ({ style }: { style: React.CSSProperties }) => (
    <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) -1 }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#593d2b" d="M0,0h200v100h-200z" />
            <path fill="#364531" d="M10,10h180v80h-180z" />
        </svg>
    </div>
);

const ServerRack = ({ style }: { style: React.CSSProperties }) => (
    <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) -1 }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 150" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#333" d="M0,0h50v150h-50z"/>
            <path fill="#222" d="M5,5h40v140h-40z"/>
            {[...Array(13)].map((_, i) => (
                <path key={i} fill="#444" d={`M10,${10 + i * 10}h30v5h-30z`} />
            ))}
             <path fill="#f00" d="M12,15h2v2h-2z" />
             <path fill="#0f0" d="M12,25h2v2h-2z" />
             <path fill="#0f0" d="M12,55h2v2h-2z" />
             <path fill="#f00" d="M12,85h2v2h-2z" />
             <path fill="#0f0" d="M12,125h2v2h-2z" />
        </svg>
    </div>
);

const Easel = ({ style, glowing, onClick, imageUrl, label }: { style: React.CSSProperties; glowing?: boolean; onClick?: (e: React.MouseEvent) => void, imageUrl?: string | null, label: string }) => (
    <div
        className={glowing ? 'easel-animation' : ''}
        style={{
            position: 'absolute',
            ...style,
            zIndex: Math.floor(((style.top as number) || 0) / 10),
            ...(onClick && { pointerEvents: 'all', cursor: 'pointer' }),
        }}
        onClick={onClick}
        role="button"
        aria-label={label}
        tabIndex={0}
    >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 100" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            {/* Frame */}
            <path fill="#8b5e34" d="M22,90h6v10h-6z M10,95h30v5h-30z" />
            <path fill="#a0522d" d="M5,10h40v60h-40z M2,70h46v5h-46z" />
            {/* Canvas */}
            <path fill="#f0e68c" d="M10,15h30v50h-30z" />
            {/* Displayed Image */}
            {imageUrl && (
                <image href={imageUrl} x="10" y="15" width="30" height="50" preserveAspectRatio="xMidYMid slice" />
            )}
        </svg>
    </div>
);

const InteractiveGameBoard = ({ style, glowing, onClick, label }: { style: React.CSSProperties; glowing?: boolean; onClick?: (e: React.MouseEvent) => void, label: string }) => (
    <div
        className={glowing ? 'easel-animation' : ''}
        style={{
            position: 'absolute',
            ...style,
            zIndex: Math.floor(((style.top as number) || 0) / 10) + 1,
            ...(onClick && { pointerEvents: 'all', cursor: 'pointer' }),
        }}
        onClick={onClick}
        role="button"
        aria-label={label}
        tabIndex={0}
    >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#d2b48c" d="M0,0h50v50h-50z" />
            <path fill="#8b5e34" d="M5,5h40v40h-40z" />
            <path fill="#228b22" d="M10,10h10v10h-10z M30,30h10v10h-10z" />
            <path fill="#4682b4" d="M30,10h10v10h-10z M10,30h10v10h-10z" />
            <path fill="#b22222" d="M22,22h6v6h-6z" />
        </svg>
    </div>
);


const StoneLantern = ({ style }: { style: React.CSSProperties }) => (
    <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 50" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#8a8a8a" d="M5,45h20v5h-20z"/>
            <path fill="#9d9d9d" d="M12,25h6v20h-6z"/>
            <path fill="#6b6b6b" d="M0,15h30v10h-30z"/>
            <path fill="#505050" d="M0,5h30v10h-30z M5,0h20v5h-20z"/>
            <path fill="#fef08a" d="M8,18h14v4h-14z"/>
        </svg>
    </div>
);

const LilyPad = ({ style }: { style: React.CSSProperties }) => (
    <div style={{...style, position: 'absolute'}}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path fill="#228b22" d="M10,2c-4.4,0-8,3.6-8,8s3.6,8,8,8s8-3.6,8-8S14.4,2,10,2z"/>
            <path fill="#3cb371" d="M10,4c-3.3,0-6,2.7-6,6s2.7,6,6,6s6-2.7,6-6S13.3,4,10,4z"/>
            <path fill="#4682b4" d="M10,10 L18,15 L15,18 z" />
        </svg>
    </div>
);

const Pond = ({ style }: { style: React.CSSProperties }) => (
    <div className="absolute river-animation" style={{
        ...style,
        backgroundColor: '#4682b4',
        borderRadius: '50% 30% 40% 60% / 60% 40% 50% 30%',
        zIndex: 0,
        border: '5px solid #6b4a2e',
        boxShadow: 'inset 0 0 15px rgba(0,0,0,0.3)',
    }}>
        <LilyPad style={{ top: '30%', left: '20%', width: 30, height: 30, transform: 'rotate(15deg)' }}/>
        <LilyPad style={{ top: '60%', left: '70%', width: 40, height: 40, transform: 'rotate(-25deg)' }}/>
        <LilyPad style={{ top: '40%', left: '50%', width: 25, height: 25, transform: 'rotate(45deg)' }}/>
    </div>
);

const WoodFloorTexture = ({ color = '#d1b897' }: { color?: string }) => (
    <div className="absolute w-full h-full" style={{
        backgroundColor: color,
        backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.07) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        imageRendering: 'pixelated',
    }}></div>
);

const StoneFloorTexture = () => (
    <div className="absolute w-full h-full" style={{
        backgroundColor: '#78716c', // stone-500
        backgroundImage: `
            linear-gradient(90deg, #57534e 1px, transparent 1px),
            linear-gradient(#57534e 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        imageRendering: 'pixelated'
    }}></div>
);

const TatamiFloorTexture = () => (
    <div className="absolute w-full h-full" style={{
        backgroundColor: '#e4d8b4', // A light straw color
        backgroundImage: `
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '100px 50px', // Rectangular mats
        imageRendering: 'pixelated'
    }}></div>
);

const TrainingDummy = ({ style }: { style: React.CSSProperties }) => (
    <div style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 70" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}>
            <path d="M10 0 H20 V60 H10 Z" fill="#8b5e34" />
            <path d="M11 0 H19 V59 H11 Z" fill="#a0522d" />
            <path d="M0 20 H30 V30 H0 Z" fill="#8b5e34" />
            <path d="M1 21 H29 V29 H1 Z" fill="#a0522d" />
            <path d="M5 60 H25 V70 H5 Z" fill="#6b4a2e" />
        </svg>
    </div>
);

const DoorPath = ({ style }: { style: React.CSSProperties }) => (
    <div className="absolute cobblestone-path" style={{ ...style, zIndex: 0 }}></div>
);

interface SceneryProps {
    playerRoomId: string | undefined;
    onArtEaselClick: () => void;
    onGroundingComputerClick: () => void;
    onVibeComputerClick: () => void;
    onScreenplayTerminalClick: () => void;
    onModelComparisonTerminalClick: () => void;
    onGameBoardClick: () => void;
    onWorldArtifactClick: (artifact: WorldImageArtifact) => void;
    displayedImageUrl: string | null;
    worldArtifacts: WorldImageArtifact[];
}


const Scenery = ({ playerRoomId, onArtEaselClick, onGroundingComputerClick, onVibeComputerClick, onScreenplayTerminalClick, onModelComparisonTerminalClick, onGameBoardClick, displayedImageUrl, worldArtifacts, onWorldArtifactClick }: SceneryProps) => {
    const grassPattern = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZHRoPSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZHRoPSIyMCIgZmlsbD0iIzVhOGQ0ZCI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIzIiBjeT0iMyIgcj0iMSIgZmlsbD0iIzY0OWM1NiI+PC9jaXJjbGU+CjxjaXJjbGUgY3g9IjE1IiBjeT0iNiIgcj0iMSIgZmlsbD0iIzY0OWM1NiI+PC9jaXJjbGU+CjxjaXJjbGUgY3g9IjUiIGN5PSIxNyIgcj0iMSIgZmlsbD0iIzQ5NzQzZCI+PC9jaXJjbGU+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEiIGZpbGw9IiM0OTc0M2QiPjwvY2lyY2xlPgo8L3N2Zz4=`;

    const getBuildingStyle = (zoneKey: keyof typeof ZONES) => {
      const zone = ZONES[zoneKey];
      return {
        left: zone.x1,
        top: zone.y1,
        width: zone.x2 - zone.x1,
        height: zone.y2 - zone.y1,
        zIndex: Math.floor(zone.y1 / 10),
      };
    };
    
    const BuildingShadow = ({ zoneKey }: { zoneKey: keyof typeof ZONES }) => {
        const zone = ZONES[zoneKey];
        const style: React.CSSProperties = {
            position: 'absolute',
            left: zone.x1 + 8,
            top: zone.y1 + 8,
            width: zone.x2 - zone.x1,
            height: zone.y2 - zone.y1,
            backgroundColor: 'rgba(0,0,0,0.15)',
            zIndex: Math.floor(zone.y1 / 10) - 1,
        };
        return <div style={style}></div>;
    };
    
    const Door = ({ style }: { style: React.CSSProperties }) => (
        <div className="door-animation" style={{ position: 'absolute', ...style, zIndex: Math.floor(((style.top as number) || 0) / 10) + 1, backgroundColor: '#3a2d21', padding: 4, borderRadius: '2px' }}>
          <div style={{width: '100%', height: '100%', backgroundColor: '#6b4a2e', boxShadow: 'inset 0 0 0 2px #593d2b'}}>
             <div style={{ position: 'absolute', top: '50%', left: '75%', transform: 'translateY(-50%)', width: 6, height: 6, backgroundColor: '#fbbF24', borderRadius: '50%', border: '1px solid black' }}></div>
          </div>
        </div>
    );
    
    const ManualBuildingTitle = ({ text, x, y }: { text: string; x: number; y: number; }) => {
        const style: React.CSSProperties = {
            position: 'absolute',
            left: x,
            top: y,
            transform: 'translateX(-50%)',
            zIndex: 998,
            textAlign: 'center',
            width: 'auto',
            whiteSpace: 'nowrap'
        };
        return (
            <div style={style}>
            <h3 style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 12px', fontSize: '1.75rem', display: 'inline-block', border: '2px solid #111', textShadow: '2px 2px #000' }}>{text}</h3>
            </div>
        );
    };

    const flowerColors = [
        { color1: '#ef4444', color2: '#fde047' }, // Red/Yellow
        { color1: '#60a5fa', color2: '#f0f9ff' }, // Blue/White
        { color1: '#a855f7', color2: '#f5d0fe' }, // Purple/Light Purple
        { color1: '#ec4899', color2: '#fbcfe8' }, // Pink/Light Pink
        { color1: '#8b5cf6', color2: '#ddd6fe' }  // Indigo/Light Indigo
    ];
    
    const generateFlowers = () => {
      const flowers = [];
      for(let i=0; i < 50; i++) { // Optimized from 200 to 50
        const left = Math.random() * 4900;
        const top = Math.random() * 2900;
        if(isPositionValid(left, top)) {
          const inAnyZone = Object.values(ZONES).some(zone => 
            left > zone.x1 && left < zone.x2 && top > zone.y1 && top < zone.y2
          );
          if(!inAnyZone) {
            flowers.push({
              type: 'flower' as const,
              key: `flower-${i}`,
              style: { left, top, width: 20, height: 20 },
              ...flowerColors[Math.floor(Math.random() * flowerColors.length)]
            });
          }
        }
      }
      return flowers;
    }
    const initialSceneryItems = [
      ...[...Array(20)].map((_, i) => ({ type: 'tree' as const, key: `t1-${i}`, style: { left: 100 + i * 220, top: 150 + (i%2)*20, width: 60 + (i%3)*20, height: 80 + (i%3)*30 }, leafColor: ['green', 'orange', 'red', 'yellow'][i%4] as 'green' | 'orange' | 'red' | 'yellow' })),
      ...[...Array(20)].map((_, i) => ({ type: 'tree' as const, key: `t2-${i}`, style: { left: 150 + i * 220, top: 2600 + (i%3)*15, width: 70 + (i%2)*20, height: 90 + (i%2)*30 }, leafColor: ['green', 'orange'][i%2] as 'green' | 'orange' })),
      ...[...Array(5)].map((_, i) => ({ type: 'tree' as const, key: `t3-${i}`, style: { left: 950 + i * 200, top: 1500 + i*40, width: 70, height: 90 }, leafColor: 'green' as 'green' })),
      { type: 'bush' as const, key: 'b1', style: { left: 1000, top: 700, width: 80, height: 60 } },
      { type: 'bush' as const, key: 'b2', style: { left: 1900, top: 750, width: 90, height: 70 } },
      { type: 'bush' as const, key: 'b3', style: { left: 100, top: 1750, width: 90, height: 70 } },
      { type: 'bush' as const, key: 'b4', style: { left: 2800, top: 1700, width: 120, height: 90 } },
      { type: 'bush' as const, key: 'b5', style: { left: 1000, top: 2000, width: 80, height: 60 } },
      { type: 'bush' as const, key: 'b6', style: { left: 1900, top: 2100, width: 70, height: 55 } },
      { type: 'bush' as const, key: 'b7', style: { left: 1600, top: 800, width: 60, height: 45 } },
      { type: 'bush' as const, key: 'b8', style: { left: 400, top: 900, width: 100, height: 75 } },
      { type: 'bush' as const, key: 'b9', style: { left: 2200, top: 900, width: 110, height: 80 } },
      { type: 'bush' as const, key: 'b10', style: { left: 1600, top: 2500, width: 90, height: 70 } },
      // Zen Garden Trees & Bushes
      { type: 'tree' as const, key: 'zg-t1', style: { left: 1180, top: 320, width: 70, height: 90 }, leafColor: 'red', swaying: true },
      { type: 'tree' as const, key: 'zg-t2', style: { left: 1780, top: 400, width: 60, height: 80 }, leafColor: 'yellow', swaying: true },
      { type: 'tree' as const, key: 'zg-t3', style: { left: 1250, top: 720, width: 80, height: 100 }, leafColor: 'green', swaying: true },
      { type: 'bush' as const, key: 'zg-b1', style: { left: 1400, top: 450, width: 60, height: 45 }, swaying: true },
      { type: 'bush' as const, key: 'zg-b2', style: { left: 1650, top: 720, width: 80, height: 60 }, swaying: true },
    ];
    
    const randomFlowers = React.useMemo(() => generateFlowers(), []);

    const sceneryItems = React.useMemo(() => {
        const combined = [...initialSceneryItems, ...randomFlowers];
        combined.sort((a, b) => (((a.style.top as number) || 0) + ((a.style.height as number) || 0)) - (((b.style.top as number) || 0) + ((b.style.height as number) || 0)));
        return combined;
    }, [randomFlowers]);

    const animationMap = React.useMemo(() => {
        const map = new Map<string, { sway: boolean; sparkle: boolean; delay: string }>();
        sceneryItems.forEach(item => {
            map.set(item.key, {
                sway: (item.type === 'tree' || item.type === 'bush') && Math.random() < 0.35,
                sparkle: item.type === 'flower' && Math.random() < 0.1,
                delay: `${(Math.random() * 8).toFixed(2)}s`
            });
        });
        return map;
    }, [sceneryItems]);

    const pathWidth = 100;
    const worldWidth = 5000;

    return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
        {/* --- Conditionally Rendered Scenery --- */}
        {(!playerRoomId || playerRoomId === 'outside') ? (
            <>
                {/* Ground Textures */}
                <div className="absolute w-full h-full" style={{ backgroundColor: '#5a8d4d', backgroundImage: `url('${grassPattern}')`, imageRendering: 'pixelated' }}></div>
                <div className="absolute w-full h-full" style={{ backgroundImage: `radial-gradient(ellipse 40% 50% at 20% 80%, #6b4d3b 50%, transparent 50%), radial-gradient(ellipse 35% 45% at 80% 20%, #755441 50%, transparent 50%), radial-gradient(ellipse 50% 60% at 50% 50%, #507e45 30%, transparent 30%)`, opacity: 0.15 }}></div>
                
                {/* --- Path Network --- */}
                {/* Perimeter */}
                <div className="absolute cobblestone-path" style={{top: 40, left: 40, width: worldWidth - 80, height: pathWidth, zIndex: 0}}></div>
                <div className="absolute cobblestone-path" style={{top: 2860, left: 40, width: worldWidth - 80, height: pathWidth, zIndex: 0}}></div>
                <div className="absolute cobblestone-path" style={{top: 40, left: 40, width: pathWidth, height: 2920, zIndex: 0}}></div>
                <div className="absolute cobblestone-path" style={{top: 40, left: worldWidth - pathWidth - 40, width: pathWidth, height: 2920, zIndex: 0}}></div>
                
                {/* Main Roads & Central Plaza */}
                <div className="absolute cobblestone-path" style={{top: 900, left: 40, width: worldWidth - 80, height: pathWidth, zIndex: 0}}></div>
                <div className="absolute cobblestone-path" style={{top: 1800, left: 40, width: worldWidth - 80, height: pathWidth, zIndex: 0}}></div>
                {/* Vertical Road broken into two parts around the plaza */}
                <div className="absolute cobblestone-path" style={{top: 40, left: 1450, width: pathWidth, height: 1135, zIndex: 0}}></div>
                <div className="absolute cobblestone-path" style={{top: 1575, left: 1450, width: pathWidth, height: 1385, zIndex: 0}}></div>
                {/* Central Plaza */}
                <div className="absolute cobblestone-path" style={{top: 1175, left: 1300, width: 400, height: 400, zIndex: 0, borderRadius: '20px'}}></div>


                {/* Connecting Paths to Doors */}
                <DoorPath style={{top: 140, left: 550, width: 100, height: 110}} /> {/* Library Top */}
                <DoorPath style={{top: 800, left: 550, width: 100, height: 100}} /> {/* Library Bottom */}
                <DoorPath style={{top: 140, left: 2450, width: 100, height: 160}} /> {/* Dojo Top */}
                <DoorPath style={{top: 750, left: 2450, width: 100, height: 150}} /> {/* Dojo Bottom */}
                <DoorPath style={{top: 140, left: 3415, width: 100, height: 160}} /> {/* Classroom Top */}
                <DoorPath style={{top: 750, left: 3415, width: 100, height: 150}} /> {/* Classroom Bottom */}
                <DoorPath style={{top: 900, left: 550, width: 100, height: 100}} /> {/* Cafe Top */}
                <DoorPath style={{top: 1550, left: 550, width: 100, height: 250}} /> {/* Cafe Bottom */}
                <DoorPath style={{top: 1800, left: 1500, width: 100, height: 100}} /> {/* Art Studio Top */}
                <DoorPath style={{top: 2450, left: 1500, width: 100, height: 410}} /> {/* Art Studio Bottom */}
                <DoorPath style={{top: 900, left: 2450, width: 100, height: 100}} /> {/* Office Top */}
                <DoorPath style={{top: 1550, left: 2450, width: 100, height: 250}} /> {/* Office Bottom */}
                <DoorPath style={{top: 1750, left: 3415, width: 100, height: 50}} /> {/* Dungeon Bottom */}
                <DoorPath style={{top: 1800, left: 550, width: 100, height: 100}} /> {/* Studio Top */}
                <DoorPath style={{top: 2450, left: 550, width: 100, height: 410}} /> {/* Studio Bottom */}
                <DoorPath style={{top: 1800, left: 2450, width: 100, height: 100}} /> {/* Philo Cafe Top */}
                <DoorPath style={{top: 2450, left: 2450, width: 100, height: 410}} /> {/* Philo Cafe Bottom */}
                <DoorPath style={{top: 1800, left: 3415, width: 100, height: 200}} /> {/* Lair Top */}

                {/* --- Decorations --- */}
                <FountainParticles />
                <Fountain style={{left: 1450, top: 1325, width: 100, height: 100}}/>
                <Bench style={{left: 1320, top: 1100, width: 100, height: 24}}/>
                <Bench style={{left: 1580, top: 1100, width: 100, height: 24}}/>
                <Bench style={{left: 1320, top: 1600, width: 100, height: 24}}/>
                <Bench style={{left: 1580, top: 1600, width: 100, height: 24}}/>
                
                {/* Zen Garden Scenery */}
                <Pond style={{ left: 1300, top: 500, width: 400, height: 200 }} />
                <StoneLantern style={{ left: 1200, top: 400, width: 30, height: 50 }} />
                <StoneLantern style={{ left: 1750, top: 600, width: 30, height: 50 }} />
                <ManualBuildingTitle text="Zen Garden" x={1500} y={240} />

                {sceneryItems.map(item => {
                    const animProps = animationMap.get(item.key) || { sway: false, sparkle: false, delay: '0s' };
                    const itemStyle = { ...item.style, '--sway-delay': animProps.delay } as React.CSSProperties;
                  
                    if (item.type === 'tree') return <PixelTree key={item.key} style={itemStyle} leafColor={item.leafColor as 'green' | 'orange' | 'red' | 'yellow'} swaying={animProps.sway} />
                    if (item.type === 'bush') return <PixelBush key={item.key} style={itemStyle} swaying={animProps.sway}/>
                    if (item.type === 'flower') return <PixelFlower key={item.key} style={item.style} color1={(item as any).color1} color2={(item as any).color2} sparkling={animProps.sparkle} sparkleDelay={animProps.delay} />
                    return null;
                })}
            </>
        ) : (
             <div className="absolute inset-0 bg-[#0c142c]"></div>
        )}

        {/* --- BUILDINGS & ZONES (Always Rendered) --- */}
        {/* Dojo */}
        <BuildingShadow zoneKey="dojo" />
        <div className="absolute" style={{...getBuildingStyle('dojo'), border: '50px solid #8c7853', backgroundColor: '#fdf6e3' }}>
            <TatamiFloorTexture />
            <TrainingDummy style={{ left: 2170, top: 650, width: 30, height: 70 }} />
            <TrainingDummy style={{ left: 2700, top: 650, width: 30, height: 70 }} />
        </div>
        {DOOR_POSITIONS.dojo.map(door => <Door key={`door-dojo-${door.side}`} style={{ left: door.x, top: door.y, width: 100, height: 50 }} />)}
        <ManualBuildingTitle text="Prompting Dojo" x={(ZONES.dojo.x1 + ZONES.dojo.x2)/2} y={ZONES.dojo.y1 - 50} />
        <div style={{position: 'absolute', left: 2200, top: 450, width: 20, height: 250, backgroundColor: '#d4c098', border: '3px solid #8c7853' }}></div>
        <div style={{position: 'absolute', left: 2680, top: 450, width: 20, height: 250, backgroundColor: '#d4c098', border: '3px solid #8c7853' }}></div>

        {/* Cafe */}
        <BuildingShadow zoneKey="cafe" />
        <div className="absolute" style={{...getBuildingStyle('cafe'), border: '50px solid #4a2c2a'}}>
            <WoodFloorTexture color="#6e5a49"/>
        </div>
        {DOOR_POSITIONS.cafe.map(door => <Door key={`door-cafe-${door.side}`} style={{ left: door.x, top: door.y, width: 100, height: 50 }} />)}
        <ManualBuildingTitle text="AI Cafe" x={(ZONES.cafe.x1 + ZONES.cafe.x2)/2} y={ZONES.cafe.y1 - 50} />
        <CounterSegment style={{ left: 260, top: 1060, width: 80, height: 350 }} />
        <CounterSegment style={{ left: 340, top: 1410, width: 120, height: 80 }} />
        <CoffeeMachine style={{ left: 270, top: 1100, width: 40, height: 50}}/>
        <RoundCafeTable style={{ left: 700, top: 1120, width: 60, height: 60 }} />
        <Chair style={{ left: 710, top: 1080, width: 40, height: 40 }} facing="down" />
        <Chair style={{ left: 710, top: 1180, width: 40, height: 40 }} facing="up" />
        <RoundCafeTable style={{ left: 700, top: 1370, width: 60, height: 60 }} />
        <Chair style={{ left: 710, top: 1330, width: 40, height: 40 }} facing="down" />
        <Chair style={{ left: 710, top: 1430, width: 40, height: 40 }} facing="up" />
        
        {/* Library */}
        <BuildingShadow zoneKey="library" />
        <div className="absolute" style={{...getBuildingStyle('library'), border: '50px solid #4a2c2a' }}>
            <WoodFloorTexture color="#d1b897" />
        </div>
        {DOOR_POSITIONS.library.map(door => <Door key={`door-library-${door.side}`} style={{ left: door.x, top: door.y, width: 100, height: 50 }} />)}
        <ManualBuildingTitle text="The Grand Library" x={(ZONES.library.x1 + ZONES.library.x2)/2} y={ZONES.library.y1 - 50} />
        <Bookshelf style={{left: 250, top: 350, width: 30, height: 400}}/>
        <Bookshelf style={{left: 820, top: 350, width: 30, height: 400}}/>
        <InteractiveTerminal
            style={{ left: INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.left, top: INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.top, width: INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.width, height: INTERACTIVE_OBJECTS.GROUNDING_COMPUTER.height }}
            glowing
            onClick={(e) => { e.stopPropagation(); onGroundingComputerClick(); }}
            label="Grounding Computer Terminal"
        />
        <RoundCafeTable style={{left: 700, top: 750, width: 50, height: 50}}/>

        {/* Office */}
        <BuildingShadow zoneKey="office" />
        <div className="absolute" style={{...getBuildingStyle('office'), border: '50px solid #333', backgroundColor: '#e5e7eb'}}>
            <div className="absolute w-full h-full" style={{backgroundImage: `linear-gradient(45deg, #d1d5db 25%, transparent 25%, linear-gradient(-45deg, #d1d5db 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d1d5db 75%), linear-gradient(-45deg, transparent 75%, #d1d5db 75%)`, backgroundSize: '20px 20px', backgroundColor: '#e5e7eb', opacity: 0.5}}></div>
        </div>
        {DOOR_POSITIONS.office.map(door => <Door key={`door-office-${door.side}`} style={{ left: door.x, top: door.y, width: 100, height: 50 }} />)}
        <ManualBuildingTitle text="Tech Office" x={(ZONES.office.x1 + ZONES.office.x2)/2} y={ZONES.office.y1 - 50} />
        <OfficeDesk style={{left: 2150, top: 1150, width: 160, height: 50}}/>
        <Computer style={{left: 2200, top: 1110, width: 50, height: 45}}/>
        <OfficeDesk style={{left: 2640, top: 1150, width: 160, height: 50}}/>
        <Computer style={{left: 2690, top: 1110, width: 50, height: 45}}/>
        <InteractiveTerminal
            style={{ left: INTERACTIVE_OBJECTS.VIBE_COMPUTER.left, top: INTERACTIVE_OBJECTS.VIBE_COMPUTER.top, width: INTERACTIVE_OBJECTS.VIBE_COMPUTER.width, height: INTERACTIVE_OBJECTS.VIBE_COMPUTER.height }}
            glowing
            onClick={(e) => { e.stopPropagation(); onVibeComputerClick(); }}
            label="Vibe-Coding Terminal"
        />
        <InteractiveTerminal
            style={{ left: INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.left, top: INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.top, width: INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.width, height: INTERACTIVE_OBJECTS.MODEL_COMPARISON_TERMINAL.height }}
            glowing
            onClick={(e) => { e.stopPropagation(); onModelComparisonTerminalClick(); }}
            label="Model Comparison Terminal"
        />

        {/* Studio */}
        <BuildingShadow zoneKey="studio" />
        <div className="absolute" style={{...getBuildingStyle('studio'), border: '50px solid #222', backgroundColor: '#333'}}></div>
        {DOOR_POSITIONS.studio.map(door => <Door key={`door-studio-${door.side}`} style={{ left: door.x, top: door.y, width: 100, height: 50 }} />)}
        <ManualBuildingTitle text="Writer's Studio" x={(ZONES.studio.x1 + ZONES.studio.x2)/2} y={ZONES.studio.y1 - 50} />
        <div style={{position: 'absolute', left: 450, top: 2100, width: 200, height: 50, backgroundColor: '#eee', border: '4px solid #222'}} />
        <InteractiveTerminal
            style={{ left: INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.left, top: INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.top, width: INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.width, height: INTERACTIVE_OBJECTS.SCREENPLAY_TERMINAL.height }}
            glowing
            onClick={(e) => { e.stopPropagation(); onScreenplayTerminalClick(); }}
            label="Screenplay Typewriter"
        />
        <div style={{position: 'absolute', left: 250, top: 2300, width: 100, height: 100, backgroundColor: '#555', border: '4px solid #222'}}></div>
        <Bookshelf style={{left: 210, top: 1950, width: 30, height: 400}}/>
        <Bookshelf style={{left: 860, top: 1950, width: 30, height: 400}}/>
        <PixelFlower style={{left: 800, top: 1950, width: 50, height: 50}} color1="white" color2="lightblue" />

        {/* Art Studio */}
        <BuildingShadow zoneKey="art_studio" />
        <div className="absolute" style={{...getBuildingStyle('art_studio'), border: '50px solid #854d0e', backgroundColor: '#fef3c7' }}>
            <div className="absolute w-full h-full opacity-30" style={{
                backgroundImage: 'radial-gradient(#fca5a5 1px, transparent 1px), radial-gradient(#60a5fa 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 10px 10px'
            }}></div>
        </div>
        {DOOR_POSITIONS.art_studio.map(door => <Door key={`door-art_studio-${door.side}`} style={{ left: door.x, top: door.y, width: 100, height: 50 }} />)}
        <ManualBuildingTitle text="Art Studio" x={(ZONES.art_studio.x1 + ZONES.art_studio.x2)/2} y={ZONES.art_studio.y1 - 50} />
        
        {/* Agent Easels */}
        {[INTERACTIVE_OBJECTS.AGENT_EASEL_1, INTERACTIVE_OBJECTS.AGENT_EASEL_2, INTERACTIVE_OBJECTS.AGENT_EASEL_3].map((easel, i) => {
            const artifact = worldArtifacts.find(art => art.objectId === easel.id);
            return (
                <Easel 
                    key={easel.id}
                    style={{left: easel.left, top: easel.top, width: easel.width, height: easel.height}} 
                    imageUrl={artifact?.imageUrl || null}
                    onClick={artifact ? (e) => { e.stopPropagation(); onWorldArtifactClick(artifact); } : undefined}
                    glowing={!!artifact}
                    label={`Easel with artwork by ${artifact?.agentName || `Artist ${i + 1}`}`}
                />
            );
        })}
        
        {/* Player's Interactive Easel */}
        <Easel 
            style={{ left: INTERACTIVE_OBJECTS.PLAYER_EASEL.left, top: INTERACTIVE_OBJECTS.PLAYER_EASEL.top, width: INTERACTIVE_OBJECTS.PLAYER_EASEL.width, height: INTERACTIVE_OBJECTS.PLAYER_EASEL.height }}
            glowing 
            onClick={(e) => { e.stopPropagation(); onArtEaselClick(); }} 
            imageUrl={displayedImageUrl}
            label="Interactive Art Easel"
        />

        {/* Philo Cafe */}
        <BuildingShadow zoneKey="philo_cafe" />
        <div className="absolute" style={{...getBuildingStyle('philo_cafe'), border: '50px solid #4a2c2a'}}>
             <WoodFloorTexture color="#6e5a49" />
        </div>
        {DOOR_POSITIONS.philo_cafe.map(door => <Door key={`door-philo_cafe-${door.side}`} style={{ left: door.x, top: door.y, width: 100, height: 50 }} />)}
        <ManualBuildingTitle text="Philo Cafe" x={(ZONES.philo_cafe.x1 + ZONES.philo_cafe.x2)/2} y={ZONES.philo_cafe.y1 - 50} />
        <div style={{position: 'absolute', left: 2150, top: 2000, width: 100, height: 250, backgroundColor: '#593d2b', border: '4px solid #3a2d21' }}></div>
        <RoundCafeTable style={{left: 2350, top: 2300, width: 50, height: 50}} />
        <RoundCafeTable style={{left: 2600, top: 2100, width: 50, height: 50}} />
        <Bookshelf style={{left: 2720, top: 2200, width: 30, height: 200}}/>

        {/* Dungeon */}
        <BuildingShadow zoneKey="dungeon" />
        <div className="absolute" style={{...getBuildingStyle('dungeon'), border: '50px solid #292524'}}>
             <StoneFloorTexture />
        </div>
        {DOOR_POSITIONS.dungeon.map(door => <Door key={`door-dungeon-${door.side}`} style={{ left: door.x, top: door.y, width: 100, height: 50 }} />)}
        <ManualBuildingTitle text="Dungeon" x={(ZONES.dungeon.x1 + ZONES.dungeon.x2)/2} y={ZONES.dungeon.y1 - 50} />
        <DnDTable style={{left: 3300, top: 1400, width: 300, height: 200}}/>
        <InteractiveGameBoard
            style={{ left: INTERACTIVE_OBJECTS.GAME_BOARD.left, top: INTERACTIVE_OBJECTS.GAME_BOARD.top, width: INTERACTIVE_OBJECTS.GAME_BOARD.width, height: INTERACTIVE_OBJECTS.GAME_BOARD.height }}
            glowing
            onClick={(e) => { e.stopPropagation(); onGameBoardClick(); }}
            label="Dungeons and Dragons Game Board"
        />

        {/* Classroom */}
        <BuildingShadow zoneKey="classroom" />
        <div className="absolute" style={{...getBuildingStyle('classroom'), border: '50px solid #4a2c2a'}}>
            <WoodFloorTexture color="#d1b897" />
        </div>
        {DOOR_POSITIONS.classroom.map(door => <Door key={`door-classroom-${door.side}`} style={{ left: door.x, top: door.y, width: 100, height: 50 }} />)}
        <ManualBuildingTitle text="Classroom" x={(ZONES.classroom.x1 + ZONES.classroom.x2)/2} y={ZONES.classroom.y1 - 50} />
        <Blackboard style={{left: 3350, top: 360, width: 200, height: 100}}/>
        <StudentDesk style={{left: 3200, top: 550, width: 70, height: 40}}/>
        <StudentDesk style={{left: 3600, top: 550, width: 70, height: 40}}/>
        <StudentDesk style={{left: 3200, top: 650, width: 70, height: 40}}/>
        <StudentDesk style={{left: 3600, top: 650, width: 70, height: 40}}/>

        {/* Skynet's Lair */}
        <BuildingShadow zoneKey="lair" />
        <div className="absolute" style={{...getBuildingStyle('lair'), border: '50px solid #111827', backgroundColor: '#1f2937'}}>
            <div className="absolute w-full h-full" style={{backgroundImage: `linear-gradient(90deg, #374151 1px, transparent 1px), linear-gradient(#374151 1px, transparent 1px)`, backgroundSize: '40px 40px', imageRendering: 'pixelated'}}></div>
        </div>
        {DOOR_POSITIONS.lair.map(door => <Door key={`door-lair-${door.side}`} style={{ left: door.x, top: door.y, width: 100, height: 50 }} />)}
        <ManualBuildingTitle text="Skynet's Lair" x={(ZONES.lair.x1 + ZONES.lair.x2)/2} y={ZONES.lair.y1 - 50} />
        <ServerRack style={{left: 3180, top: 2100, width: 50, height: 150}}/>
        <ServerRack style={{left: 3180, top: 2300, width: 50, height: 150}}/>
        <ServerRack style={{left: 3670, top: 2100, width: 50, height: 150}}/>
        <ServerRack style={{left: 3670, top: 2300, width: 50, height: 150}}/>
        
        {/* Trash Zone */}
        <div className="absolute border-4 border-dashed border-red-500 flex items-center justify-center" style={{ left: ZONES.trash.x1, top: ZONES.trash.y1, width: ZONES.trash.x2 - ZONES.trash.x1, height: ZONES.trash.y2 - ZONES.trash.y1, zIndex: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgba(239, 68, 68, 0.5)" className="w-24 h-24">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
        </div>
    </div>
  );
};

export default Scenery;