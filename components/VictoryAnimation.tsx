import React from 'react';

const VictoryAnimation = () => {
    // Increased particle count for a more impressive burst
    const particles = Array.from({ length: 150 });

    return (
        <div className="victory-container">
            {particles.map((_, i) => {
                const angle = Math.random() * 360; // Random angle for a circular burst
                const distance = Math.random() * 40 + 60; // Random distance from center (in vmin units)
                const duration = Math.random() * 1.5 + 1.5; // s
                const delay = Math.random() * 0.5; // s

                return (
                    <div 
                        key={i} 
                        className="particle" 
                        style={{
                            '--angle': `${angle}deg`,
                            '--distance': `${distance}vmin`,
                            '--duration': `${duration}s`,
                            '--delay': `${delay}s`,
                            '--size': `${Math.random() * 10 + 5}px`,
                            '--hue': `${Math.random() * 60}`,
                        } as React.CSSProperties}
                    />
                );
            })}
        </div>
    );
};

export default VictoryAnimation;