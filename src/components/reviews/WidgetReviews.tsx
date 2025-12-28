/**
 * StickerNest v2 - Widget Reviews Component
 *
 * Star ratings and reviews for marketplace widgets
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';
import { reviewsApi, WidgetReview } from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../shared-ui';

// =============================================================================
// Types
// =============================================================================

interface WidgetReviewsProps {
  widgetId: string;
}

// =============================================================================
// Star Rating Component
// =============================================================================

const StarRating: React.FC<{
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
}> = ({ rating, onChange, readonly = false, size = 16 }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: readonly ? 'default' : 'pointer',
          }}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          disabled={readonly}
        >
          <SNIcon
            name="star"
            size={size}
            color={(hoverRating || rating) >= star ? '#fbbf24' : '#374151'}
          />
        </button>
      ))}
    </div>
  );
};

// =============================================================================
// Component
// =============================================================================

export const WidgetReviews: React.FC<WidgetReviewsProps> = ({ widgetId }) => {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [reviews, setReviews] = useState<WidgetReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingBreakdown, setRatingBreakdown] = useState<Record<number, number>>({});
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 0, title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadReviews = useCallback(async (pageNum = 1, append = false) => {
    try {
      const response = await reviewsApi.list(widgetId, pageNum, 10);
      if (response.success && response.data) {
        setReviews(prev =>
          append ? [...prev, ...response.data!.items] : response.data!.items
        );
        setAverageRating(response.data.averageRating);
        setRatingBreakdown(response.data.ratingBreakdown);
        setHasMore(pageNum < response.data.totalPages);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [widgetId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSubmitReview = async () => {
    if (!newReview.rating || !newReview.content.trim()) {
      toast.error('Please provide a rating and review');
      return;
    }

    setSubmitting(true);
    try {
      const response = await reviewsApi.add(widgetId, {
        rating: newReview.rating,
        title: newReview.title.trim() || undefined,
        content: newReview.content.trim(),
      });

      if (response.success && response.data) {
        setReviews(prev => [response.data!.review, ...prev]);
        setNewReview({ rating: 0, title: '', content: '' });
        setShowReviewForm(false);
        toast.success('Review posted');
        loadReviews(); // Refresh to update averages
      } else {
        toast.error(response.error?.message || 'Failed to post review');
      }
    } catch (error) {
      toast.error('Failed to post review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    if (!isAuthenticated) {
      toast.info('Please sign in to mark reviews as helpful');
      return;
    }

    try {
      const response = await reviewsApi.markHelpful(reviewId);
      if (response.success && response.data) {
        setReviews(prev =>
          prev.map(r =>
            r.id === reviewId ? { ...r, helpful: response.data!.helpful } : r
          )
        );
      }
    } catch (error) {
      toast.error('Failed to mark as helpful');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalReviews = Object.values(ratingBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div style={styles.container}>
      {/* Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryLeft}>
          <div style={styles.averageRating}>{averageRating.toFixed(1)}</div>
          <StarRating rating={Math.round(averageRating)} readonly size={20} />
          <span style={styles.totalReviews}>{totalReviews} reviews</span>
        </div>

        <div style={styles.summaryRight}>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingBreakdown[stars] || 0;
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

            return (
              <div key={stars} style={styles.ratingBar}>
                <span style={styles.ratingLabel}>{stars}</span>
                <SNIcon name="star" size={12} color="#fbbf24" />
                <div style={styles.barBackground}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${percentage}%`,
                    }}
                  />
                </div>
                <span style={styles.ratingCount}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Write Review Button */}
      {isAuthenticated && !showReviewForm && (
        <SNButton
          variant="secondary"
          onClick={() => setShowReviewForm(true)}
          style={{ marginBottom: 24 }}
        >
          <SNIcon name="edit" size={16} />
          Write a Review
        </SNButton>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <div style={styles.reviewForm}>
          <h4 style={styles.formTitle}>Write a Review</h4>

          <div style={styles.formGroup}>
            <label style={styles.label}>Rating</label>
            <StarRating
              rating={newReview.rating}
              onChange={(rating) => setNewReview(prev => ({ ...prev, rating }))}
              size={24}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Title (optional)</label>
            <input
              type="text"
              value={newReview.title}
              onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Summarize your review"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Review</label>
            <textarea
              value={newReview.content}
              onChange={(e) => setNewReview(prev => ({ ...prev, content: e.target.value }))}
              placeholder="What did you like or dislike about this widget?"
              style={styles.textarea}
              rows={4}
            />
          </div>

          <div style={styles.formActions}>
            <SNButton
              variant="ghost"
              onClick={() => {
                setShowReviewForm(false);
                setNewReview({ rating: 0, title: '', content: '' });
              }}
            >
              Cancel
            </SNButton>
            <SNButton
              variant="primary"
              onClick={handleSubmitReview}
              disabled={submitting || !newReview.rating || !newReview.content.trim()}
            >
              {submitting ? 'Posting...' : 'Post Review'}
            </SNButton>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div style={styles.reviewsList}>
        {loading && reviews.length === 0 && (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
          </div>
        )}

        {!loading && reviews.length === 0 && (
          <div style={styles.emptyState}>
            <SNIcon name="star" size={32} color="#64748b" />
            <p>No reviews yet. Be the first to review!</p>
          </div>
        )}

        {reviews.map((review) => (
          <div key={review.id} style={styles.review}>
            <div style={styles.reviewHeader}>
              <div style={styles.reviewUser}>
                <div style={styles.userAvatar}>
                  {review.user.avatarUrl ? (
                    <img src={review.user.avatarUrl} alt="" style={styles.avatarImg} />
                  ) : (
                    <SNIcon name="user" size={16} color="#8b5cf6" />
                  )}
                </div>
                <span style={styles.username}>{review.user.username}</span>
              </div>
              <span style={styles.reviewDate}>{formatDate(review.createdAt)}</span>
            </div>

            <StarRating rating={review.rating} readonly size={14} />

            {review.title && (
              <h4 style={styles.reviewTitle}>{review.title}</h4>
            )}

            <p style={styles.reviewContent}>{review.content}</p>

            {review.reply && (
              <div style={styles.replyBox}>
                <strong>Developer Response:</strong>
                <p>{review.reply.content}</p>
              </div>
            )}

            <button
              style={styles.helpfulButton}
              onClick={() => handleMarkHelpful(review.id)}
            >
              <SNIcon name="thumbs-up" size={14} />
              Helpful ({review.helpful})
            </button>
          </div>
        ))}

        {/* Load More */}
        {hasMore && reviews.length > 0 && (
          <button
            style={styles.loadMore}
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              loadReviews(nextPage, true);
            }}
          >
            Load more reviews
          </button>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 24,
  },
  summary: {
    display: 'flex',
    gap: 40,
    padding: 24,
    background: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 12,
    marginBottom: 24,
  },
  summaryLeft: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    minWidth: 120,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 700,
    color: '#f1f5f9',
    lineHeight: 1,
  },
  totalReviews: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryRight: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  ratingBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  ratingLabel: {
    width: 12,
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'right',
  },
  barBackground: {
    flex: 1,
    height: 8,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
    borderRadius: 4,
    transition: 'width 0.3s',
  },
  ratingCount: {
    width: 30,
    fontSize: 13,
    color: '#64748b',
  },
  reviewForm: {
    padding: 20,
    background: 'rgba(15, 15, 25, 0.6)',
    borderRadius: 12,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 16px',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(15, 15, 25, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(15, 15, 25, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    boxSizing: 'border-box',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  reviewsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  spinner: {
    width: 24,
    height: 24,
    border: '2px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    gap: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  review: {
    padding: 20,
    background: 'rgba(15, 15, 25, 0.4)',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  reviewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewUser: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  username: {
    fontSize: 14,
    fontWeight: 500,
    color: '#f1f5f9',
  },
  reviewDate: {
    fontSize: 12,
    color: '#64748b',
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '12px 0 8px',
  },
  reviewContent: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.6,
    margin: '8px 0 12px',
  },
  replyBox: {
    padding: 12,
    background: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 8,
    borderLeft: '3px solid #8b5cf6',
    marginBottom: 12,
    fontSize: 13,
    color: '#94a3b8',
  },
  helpfulButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    padding: 0,
    color: '#64748b',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  loadMore: {
    display: 'block',
    width: '100%',
    padding: 12,
    background: 'transparent',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#8b5cf6',
    fontSize: 14,
    cursor: 'pointer',
  },
};

export default WidgetReviews;
