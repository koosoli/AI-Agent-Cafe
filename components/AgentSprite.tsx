import React from 'react';

const CowSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#fff" d="M4,7h16v10h-16z"/>
        <path fill="#000" d="M6,9h2v2h-2z M16,9h2v2h-2z M4,7h1v10h-1z M20,7h-1v10h1z M4,7h16v1h-16z M4,17h16v-1h-16z"/>
        <path fill="#000" d="M10,12h4v3h-4z"/>
        <path fill="#f4aab9" d="M11,13h2v1h-2z"/>
        <path fill="#fff" d="M5,5h2v2h-2z M18,5h2v2h-2z"/>
        <path fill="#000" d="M5,5h1v2h-1z M7,5h-1v1h1z M18,5h1v2h-1z M20,5h-1v1h1z M5,5h2v1h-2z M18,5h2v1h-2z"/>
        <path fill="#000" d="M6,17h2v3h-2z M16,17h2v3h-2z"/>
    </svg>
);

const ChickenSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#fff" d="M9,8h7v9h-7z" />
        <path fill="#000" d="M9,8h1v9h-1z M16,8h-1v9h1z M9,8h7v1h-7z M9,17h7v-1h-7z"/>
        <path fill="#f00" d="M8,7h2v3h-2z M16,10h2v2h-2z"/>
        <path fill="#000" d="M13,9h1v1h-1z" />
        <path fill="#ff0" d="M16,14h3v2h-3z" />
        <path fill="#000" d="M10,17h1v3h-1z M14,17h1v3h-1z" />
    </svg>
);

const TerminalSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 45" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#1a1a1a" d="M0,0h50v35h-50z" />
        <path fill="#2a2a2a" d="M5,5h40v25h-40z" />
        {/* Glowing red eye */}
        <path fill="#dc2626" d="M22,15h6v6h-6z" />
        <path fill="#f87171" d="M24,17h2v2h-2z" />
        <path fill="#111" d="M20,35h10v5h-10z M10,40h30v5h-30z" />
    </svg>
);

const LeonardoSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#fddac5" d="M8,8h8v7h-8z" />
        <path fill="#5a2d27" d="M7,15h10v5h-10z" />
        <path fill="#d3d3d3" d="M7,7h10v1h-10z M7,8h1v7h-1z M16,8h1v7h-1z M8,12h8v5h-8z" />
        <path fill="#b0b0b0" d="M8,13h8v3h-8z M7,9h1v3h-1z M16,9h1v3h-1z" />
        <path fill="#000" d="M10,10h1v1h-1z M13,10h1v1h-1z" />
        <path fill="#4a2c2a" d="M8,5h8v2h-8z" />
    </svg>
);

const VanGoghSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#fddac5" d="M9,9h6v6h-6z" />
        <path fill="#2e4a6b" d="M8,15h8v5h-8z" />
        <path fill="#d95f30" d="M9,12h6v4h-6z M8,11h1v3h-1z M15,11h1v3h-1z" />
        <path fill="#b5431f" d="M9,14h6v1h-6z" />
        <path fill="#000" d="M10,11h1v1h-1z M13,11h1v1h-1z" />
        <path fill="#f5d689" d="M7,6h10v3h-10z" />
        <path fill="#e3c172" d="M7,8h10v1h-10z" />
    </svg>
);

const DaliSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#fddac5" d="M9,8h6v7h-6z" />
        <path fill="#333" d="M8,15h8v5h-8z" />
        <path fill="#222" d="M9,7h6v1h-6z M8,8h1v2h-1z M15,8h1v2h-1z" />
        <path fill="#000" d="M10,10h1v1h-1z M13,10h1v1h-1z" />
        <path fill="#222" d="M7,12h2v1h-2z M15,12h2v1h-2z M6,11h1v1h-1z M17,11h1v1h-1z M5,10h1v1h-1z M18,10h1v1h-1z" />
    </svg>
);

const ShakespeareSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#fddac5" d="M9,7h6v9h-6z" />
        <path fill="#fff" d="M7,16h10v2h-10z" />
        <path fill="#ddd" d="M7,17h10v1h-10z" />
        <path fill="#403030" d="M7,18h10v2h-10z" />
        <path fill="#4d3b30" d="M8,7h1v4h-1z M15,7h1v4h-1z" />
        <path fill="#4d3b30" d="M11,14h2v2h-2z" />
        <path fill="#000" d="M10,10h1v1h-1z M13,10h1v1h-1z" />
        <path fill="#ffd700" d="M8,11h1v1h-1z" />
    </svg>
);

const JaneAustenSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#fddac5" d="M9,8h6v7h-6z" />
        <path fill="#b6d7a8" d="M8,15h8v5h-8z" />
        <path fill="#4d3b30" d="M9,7h6v1h-6z M8,8h1v3h-1z M15,8h1v3h-1z" />
        <path fill="#fff" d="M7,6h10v2h-10z M6,8h1v5h-1z M17,8h1v5h-1z M7,13h10v1h-10z" />
        <path fill="#f0e68c" d="M7,14h10v1h-10z" />
        <path fill="#000" d="M10,10h1v1h-1z M13,10h1v1h-1z" />
    </svg>
);

const OrwellSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#fddac5" d="M9,7h6v9h-6z" />
        <path fill="#666" d="M8,16h8v4h-8z" />
        <path fill="#555" d="M10,6h4v1h-4z M9,7h1v2h-1z M14,7h1v2h-1z" />
        <path fill="#000" d="M10,10h1v1h-1z M13,10h1v1h-1z" />
        <path fill="#555" d="M10,13h4v1h-4z" />
    </svg>
);

const LovecraftSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#e0c2a8" d="M9,7h6v9h-6z" />
        <path fill="#3a3a3a" d="M8,16h8v4h-8z" />
        <path fill="#3a3a3a" d="M9,6h6v1h-6z M8,7h1v3h-1z M15,7h1v3h-1z" />
        <path fill="#000" d="M10,10h1v1h-1z M13,10h1v1h-1z" />
        <path fill="#c8a88a" d="M11,15h2v1h-2z" />
    </svg>
);

const KantSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#fddac5" d="M9,8h6v7h-6z" />
        <path fill="#4a4a4a" d="M8,15h8v5h-8z" />
        <path fill="#f0f0f0" d="M7,6h10v3h-10z M6,9h12v5h-12z" />
        <path fill="#dcdcdc" d="M7,8h10v1h-10z M7,13h10v1h-10z" />
        <path fill="#000" d="M10,10h1v1h-1z M13,10h1v1h-1z" />
    </svg>
);

const HegelSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#fddac5" d="M9,7h6v9h-6z" />
        <path fill="#333" d="M8,16h8v4h-8z" />
        <path fill="#f0f0f0" d="M10,6h4v1h-4z M8,7h1v7h-1z M15,7h1v7h-1z M9,14h6v2h-6z" />
        <path fill="#dcdcdc" d="M9,7h1v5h-1z M14,7h1v5h-1z" />
        <path fill="#000" d="M10,10h1v1h-1z M13,10h1v1h-1z" />
    </svg>
);

const AristotleSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#d9a073" d="M9,8h6v7h-6z" />
        <path fill="#f0f0f0" d="M8,15h8v5h-8z" />
        <path fill="#dcdcdc" d="M8,15h2v5h-2z" />
        <path fill="#3b2b23" d="M8,7h8v1h-8z M8,8h1v6h-1z M15,8h1v6h-1z M9,12h6v4h-6z" />
        <path fill="#2a1d17" d="M9,14h6v1h-6z" />
        <path fill="#000" d="M10,10h1v1h-1z M13,10h1v1h-1z" />
    </svg>
);

const SchopenhauerSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        <path fill="#fddac5" d="M9,8h6v8h-6z" />
        <path fill="#222" d="M8,16h8v4h-8z" />
        <path fill="#e0e0e0" d="M7,6h10v2h-10z M6,8h2v7h-2z M16,8h2v7h-2z" />
        <path fill="#c0c0c0" d="M8,8h1v5h-1z M15,8h1v5h-1z" />
        <path fill="#000" d="M10,11h1v1h-1z M13,11h1v1h-1z" />
    </svg>
);

const NoraSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        {/* Skin: Face */}
        <path fill="#fddac5" d="M9,8h6v7h-6z" />
        
        {/* Redder Hair */}
        <path fill="#e03c31" d="M8,6h8v4h-8z" /> {/* Main hair */}
        <path fill="#c02c21" d="M8,9h8v1h-8z" /> {/* Hair shadow */}
        <path fill="#e03c31" d="M7,8h1v4h-1z M16,8h1v4h-1z" /> {/* Sideburns/sides */}

        {/* Bigger Glasses - a single solid bar */}
        <path fill="#222" d="M9,9h6v2h-6z" />
        
        {/* Bigger brown eyes */}
        <path fill="#6d4c41" d="M10,10h1v1h-1z M14,10h1v1h-1z" />
        
        {/* Mouth */}
        <path fill="#a14a38" d="M11,13h2v1h-2z" />
        
        {/* Clothes: Dark turtleneck (skinny) */}
        <path fill="#333" d="M9,15h6v5h-6z" />
        <path fill="#444" d="M9,15h6v1h-6z"/>

        {/* Neck */}
        <path fill="#fddac5" d="M11,14h2v1h-2z" />
    </svg>
);

const SenseiSprite = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className || "w-full h-full"} style={{ imageRendering: 'pixelated' }}>
        {/* Skin */}
        <path fill="#fddac5" d="M9,7h6v7h-6z" />
        {/* Eyes */}
        <path fill="#222" d="M10,10h1v1h-1z M13,10h1v1h-1z" />
        {/* Eyebrows */}
        <path fill="#fff" d="M9,9h2v1h-2z M13,9h2v1h-2z" />
        {/* Beard */}
        <path fill="#fff" d="M10,12h4v3h-4z" />
        <path fill="#f0f0f0" d="M9,13h1v2h-1z M14,13h1v2h-1z" />
        {/* Hair */}
        <path fill="#f0f0f0" d="M8,6h8v1h-8z" />
        {/* Gi */}
        <path fill="#f0f0f0" d="M7,14h10v6h-10z" />
        <path fill="#dcdcdc" d="M7,15h2v5h-2z M15,15h2v5h-2z" />
        <path fill="#333" d="M9,14h6v2h-6z" /> {/* Black Belt */}
    </svg>
);


interface AgentSpriteProps {
  spriteSeed: string;
  name?: string;
  className?: string;
}

const AgentSprite = ({ spriteSeed, name, className }: AgentSpriteProps) => {
    if (spriteSeed === 'cow') return <CowSprite className={className} />;
    if (spriteSeed === 'chicken') return <ChickenSprite className={className} />;
    if (spriteSeed === 'terminal') return <TerminalSprite className={className} />;
    if (spriteSeed === 'leonardo_da_vinci') return <LeonardoSprite className={className} />;
    if (spriteSeed === 'vincent_van_gogh') return <VanGoghSprite className={className} />;
    if (spriteSeed === 'salvador_dali') return <DaliSprite className={className} />;
    if (spriteSeed === 'william_shakespeare') return <ShakespeareSprite className={className} />;
    if (spriteSeed === 'jane_austen') return <JaneAustenSprite className={className} />;
    if (spriteSeed === 'george_orwell') return <OrwellSprite className={className} />;
    if (spriteSeed === 'hp_lovecraft') return <LovecraftSprite className={className} />;
    if (spriteSeed === 'immanuel_kant') return <KantSprite className={className} />;
    if (spriteSeed === 'gwf_hegel') return <HegelSprite className={className} />;
    if (spriteSeed === 'aristotle') return <AristotleSprite className={className} />;
    if (spriteSeed === 'arthur_schopenhauer') return <SchopenhauerSprite className={className} />;
    if (spriteSeed === 'Nora') return <NoraSprite className={className} />;
    if (spriteSeed === 'Sensei') return <SenseiSprite className={className} />;

    const spriteUrl = `https://api.dicebear.com/9.x/pixel-art/svg?seed=${spriteSeed}`;
    return <img src={spriteUrl} alt={name} className={className} style={{ pointerEvents: 'none' }} />;
};

export default AgentSprite;