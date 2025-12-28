/**
 * StickerNest v2 - Skeleton Loading Component
 * Provides animated loading placeholders
 */

import React from 'react';

interface SNSkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
  style?: React.CSSProperties;
}

export const SNSkeleton: React.FC<SNSkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className,
  style,
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'circular':
        return {
          borderRadius: '50%',
          width: width || 40,
          height: height || 40,
        };
      case 'rectangular':
        return {
          borderRadius: 0,
          width: width || '100%',
          height: height || 100,
        };
      case 'rounded':
        return {
          borderRadius: 8,
          width: width || '100%',
          height: height || 100,
        };
      case 'text':
      default:
        return {
          borderRadius: 4,
          width: width || '100%',
          height: height || '1em',
          marginBottom: 4,
        };
    }
  };

  const getAnimationStyles = (): React.CSSProperties => {
    if (animation === 'none') return {};

    return {
      animation: animation === 'pulse'
        ? 'skeleton-pulse 1.5s ease-in-out infinite'
        : 'skeleton-wave 1.5s ease-in-out infinite',
    };
  };

  return (
    <>
      <style>
        {`
          @keyframes skeleton-pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.7; }
          }
          @keyframes skeleton-wave {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}
      </style>
      <div
        className={className}
        style={{
          background: animation === 'wave'
            ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.1) 25%, rgba(139, 92, 246, 0.2) 50%, rgba(139, 92, 246, 0.1) 75%)'
            : 'rgba(139, 92, 246, 0.1)',
          backgroundSize: animation === 'wave' ? '200% 100%' : 'auto',
          display: 'block',
          ...getVariantStyles(),
          ...getAnimationStyles(),
          // Filter undefined values from style prop to prevent React error #306
          ...(style ? Object.fromEntries(Object.entries(style).filter(([_, v]) => v !== undefined)) : {}),
        }}
      />
    </>
  );
};

// Preset skeleton layouts
interface SkeletonCardProps {
  lines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3 }) => (
  <div style={{ padding: 16, background: 'rgba(30, 30, 46, 0.6)', borderRadius: 12 }}>
    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
      <SNSkeleton variant="circular" width={40} height={40} />
      <div style={{ flex: 1 }}>
        <SNSkeleton width="60%" height={16} />
        <SNSkeleton width="40%" height={12} style={{ marginTop: 4 }} />
      </div>
    </div>
    {Array.from({ length: lines }).map((_, i) => (
      <SNSkeleton
        key={i}
        width={i === lines - 1 ? '80%' : '100%'}
        height={14}
        style={{ marginBottom: 8 }}
      />
    ))}
  </div>
);

export const SkeletonWidget: React.FC = () => (
  <div style={{
    padding: 16,
    background: 'rgba(30, 30, 46, 0.6)',
    borderRadius: 12,
    border: '1px solid rgba(139, 92, 246, 0.1)',
  }}>
    <SNSkeleton variant="rounded" height={120} style={{ marginBottom: 12 }} />
    <SNSkeleton width="70%" height={18} style={{ marginBottom: 8 }} />
    <SNSkeleton width="50%" height={14} style={{ marginBottom: 12 }} />
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <SNSkeleton width={60} height={24} />
      <SNSkeleton width={80} height={32} variant="rounded" />
    </div>
  </div>
);

export const SkeletonStats: React.FC = () => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16
  }}>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} style={{
        padding: 20,
        background: 'rgba(30, 30, 46, 0.6)',
        borderRadius: 12
      }}>
        <SNSkeleton width={60} height={32} style={{ marginBottom: 8 }} />
        <SNSkeleton width="80%" height={14} />
      </div>
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div style={{
    background: 'rgba(30, 30, 46, 0.6)',
    borderRadius: 12,
    overflow: 'hidden'
  }}>
    <div style={{
      display: 'flex',
      padding: '12px 16px',
      background: 'rgba(15, 15, 25, 0.6)',
      gap: 16,
    }}>
      <SNSkeleton width="40%" height={12} />
      <SNSkeleton width="20%" height={12} />
      <SNSkeleton width="20%" height={12} />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{
        display: 'flex',
        padding: '12px 16px',
        borderTop: '1px solid rgba(139, 92, 246, 0.1)',
        gap: 16,
      }}>
        <SNSkeleton width="40%" height={14} />
        <SNSkeleton width="20%" height={14} />
        <SNSkeleton width="20%" height={14} />
      </div>
    ))}
  </div>
);

export default SNSkeleton;
