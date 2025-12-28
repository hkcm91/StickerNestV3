/**
 * StickerAnimationStyles
 * CSS keyframe animations for sticker interactions
 */

import React from 'react';

export const StickerAnimationStyles: React.FC = () => {
  return (
    <style>{`
      @keyframes stickerBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      @keyframes stickerShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
      @keyframes stickerPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      @keyframes stickerRipple {
        0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
        100% { box-shadow: 0 0 0 20px rgba(139, 92, 246, 0); }
      }
    `}</style>
  );
};
