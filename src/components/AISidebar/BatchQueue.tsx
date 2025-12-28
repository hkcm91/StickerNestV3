/**
 * StickerNest v2 - Batch Queue
 * UI for managing batch widget generation
 *
 * Updated with new design system: SNIcon, SNIconButton, SNButton
 */

import React, { useState, useCallback } from 'react';
import { getWidgetPipelineAI, type AIGenerationResult } from '../../ai';
import type { DraftWidget } from '../../ai/DraftManager';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import { SNButton } from '../../shared-ui/SNButton';

export interface BatchItem {
  id: string;
  description: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  result?: AIGenerationResult;
  error?: string;
}

export interface BatchQueueProps {
  onWidgetGenerated: (draft: DraftWidget) => void;
  onClose: () => void;
}

export const BatchQueue: React.FC<BatchQueueProps> = ({
  onWidgetGenerated,
  onClose,
}) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [newDescription, setNewDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Add item to queue
  const addItem = useCallback(() => {
    if (!newDescription.trim()) return;
    
    const newItem: BatchItem = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      description: newDescription.trim(),
      status: 'pending',
    };
    
    setItems(prev => [...prev, newItem]);
    setNewDescription('');
  }, [newDescription]);

  // Add multiple items (from multiline input)
  const addMultipleItems = useCallback((text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const newItems: BatchItem[] = lines.map((line, i) => ({
      id: `batch-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
      description: line.trim(),
      status: 'pending',
    }));
    
    setItems(prev => [...prev, ...newItems]);
    setNewDescription('');
  }, []);

  // Remove item from queue
  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Clear completed items
  const clearCompleted = useCallback(() => {
    setItems(prev => prev.filter(item => item.status !== 'completed'));
  }, []);

  // Process queue
  const processQueue = useCallback(async () => {
    const pendingItems = items.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) return;
    
    setIsProcessing(true);
    const ai = getWidgetPipelineAI();
    
    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      setCurrentIndex(i);
      
      // Update status to generating
      setItems(prev => prev.map(it => 
        it.id === item.id ? { ...it, status: 'generating' } : it
      ));
      
      try {
        const result = await ai.generateWidget({
          description: item.description,
          mode: 'new',
        });
        
        // Update status based on result
        setItems(prev => prev.map(it => 
          it.id === item.id 
            ? { 
                ...it, 
                status: result.success ? 'completed' : 'failed',
                result,
                error: result.success ? undefined : result.errors?.join(', '),
              } 
            : it
        ));
        
        // Notify parent of successful generation
        if (result.success && result.widget) {
          onWidgetGenerated(result.widget);
        }
        
      } catch (error) {
        setItems(prev => prev.map(it => 
          it.id === item.id 
            ? { 
                ...it, 
                status: 'failed',
                error: error instanceof Error ? error.message : 'Generation failed',
              } 
            : it
        ));
      }
      
      // Small delay between generations
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsProcessing(false);
    setCurrentIndex(0);
  }, [items, onWidgetGenerated]);

  // Get stats
  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    completed: items.filter(i => i.status === 'completed').length,
    failed: items.filter(i => i.status === 'failed').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 8,
        borderBottom: '1px solid var(--sn-border-primary, rgba(255,255,255,0.1))',
      }}>
        <h4 style={{ margin: 0, color: 'var(--sn-text-primary, #e2e8f0)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <SNIcon name="queue" size="md" />
          Batch Generation
        </h4>
        <SNIconButton
          icon="close"
          variant="ghost"
          size="sm"
          tooltip="Close"
          onClick={onClose}
        />
      </div>

      {/* Add Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Enter widget descriptions (one per line for multiple)..."
          rows={3}
          style={{
            padding: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            color: '#e2e8f0',
            fontSize: '0.85rem',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={addItem}
            disabled={!newDescription.trim()}
            style={{
              flex: 1,
              padding: '8px',
              background: newDescription.trim() ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: 6,
              color: newDescription.trim() ? '#e2e8f0' : '#64748b',
              cursor: newDescription.trim() ? 'pointer' : 'default',
              fontSize: '0.8rem',
            }}
          >
            + Add Single
          </button>
          <button
            onClick={() => addMultipleItems(newDescription)}
            disabled={!newDescription.includes('\n')}
            style={{
              flex: 1,
              padding: '8px',
              background: newDescription.includes('\n') ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: 6,
              color: newDescription.includes('\n') ? '#e2e8f0' : '#64748b',
              cursor: newDescription.includes('\n') ? 'pointer' : 'default',
              fontSize: '0.8rem',
            }}
          >
            + Add Multiple
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {items.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 6,
          fontSize: '0.75rem',
        }}>
          <span style={{ color: '#64748b' }}>
            Total: <strong style={{ color: '#e2e8f0' }}>{stats.total}</strong>
          </span>
          <span style={{ color: '#fbbf24' }}>
            Pending: {stats.pending}
          </span>
          <span style={{ color: '#10b981' }}>
            Done: {stats.completed}
          </span>
          {stats.failed > 0 && (
            <span style={{ color: '#ef4444' }}>
              Failed: {stats.failed}
            </span>
          )}
        </div>
      )}

      {/* Queue List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {items.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 30,
            color: 'var(--sn-text-tertiary, #64748b)',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: 8, color: 'var(--sn-accent-primary, #8b5cf6)', opacity: 0.7 }}>
              <SNIcon name="list" size="2xl" />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--sn-text-secondary, #94a3b8)' }}>Queue is empty</span>
            <span style={{ fontSize: '0.75rem', marginTop: 4 }}>
              Add widget descriptions above to generate multiple widgets at once
            </span>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              style={{
                padding: '10px 12px',
                background: item.status === 'generating' 
                  ? 'rgba(139, 92, 246, 0.1)'
                  : item.status === 'completed'
                  ? 'rgba(16, 185, 129, 0.1)'
                  : item.status === 'failed'
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(255,255,255,0.03)',
                borderRadius: 6,
                border: `1px solid ${
                  item.status === 'generating' 
                    ? 'rgba(139, 92, 246, 0.3)'
                    : item.status === 'completed'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : item.status === 'failed'
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(255,255,255,0.05)'
                }`,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}>
                <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--sn-text-tertiary, #64748b)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span>#{index + 1}</span>
                  {item.status === 'generating' && (
                    <span style={{ color: 'var(--sn-accent-primary, #8b5cf6)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <SNIcon name="loading" size="xs" spin /> Generating...
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <span style={{ color: 'var(--sn-success, #10b981)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <SNIcon name="success" size="xs" /> Complete
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <span style={{ color: 'var(--sn-error, #ef4444)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <SNIcon name="error" size="xs" /> Failed
                    </span>
                  )}
                  {item.status === 'pending' && (
                    <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <SNIcon name="circle" size="xs" /> Pending
                    </span>
                  )}
                </span>
                {item.status !== 'generating' && (
                  <SNIconButton
                    icon="close"
                    variant="ghost"
                    size="sm"
                    tooltip="Remove"
                    onClick={() => removeItem(item.id)}
                  />
                )}
              </div>
              
              <p style={{ 
                margin: 0, 
                fontSize: '0.8rem', 
                color: '#e2e8f0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {item.description}
              </p>
              
              {item.error && (
                <p style={{ 
                  margin: '6px 0 0 0', 
                  fontSize: '0.7rem', 
                  color: '#ef4444',
                }}>
                  {item.error}
                </p>
              )}
              
              {item.result?.widget && (
                <p style={{ 
                  margin: '6px 0 0 0', 
                  fontSize: '0.7rem', 
                  color: '#10b981',
                }}>
                  Created: {item.result.widget.manifest.name}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        gap: 8,
        paddingTop: 8,
        borderTop: '1px solid var(--sn-border-primary, rgba(255,255,255,0.1))',
      }}>
        <SNButton
          variant="gradient"
          leftIcon={isProcessing ? 'loading' : 'play'}
          onClick={processQueue}
          disabled={isProcessing || stats.pending === 0}
          style={{ flex: 1 }}
        >
          {isProcessing
            ? `Generating ${currentIndex + 1}/${stats.pending}...`
            : `Generate ${stats.pending} Widget${stats.pending !== 1 ? 's' : ''}`
          }
        </SNButton>
        {stats.completed > 0 && (
          <SNButton
            variant="glass"
            onClick={clearCompleted}
          >
            Clear Done
          </SNButton>
        )}
      </div>
    </div>
  );
};

export default BatchQueue;

