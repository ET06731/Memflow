import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from 'remotion';
import { FlowAnimation } from './FlowAnimation';
import { Brain, FileText } from 'lucide-react';

export const MainComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animation for title
  const titleOpacity = interpolate(frame, [0, 20], [0, 1]);
  const titleY = interpolate(frame, [0, 20], [50, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f0f12', color: 'white', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Background Elements */}
      <AbsoluteFill style={{ zIndex: 0 }}>
        <div style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </AbsoluteFill>

      {/* Scene 1: The Concept (0s - 3s) */}
      <Sequence durationInFrames={90}>
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, textAlign: 'center' }}>
          <h1 style={{ fontSize: '80px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Memflow
          </h1>
          <p style={{ fontSize: '32px', color: '#888', marginTop: '20px' }}>
            Flow your AI conversations into Obsidian
          </p>
        </div>
      </Sequence>

      {/* Scene 2: The Flow (3s - 10s) */}
      <Sequence from={90}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '100px', transform: 'scale(1.2)' }}>
          
          {/* Left: AI Source */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ 
              width: '120px', height: '120px', 
              background: '#2d3748', borderRadius: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <Brain size={64} color="#63b3ed" />
            </div>
            <span style={{ fontSize: '24px', fontWeight: 600, color: '#cbd5e0' }}>AI Chats</span>
          </div>

          {/* Center: The Bridge */}
          <div style={{ width: '400px', height: '100px', position: 'relative' }}>
            <FlowAnimation />
          </div>

          {/* Right: Obsidian Destination */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ 
              width: '120px', height: '120px', 
              background: '#2d3748', borderRadius: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <FileText size={64} color="#9f7aea" />
            </div>
            <span style={{ fontSize: '24px', fontWeight: 600, color: '#cbd5e0' }}>Obsidian</span>
          </div>

        </div>
      </Sequence>

      {/* Overlay: Features */}
      <Sequence from={130}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '100px', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', gap: '40px' }}>
            {['Smart Metadata', 'Markdown Export', 'One-Click'].map((text, i) => {
              const delay = i * 10;
              const op = interpolate(frame - 130, [delay, delay + 15], [0, 1], { extrapolateRight: 'clamp' });
              const y = interpolate(frame - 130, [delay, delay + 15], [20, 0], { extrapolateRight: 'clamp' });
              
              return (
                <div key={text} style={{ 
                  opacity: op, transform: `translateY(${y}px)`,
                  background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
                  padding: '12px 24px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '20px', fontWeight: 600
                }}>
                  {text}
                </div>
              )
            })}
          </div>
        </AbsoluteFill>
      </Sequence>

    </AbsoluteFill>
  );
};
