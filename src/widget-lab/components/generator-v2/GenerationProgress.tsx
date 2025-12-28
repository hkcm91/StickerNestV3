/**
 * StickerNest v2 - Generation Progress Component
 * Shows real-time progress during widget generation
 */

import React, { useEffect, useState } from 'react';
import { theme } from '../../theme';
import type { GenerationStep, ProgressUpdate } from '../../../services/widget-generator-v2';
import { STEP_CONFIG, getStepLabel } from '../../../services/widget-generator-v2';

// Step icons
const STEP_ICONS: Record<GenerationStep, string> = {
  preparing: '🔧',
  'building-prompt': '📝',
  'calling-ai': '🤖',
  'parsing-response': '🔍',
  validating: '✅',
  'scoring-quality': '📊',
  'creating-draft': '💾',
  complete: '🎉',
  failed: '❌',
};

// Step order for progress display
const STEP_ORDER: GenerationStep[] = [
  'preparing',
  'building-prompt',
  'calling-ai',
  'parsing-response',
  'validating',
  'scoring-quality',
  'creating-draft',
  'complete',
];

interface GenerationProgressProps {
  currentStep: GenerationStep;
  progress: number;
  message: string;
  startTime?: number;
  onCancel?: () => void;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  currentStep,
  progress,
  message,
  startTime,
  onCancel,
}) => {
  const [elapsed, setElapsed] = useState(0);

  // Update elapsed time
  useEffect(() => {
    if (!startTime || currentStep === 'complete' || currentStep === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, currentStep]);

  const isComplete = currentStep === 'complete';
  const isFailed = currentStep === 'failed';
  const isActive = !isComplete && !isFailed;

  // Get current step index
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div style={{
      background: theme.bg.secondary,
      borderRadius: '12px',
      border: `2px solid ${
        isComplete ? theme.success :
        isFailed ? theme.error :
        theme.accent
      }`,
      padding: '20px',
      marginBottom: '16px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontSize: '24px' }}>
            {STEP_ICONS[currentStep]}
          </span>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: theme.text.primary,
            }}>
              {isComplete ? 'Generation Complete!' :
               isFailed ? 'Generation Failed' :
               'Generating Widget...'}
            </div>
            <div style={{
              fontSize: '12px',
              color: theme.text.secondary,
            }}>
              {message}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* Elapsed time */}
          {startTime && (
            <div style={{
              padding: '4px 10px',
              background: theme.bg.tertiary,
              borderRadius: '6px',
              fontSize: '12px',
              color: theme.text.secondary,
              fontFamily: 'monospace',
            }}>
              {formatTime(elapsed)}
            </div>
          )}

          {/* Cancel button */}
          {isActive && onCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                border: `1px solid ${theme.error}`,
                borderRadius: '6px',
                color: theme.error,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '8px',
        background: theme.bg.tertiary,
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '16px',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, progress))}%`,
          background: isComplete ? theme.success :
                     isFailed ? theme.error :
                     `linear-gradient(90deg, ${theme.accent}, #3b82f6)`,
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Step Indicators */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        {STEP_ORDER.filter(s => s !== 'complete').map((step, index) => {
          const stepIndex = index;
          const isPast = currentIndex > stepIndex || isComplete;
          const isCurrent = currentIndex === stepIndex && !isComplete && !isFailed;
          const isFailedStep = isFailed && currentIndex === stepIndex;

          return (
            <div
              key={step}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: isPast || isCurrent ? 1 : 0.4,
              }}
            >
              {/* Step Icon */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: isPast ? theme.success :
                           isFailedStep ? theme.error :
                           isCurrent ? theme.accent :
                           theme.bg.tertiary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                marginBottom: '4px',
                transition: 'all 0.2s ease',
                boxShadow: isCurrent ? `0 0 12px ${theme.accent}` : 'none',
              }}>
                {isPast ? '✓' :
                 isFailedStep ? '✕' :
                 isCurrent && (
                   <span style={{
                     width: '8px',
                     height: '8px',
                     borderRadius: '50%',
                     background: 'white',
                     animation: 'pulse 1s infinite',
                   }} />
                 )}
              </div>

              {/* Step Label */}
              <div style={{
                fontSize: '9px',
                color: isCurrent ? theme.text.primary : theme.text.tertiary,
                textAlign: 'center',
                maxWidth: '60px',
                lineHeight: 1.2,
              }}>
                {getStepLabel(step)}
              </div>
            </div>
          );
        })}
      </div>

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};

// Mini progress indicator for compact view
export const MiniProgress: React.FC<{
  progress: number;
  isActive: boolean;
}> = ({ progress, isActive }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }}>
    {isActive && (
      <div style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: `2px solid ${theme.accent}`,
        borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite',
      }} />
    )}
    <div style={{
      flex: 1,
      height: '4px',
      background: theme.bg.tertiary,
      borderRadius: '2px',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: theme.accent,
        transition: 'width 0.3s ease',
      }} />
    </div>
    <span style={{
      fontSize: '11px',
      color: theme.text.secondary,
      minWidth: '32px',
    }}>
      {progress}%
    </span>

    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);
