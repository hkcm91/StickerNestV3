/**
 * StickerNest v2 - Feedback Button Component
 * Thumbs up/down buttons for AI generation feedback
 * Connects to the GenerationMetricsStore for self-improvement tracking
 */

import React, { useState } from 'react';
import { useGenerationMetricsStore } from '../../state/useGenerationMetricsStore';

interface FeedbackButtonProps {
  /** Generation ID to provide feedback for */
  generationId: string;
  /** Current feedback state (if already provided) */
  currentFeedback?: 'thumbs_up' | 'thumbs_down' | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show labels */
  showLabels?: boolean;
  /** Callback after feedback is submitted */
  onFeedbackSubmitted?: (type: 'thumbs_up' | 'thumbs_down') => void;
  /** Optional className */
  className?: string;
  /** Direction: horizontal or vertical */
  direction?: 'horizontal' | 'vertical';
}

/**
 * Feedback button for rating AI generations
 * Used by the self-improving AI system to collect user feedback
 */
export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  generationId,
  currentFeedback = null,
  size = 'md',
  showLabels = false,
  onFeedbackSubmitted,
  className = '',
  direction = 'horizontal',
}) => {
  const [feedback, setFeedback] = useState<'thumbs_up' | 'thumbs_down' | null>(currentFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addFeedback = useGenerationMetricsStore((s) => s.addFeedback);

  const sizeConfig = {
    sm: { iconSize: 14, padding: '4px 8px', fontSize: 11, gap: 4 },
    md: { iconSize: 18, padding: '6px 12px', fontSize: 12, gap: 6 },
    lg: { iconSize: 22, padding: '8px 16px', fontSize: 13, gap: 8 },
  };

  const config = sizeConfig[size];

  const handleFeedback = async (type: 'thumbs_up' | 'thumbs_down') => {
    if (isSubmitting || feedback === type) return;

    setIsSubmitting(true);

    try {
      // Add feedback to the metrics store
      addFeedback(
        generationId,
        type,
        type === 'thumbs_up' ? 5 : 1,
        undefined,
        [type === 'thumbs_up' ? 'good_output' : 'poor_output']
      );

      setFeedback(type);
      onFeedbackSubmitted?.(type);
    } catch (error) {
      console.error('[FeedbackButton] Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction === 'vertical' ? 'column' : 'row',
    gap: config.gap,
    alignItems: 'center',
  };

  const buttonBaseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: config.gap,
    padding: config.padding,
    fontSize: config.fontSize,
    fontWeight: 500,
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.03)',
    color: '#94a3b8',
    cursor: isSubmitting ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    opacity: isSubmitting ? 0.5 : 1,
  };

  const thumbsUpStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    ...(feedback === 'thumbs_up' && {
      background: 'rgba(34, 197, 94, 0.15)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      color: '#22c55e',
    }),
  };

  const thumbsDownStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    ...(feedback === 'thumbs_down' && {
      background: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      color: '#ef4444',
    }),
  };

  // Thumbs up SVG icon
  const ThumbsUpIcon = () => (
    <svg
      width={config.iconSize}
      height={config.iconSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );

  // Thumbs down SVG icon
  const ThumbsDownIcon = () => (
    <svg
      width={config.iconSize}
      height={config.iconSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );

  return (
    <div className={className} style={containerStyle}>
      <button
        style={thumbsUpStyle}
        onClick={() => handleFeedback('thumbs_up')}
        disabled={isSubmitting}
        title="Good output"
        onMouseEnter={(e) => {
          if (feedback !== 'thumbs_up') {
            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
            e.currentTarget.style.color = '#22c55e';
          }
        }}
        onMouseLeave={(e) => {
          if (feedback !== 'thumbs_up') {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.color = '#94a3b8';
          }
        }}
      >
        <ThumbsUpIcon />
        {showLabels && <span>Good</span>}
      </button>

      <button
        style={thumbsDownStyle}
        onClick={() => handleFeedback('thumbs_down')}
        disabled={isSubmitting}
        title="Poor output"
        onMouseEnter={(e) => {
          if (feedback !== 'thumbs_down') {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.color = '#ef4444';
          }
        }}
        onMouseLeave={(e) => {
          if (feedback !== 'thumbs_down') {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.color = '#94a3b8';
          }
        }}
      >
        <ThumbsDownIcon />
        {showLabels && <span>Bad</span>}
      </button>

      {feedback && (
        <span
          style={{
            fontSize: config.fontSize - 1,
            color: '#64748b',
            fontStyle: 'italic',
          }}
        >
          Thanks!
        </span>
      )}
    </div>
  );
};

/**
 * Detailed feedback modal for more specific feedback
 */
export const DetailedFeedbackModal: React.FC<{
  generationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: {
    rating: 1 | 2 | 3 | 4 | 5;
    comment: string;
    tags: string[];
  }) => void;
}> = ({ generationId, isOpen, onClose, onSubmit }) => {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const feedbackTags = [
    'accurate',
    'creative',
    'fast',
    'slow',
    'wrong_style',
    'too_verbose',
    'missing_details',
    'perfect',
    'needs_improvement',
    'unusable',
  ];

  const addFeedback = useGenerationMetricsStore((s) => s.addFeedback);

  if (!isOpen) return null;

  const handleSubmit = () => {
    addFeedback(generationId, 'rating', rating, comment, selectedTags);
    onSubmit({ rating, comment, tags: selectedTags });
    onClose();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  };

  const modalStyle: React.CSSProperties = {
    background: '#1a1a2e',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', color: '#e2e8f0', fontSize: 16 }}>
          Rate This Output
        </h3>

        {/* Star Rating */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#94a3b8', fontSize: 13 }}>
            Rating
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {([1, 2, 3, 4, 5] as const).map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  border: 'none',
                  background: star <= rating ? '#eab308' : 'rgba(255, 255, 255, 0.05)',
                  color: star <= rating ? '#0f0f19' : '#64748b',
                  cursor: 'pointer',
                  fontSize: 16,
                  transition: 'all 0.15s',
                }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#94a3b8', fontSize: 13 }}>
            Tags (optional)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {feedbackTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 12,
                  border: '1px solid',
                  borderColor: selectedTags.includes(tag)
                    ? 'rgba(139, 92, 246, 0.5)'
                    : 'rgba(255, 255, 255, 0.08)',
                  background: selectedTags.includes(tag)
                    ? 'rgba(139, 92, 246, 0.15)'
                    : 'transparent',
                  color: selectedTags.includes(tag) ? '#a78bfa' : '#94a3b8',
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tag.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#94a3b8', fontSize: 13 }}>
            Comment (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What could be improved?"
            style={{
              width: '100%',
              minHeight: 80,
              padding: 10,
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#e2e8f0',
              fontSize: 13,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackButton;
