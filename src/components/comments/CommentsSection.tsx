/**
 * StickerNest v2 - Comments Section
 *
 * Comments and replies for canvases
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import { commentsApi, CanvasComment } from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../shared-ui';

// =============================================================================
// Types
// =============================================================================

interface CommentsSectionProps {
  canvasId: string;
}

// =============================================================================
// Component
// =============================================================================

export const CommentsSection: React.FC<CommentsSectionProps> = ({ canvasId }) => {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [comments, setComments] = useState<CanvasComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadComments = useCallback(async (pageNum = 1, append = false) => {
    try {
      const response = await commentsApi.list(canvasId, pageNum, 20);
      if (response.success && response.data) {
        setComments(prev =>
          append ? [...prev, ...response.data!.items] : response.data!.items
        );
        setHasMore(pageNum < response.data.totalPages);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }, [canvasId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !isAuthenticated) return;

    setSubmitting(true);
    try {
      const response = await commentsApi.add(canvasId, newComment.trim());
      if (response.success && response.data) {
        setComments(prev => [response.data!.comment, ...prev]);
        setNewComment('');
        toast.success('Comment posted');
      } else {
        toast.error(response.error?.message || 'Failed to post comment');
      }
    } catch (error) {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !isAuthenticated) return;

    setSubmitting(true);
    try {
      const response = await commentsApi.add(canvasId, replyContent.trim(), parentId);
      if (response.success && response.data) {
        // Update reply count on parent
        setComments(prev =>
          prev.map(c =>
            c.id === parentId ? { ...c, replyCount: c.replyCount + 1 } : c
          )
        );
        setReplyingTo(null);
        setReplyContent('');
        toast.success('Reply posted');
      } else {
        toast.error(response.error?.message || 'Failed to post reply');
      }
    } catch (error) {
      toast.error('Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!isAuthenticated) {
      toast.info('Please sign in to like comments');
      return;
    }

    try {
      const response = await commentsApi.toggleLike(commentId);
      if (response.success && response.data) {
        setComments(prev =>
          prev.map(c =>
            c.id === commentId
              ? { ...c, likes: response.data!.likes, isLiked: response.data!.liked }
              : c
          )
        );
      }
    } catch (error) {
      toast.error('Failed to like comment');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      const response = await commentsApi.delete(commentId);
      if (response.success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        toast.success('Comment deleted');
      } else {
        toast.error(response.error?.message || 'Failed to delete comment');
      }
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        <SNIcon name="messageCircle" size={20} />
        Comments ({comments.length})
      </h3>

      {/* Comment Input */}
      {isAuthenticated ? (
        <div style={styles.commentInput}>
          <div style={styles.inputAvatar}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" style={styles.avatarImg} />
            ) : (
              <SNIcon name="user" size={16} color="#8b5cf6" />
            )}
          </div>
          <div style={styles.inputWrapper}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              style={styles.textarea}
              rows={2}
            />
            <SNButton
              variant="primary"
              size="sm"
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? 'Posting...' : 'Post'}
            </SNButton>
          </div>
        </div>
      ) : (
        <div style={styles.signInPrompt}>
          <SNIcon name="lock" size={16} />
          <span>Sign in to comment</span>
        </div>
      )}

      {/* Comments List */}
      <div style={styles.commentsList}>
        {loading && comments.length === 0 && (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
          </div>
        )}

        {!loading && comments.length === 0 && (
          <div style={styles.emptyState}>
            <SNIcon name="messageCircle" size={32} color="#64748b" />
            <p>No comments yet. Be the first!</p>
          </div>
        )}

        {comments.map((comment) => (
          <div key={comment.id} style={styles.comment}>
            <div style={styles.commentAvatar}>
              {comment.user.avatarUrl ? (
                <img src={comment.user.avatarUrl} alt="" style={styles.avatarImg} />
              ) : (
                <SNIcon name="user" size={16} color="#8b5cf6" />
              )}
            </div>

            <div style={styles.commentBody}>
              <div style={styles.commentHeader}>
                <span style={styles.commentAuthor}>
                  {comment.user.displayName || comment.user.username}
                </span>
                <span style={styles.commentTime}>{formatTime(comment.createdAt)}</span>
              </div>

              <p style={styles.commentContent}>{comment.content}</p>

              <div style={styles.commentActions}>
                <button
                  style={{
                    ...styles.actionButton,
                    ...(comment.isLiked ? styles.actionButtonActive : {}),
                  }}
                  onClick={() => handleLike(comment.id)}
                >
                  <SNIcon
                    name="heart"
                    size={14}
                    color={comment.isLiked ? '#ef4444' : '#64748b'}
                  />
                  {comment.likes > 0 && <span>{comment.likes}</span>}
                </button>

                <button
                  style={styles.actionButton}
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                >
                  <SNIcon name="messageCircle" size={14} />
                  Reply
                  {comment.replyCount > 0 && <span>({comment.replyCount})</span>}
                </button>

                {user?.id === comment.user.id && (
                  <button
                    style={styles.actionButton}
                    onClick={() => handleDelete(comment.id)}
                  >
                    <SNIcon name="trash" size={14} />
                    Delete
                  </button>
                )}
              </div>

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div style={styles.replyInput}>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    style={styles.replyTextarea}
                    rows={2}
                    autoFocus
                  />
                  <div style={styles.replyActions}>
                    <SNButton
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent('');
                      }}
                    >
                      Cancel
                    </SNButton>
                    <SNButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyContent.trim() || submitting}
                    >
                      {submitting ? 'Posting...' : 'Reply'}
                    </SNButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Load More */}
        {hasMore && comments.length > 0 && (
          <button
            style={styles.loadMore}
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              loadComments(nextPage, true);
            }}
          >
            Load more comments
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
    background: 'rgba(15, 15, 25, 0.6)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 18,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 20px',
  },
  commentInput: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  inputWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
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
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
  },
  signInPrompt: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
    background: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 8,
    color: '#64748b',
    fontSize: 14,
    marginBottom: 24,
  },
  commentsList: {
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
  comment: {
    display: 'flex',
    gap: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f1f5f9',
  },
  commentTime: {
    fontSize: 12,
    color: '#64748b',
  },
  commentContent: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.5,
    margin: '0 0 8px',
    wordBreak: 'break-word',
  },
  commentActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    padding: 0,
    color: '#64748b',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  actionButtonActive: {
    color: '#ef4444',
  },
  replyInput: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  replyTextarea: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(15, 15, 25, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 13,
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    marginBottom: 8,
  },
  replyActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
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
    transition: 'background 0.2s',
  },
};

export default CommentsSection;
