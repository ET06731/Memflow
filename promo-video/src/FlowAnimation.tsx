import { useCurrentFrame, random } from 'remotion';
import React from 'react';

export const FlowAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const particles = new Array(15).fill(0).map((_, i) => i);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {particles.map((i) => {
        // Random properties based on index
        const delay = i * 5;
        const speed = 0.8 + random(i) * 0.5; // 0.8 to 1.3
        const yOffset = (random(i * 2) - 0.5) * 40; // -20px to 20px vertical spread
        
        // Calculate position
        // Loop the animation: (frame * speed) % width
        const progress = ((frame - delay) * speed * 2) % 450; // Move 450px then loop
        const opacity = progress < 50 ? progress / 50 : progress > 350 ? (400 - progress) / 50 : 1;
        
        // Don't show before start
        if (frame < delay) return null;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${progress - 20}px`,
              top: `calc(50% + ${yOffset}px)`,
              width: '12px',
              height: '4px',
              borderRadius: '2px',
              background: 'linear-gradient(90deg, #f59e0b, #fbd38d)',
              boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)',
              opacity: Math.max(0, opacity),
              transform: 'translateY(-50%)',
            }}
          />
        );
      })}
      
      {/* Connecting Line */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '0',
        right: '0',
        height: '2px',
        background: 'rgba(255, 255, 255, 0.1)',
        transform: 'translateY(-50%)',
        zIndex: -1
      }} />
    </div>
  );
};
