/**
 * StickerNest v2 - Chat Interface
 * Conversational AI interface for widget generation and modification
 *
 * Updated with new design system: SNIcon, SNButton, glass effects
 */

import React, { useState, useRef, useEffect } from 'react';
import { getWidgetPipelineAI, type AIConversation, type AIGenerationResult, type ConversationMessage } from '../../ai';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';

export interface ChatInterfaceProps {
  conversation: AIConversation;
  modelPreset: string;
  onGenerate: (result: AIGenerationResult) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversation,
  modelPreset,
  onGenerate,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>(
    conversation.messages.filter(m => m.role !== 'system')
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setInput('');
    setIsLoading(true);

    // Add user message immediately
    const userMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const ai = getWidgetPipelineAI();
      ai.setModel(modelPreset);
      
      const response = await ai.chat(conversation.id, trimmedInput);
      
      setMessages(prev => [...prev, response]);

      // If widgets were generated, notify parent
      if (response.widgets && response.widgets.length > 0) {
        onGenerate({
          success: true,
          widget: response.widgets[0],
          explanation: response.content,
        });
      }
    } catch (error) {
      const errorMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--sn-text-tertiary, #64748b)',
              padding: '40px 20px',
            }}
          >
            <div style={{ marginBottom: '12px', color: 'var(--sn-accent-primary, #8b5cf6)', opacity: 0.7 }}>
              <SNIcon name="chat" size="2xl" />
            </div>
            <div style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--sn-text-secondary, #94a3b8)' }}>
              Start a conversation
            </div>
            <div style={{ fontSize: '0.75rem' }}>
              Ask me to create widgets, modify existing ones, or build pipelines.
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--sn-text-secondary, #94a3b8)',
              fontSize: '0.85rem',
            }}
          >
            <SNIcon name="loading" size="sm" spin />
            Thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--sn-border-primary, rgba(255,255,255,0.1))',
          background: 'var(--sn-glass-bg, rgba(0,0,0,0.2))',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a widget, ask for modifications..."
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'var(--sn-bg-primary, rgba(0,0,0,0.3))',
              border: '1px solid var(--sn-border-primary, rgba(255,255,255,0.1))',
              borderRadius: '8px',
              padding: '10px 12px',
              color: 'var(--sn-text-primary, #e2e8f0)',
              fontSize: '0.85rem',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              fontFamily: 'inherit',
            }}
            rows={1}
          />
          <SNButton
            type="submit"
            variant={input.trim() && !isLoading ? 'gradient' : 'glass'}
            disabled={!input.trim() || isLoading}
            leftIcon={isLoading ? 'loading' : 'send'}
          >
            {isLoading ? '' : 'Send'}
          </SNButton>
        </div>
        <div
          style={{
            marginTop: '6px',
            fontSize: '0.65rem',
            color: 'var(--sn-text-tertiary, #64748b)',
          }}
        >
          Press Enter to send, Shift+Enter for new line
        </div>
      </form>
    </div>
  );
};

/** Individual message bubble */
const MessageBubble: React.FC<{ message: ConversationMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const hasWidgets = message.widgets && message.widgets.length > 0;
  const hasErrors = message.errors && message.errors.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '10px 14px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser
            ? 'linear-gradient(135deg, var(--sn-accent-primary, #8b5cf6) 0%, var(--sn-accent-secondary, #6366f1) 100%)'
            : 'var(--sn-glass-bg, rgba(255,255,255,0.08))',
          color: 'var(--sn-text-primary, #e2e8f0)',
          fontSize: '0.85rem',
          lineHeight: 1.5,
        }}
      >
        <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>

        {hasWidgets && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: 'rgba(16, 185, 129, 0.2)',
              borderRadius: '6px',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--sn-success, #10b981)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <SNIcon name="success" size="xs" /> Widget Generated
            </div>
            {message.widgets!.map((w) => (
              <div key={w.id} style={{ color: 'var(--sn-text-secondary, #94a3b8)' }}>
                {w.manifest.name} ({w.manifest.id})
              </div>
            ))}
          </div>
        )}

        {hasErrors && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: 'rgba(239, 68, 68, 0.2)',
              borderRadius: '6px',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--sn-error, #ef4444)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <SNIcon name="error" size="xs" /> Errors
            </div>
            {message.errors!.map((err, i) => (
              <div key={i} style={{ color: '#fca5a5' }}>
                {err}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: '6px',
            fontSize: '0.65rem',
            color: isUser ? 'rgba(255,255,255,0.6)' : 'var(--sn-text-tertiary, #64748b)',
            textAlign: 'right',
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

