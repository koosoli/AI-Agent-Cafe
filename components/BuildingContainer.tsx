import React from 'react';
import { ZONES, DOOR_POSITIONS } from '../data/layout';

type BuildingType = 'cafe' | 'office' | 'studio' | 'art_studio' | 'philo_cafe' | 'library' | 'dojo' | 'dungeon' | 'classroom' | 'lair';

interface BuildingContainerProps {
    zoneKey: BuildingType;
    children: React.ReactNode;
}

const WALL_STYLES: Record<string, React.CSSProperties> = {
    // Warm/Rustic (Cafe, Philo)
    wood_plaster: {
        backgroundColor: '#fdf6e3', // Plaster
        backgroundImage: `
            linear-gradient(90deg, #5c4033 10px, transparent 10px), /* Timber beams vertical */
            linear-gradient(#5c4033 10px, transparent 10px) /* Timber beams horizontal */
        `,
        backgroundSize: '100px 100px',
    },
    // Modern/Tech (Office, Lair)
    concrete_tech: {
        backgroundColor: '#374151',
        backgroundImage: `
            repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 10px)
        `,
        border: '4px solid #1f2937'
    },
    // Traditional (Dojo)
    shoji_screen: {
        backgroundColor: '#fff',
        backgroundImage: `
            linear-gradient(90deg, #d4c098 4px, transparent 4px),
            linear-gradient(#d4c098 4px, transparent 4px)
        `,
        backgroundSize: '40px 60px',
        border: '8px solid #8c7853'
    },
    // Stone (Dungeon, Library)
    stone_brick: {
        backgroundColor: '#57534e',
        backgroundImage: `
            linear-gradient(335deg, rgba(0,0,0,0.3) 23px, transparent 23px),
            linear-gradient(155deg, rgba(0,0,0,0.3) 23px, transparent 23px),
            linear-gradient(335deg, rgba(0,0,0,0.3) 23px, transparent 23px),
            linear-gradient(155deg, rgba(0,0,0,0.3) 23px, transparent 23px)
        `,
        backgroundSize: '58px 58px',
        backgroundPosition: '0px 2px, 4px 35px, 29px 31px, 34px 6px'
    }
};

const ROOF_STYLES: Record<string, React.CSSProperties> = {
    shingle_red: {
        backgroundColor: '#7f1d1d',
        backgroundImage: 'linear-gradient(135deg, #991b1b 25%, transparent 25%), linear-gradient(225deg, #991b1b 25%, transparent 25%), linear-gradient(45deg, #991b1b 25%, transparent 25%), linear-gradient(315deg, #991b1b 25%, transparent 25%)',
        backgroundPosition: '10px 0, 10px 0, 0 0, 0 0',
        backgroundSize: '20px 20px',
        backgroundRepeat: 'repeat'
    },
    slate_blue: {
        backgroundColor: '#1e3a8a',
        backgroundImage: 'radial-gradient(circle at 10px 10px, #172554 2px, transparent 2.5px)',
        backgroundSize: '20px 20px'
    },
    straw_thatch: {
        backgroundColor: '#ca8a04',
        backgroundImage: 'repeating-linear-gradient(45deg, #a16207 0px, #a16207 2px, transparent 2px, transparent 8px)',
    }
};

export const BuildingContainer = ({ zoneKey, children }: BuildingContainerProps) => {
    const zone = ZONES[zoneKey];

    // Determine styles based on zone type
    let wallStyle = WALL_STYLES.wood_plaster;
    let roofStyle = ROOF_STYLES.shingle_red;
    let VignetteClass = 'room-vignette';

    switch (zoneKey) {
        case 'dungeon':
        case 'library':
        case 'classroom':
            wallStyle = WALL_STYLES.stone_brick;
            roofStyle = ROOF_STYLES.slate_blue;
            if (zoneKey === 'dungeon') VignetteClass = 'room-vignette-cold';
            break;
        case 'dojo':
            wallStyle = WALL_STYLES.shoji_screen;
            roofStyle = ROOF_STYLES.straw_thatch;
            VignetteClass = 'room-vignette-zen';
            break;
        case 'office':
        case 'lair':
            wallStyle = WALL_STYLES.concrete_tech;
            roofStyle = ROOF_STYLES.slate_blue; // Or a flat tech roof
            if (zoneKey === 'lair') VignetteClass = 'room-vignette-cold';
            break;
        case 'cafe':
        case 'philo_cafe':
        case 'art_studio':
            wallStyle = WALL_STYLES.wood_plaster;
            roofStyle = ROOF_STYLES.shingle_red;
            VignetteClass = 'room-vignette-warm';
            break;
    }


    const wallThickness = 20;

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {/* 1. Shadow (Soft) */}
            <div style={{
                position: 'absolute',
                left: zone.x1 + 8, top: zone.y1 + 16,
                width: zone.x2 - zone.x1, height: zone.y2 - zone.y1,
                backgroundColor: 'rgba(0,0,0,0.3)', filter: 'blur(8px)',
                zIndex: Math.floor(zone.y1 / 10) - 2
            }} />

            {/* 2. Floor Layer (The Room Interior) */}
            {/* The children passed here usually contain the FloorTexture + Furniture */}
            {/* We offset this slightly inwards so walls cover the edges */}
            <div className={`absolute ${VignetteClass}`} style={{
                left: zone.x1, top: zone.y1,
                width: zone.x2 - zone.x1, height: zone.y2 - zone.y1,
                zIndex: Math.floor(zone.y1 / 10) - 1,
                overflow: 'hidden'
            }}>
                {children}
            </div>

            {/* 3. Wall Facades (The "Box" Borders) */}
            {/* Top Wall (Roof Overhang) */}
            <div style={{
                position: 'absolute',
                left: zone.x1 - 10, top: zone.y1 - 40, // Overhangs top
                width: (zone.x2 - zone.x1) + 20, height: 60,
                zIndex: Math.floor(zone.y1 / 10) + 1000, // Always on top of everything in the room
                ...roofStyle,
                boxShadow: '0 4px 4px rgba(0,0,0,0.4)'
            }}>
                {/* Roof Ridge Detail */}
                <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(0,0,0,0.3)', position: 'absolute', bottom: 0 }}></div>
            </div>

            {/* Bottom Wall Base (Visual only, collision handled by layout) */}
            <div style={{
                position: 'absolute',
                left: zone.x1, top: zone.y2 - wallThickness,
                width: zone.x2 - zone.x1, height: wallThickness * 2,
                backgroundImage: wallStyle.backgroundImage,
                backgroundColor: wallStyle.backgroundColor,
                backgroundSize: wallStyle.backgroundSize,
                zIndex: Math.floor(zone.y2 / 10),
                borderTop: '2px solid rgba(0,0,0,0.5)'
            }} />

            {/* Left Wall */}
            <div style={{
                position: 'absolute',
                left: zone.x1 - wallThickness / 2, top: zone.y1,
                width: wallThickness, height: zone.y2 - zone.y1,
                backgroundImage: wallStyle.backgroundImage,
                backgroundColor: wallStyle.backgroundColor,
                backgroundSize: wallStyle.backgroundSize,
                zIndex: Math.floor(zone.y2 / 10) + 1 // High z-index to cover side
            }} />

            {/* Right Wall */}
            <div style={{
                position: 'absolute',
                left: zone.x2 - wallThickness / 2, top: zone.y1,
                width: wallThickness, height: zone.y2 - zone.y1,
                backgroundImage: wallStyle.backgroundImage,
                backgroundColor: wallStyle.backgroundColor,
                backgroundSize: wallStyle.backgroundSize,
                zIndex: Math.floor(zone.y2 / 10) + 1
            }} />

        </div>
    );
};
