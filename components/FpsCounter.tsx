import React, { useState, useEffect, useRef } from 'react';

const FpsCounter = () => {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const calculateFps = () => {
      frameCount.current++;
      const now = performance.now();
      const delta = now - lastTime.current;

      if (delta >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / delta));
        frameCount.current = 0;
        lastTime.current = now;
      }

      animationFrameId.current = requestAnimationFrame(calculateFps);
    };

    animationFrameId.current = requestAnimationFrame(calculateFps);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      backgroundColor: 'rgba(0,0,0,0.7)',
      color: '#00ff00',
      padding: '4px 8px',
      fontFamily: "'VT323', monospace",
      fontSize: '1.2rem',
      zIndex: 10001,
      border: '1px solid #00ff00',
      textShadow: '0 0 2px #00ff00',
      pointerEvents: 'none',
    }}>
      FPS: {fps}
    </div>
  );
};

export default FpsCounter;