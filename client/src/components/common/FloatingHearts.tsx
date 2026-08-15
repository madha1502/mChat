import React, { useMemo } from 'react';

interface FloatingElement {
  id: number;
  emoji: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

const EMOJIS = ['💖', '💕', '🌸', '🧸', '🐼', '✨', '💝', '💗', '🍓', '🎀'];

export const FloatingHearts: React.FC = () => {
  const elements = useMemo<FloatingElement[]>(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      emoji: EMOJIS[i % EMOJIS.length],
      left: Math.random() * 100,
      size: 14 + Math.random() * 18,
      duration: 12 + Math.random() * 18,
      delay: Math.random() * 10,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {elements.map((el) => (
        <div
          key={el.id}
          className="absolute animate-float-heart select-none"
          style={{
            left: `${el.left}%`,
            bottom: '-40px',
            fontSize: `${el.size}px`,
            animationDuration: `${el.duration}s`,
            animationDelay: `${el.delay}s`,
          }}
        >
          {el.emoji}
        </div>
      ))}
    </div>
  );
};
