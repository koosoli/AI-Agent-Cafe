import React, { useState, useEffect } from 'react';
import './SuperAgentUnlockAnimation.css';

interface SuperAgentUnlockAnimationProps {
    onComplete: () => void;
}

const SuperAgentUnlockAnimation = ({ onComplete }: SuperAgentUnlockAnimationProps) => {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 100); // Start fade-in
        const t2 = setTimeout(() => setPhase(2), 2000); // Show text
        const t3 = setTimeout(() => setPhase(3), 5000); // Start fade-out
        const t4 = setTimeout(onComplete, 6000); // Animation ends

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, [onComplete]);

    return (
        <div className={`super-agent-unlock-container phase-${phase}`}>
            <div className="glitch-layers">
                <div className="glitch-layer"></div>
                <div className="glitch-layer"></div>
                <div className="glitch-layer"></div>
            </div>
            <div className="scan-line"></div>
            <div className="unlock-text">
                <h1>SYSTEM RECALIBRATED</h1>
                <p>New Entity Detected</p>
                <h2>THE ARCHITECT</h2>
                <p>has entered the simulation</p>
            </div>
        </div>
    );
};

export default SuperAgentUnlockAnimation;
