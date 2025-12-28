/**
 * StickerNest v2 - Message Logger
 * Tracks and displays postMessage traffic between parent and widget iframes
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface LoggedMessage {
  id: number;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  type: string;
  source: string;
  data: unknown;
  size: number;
}

interface MessageLoggerProps {
  isOpen: boolean;
  onClose: () => void;
}

const messageTypeColors: Record<string, string> = {
  'widget:': '#8b5cf6',
  'pipeline:': '#22c55e',
  'event:': '#06b6d4',
  'canvas:': '#f59e0b',
  'error': '#ef4444',
  'request': '#3b82f6',
  'response': '#10b981',
};

const getTypeColor = (type: string): string => {
  for (const [prefix, color] of Object.entries(messageTypeColors)) {
    if (type.toLowerCase().includes(prefix.replace(':', ''))) return color;
  }
  return '#94a3b8';
};

export const MessageLogger: React.FC<MessageLoggerProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<LoggedMessage[]>([]);
  const [filter, setFilter] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<LoggedMessage | null>(null);
  const messageIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Intercept postMessage
  useEffect(() => {
    if (!isOpen) return;

    // Store original postMessage
    const originalPostMessage = window.postMessage.bind(window);

    // Override postMessage to log outgoing messages
    window.postMessage = function (message: unknown, targetOrigin: string, transfer?: Transferable[]) {
      if (!isPaused) {
        const msgStr = JSON.stringify(message);
        setMessages((prev) => [
          ...prev.slice(-499), // Keep last 500
          {
            id: messageIdRef.current++,
            timestamp: Date.now(),
            direction: 'outgoing',
            type: (message as { type?: string })?.type || 'unknown',
            source: 'parent',
            data: message,
            size: msgStr.length,
          },
        ]);
      }
      return originalPostMessage(message, targetOrigin, transfer);
    };

    // Listen for incoming messages
    const handleMessage = (event: MessageEvent) => {
      if (isPaused) return;

      // Skip react-devtools and other internal messages
      if (event.data?.source?.includes?.('react-devtools')) return;
      if (typeof event.data === 'string' && event.data.startsWith('webpackHot')) return;

      const msgStr = JSON.stringify(event.data);
      setMessages((prev) => [
        ...prev.slice(-499),
        {
          id: messageIdRef.current++,
          timestamp: Date.now(),
          direction: 'incoming',
          type: event.data?.type || 'unknown',
          source: event.origin || 'unknown',
          data: event.data,
          size: msgStr.length,
        },
      ]);
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.postMessage = originalPostMessage;
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, isPaused]);

  // Auto-scroll
  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    autoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  }, []);

  const filteredMessages = filter
    ? messages.filter(
        (m) =>
          m.type.toLowerCase().includes(filter.toLowerCase()) ||
          JSON.stringify(m.data).toLowerCase().includes(filter.toLowerCase())
      )
    : messages;

  const clearMessages = () => {
    setMessages([]);
    setSelectedMessage(null);
  };

  const exportMessages = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `messages-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!import.meta.env.DEV || !isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 300,
        background: 'rgba(15, 15, 25, 0.98)',
        borderTop: '1px solid rgba(139, 92, 246, 0.3)',
        zIndex: 99996,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>📨</span>
          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Message Logger</span>
          <span style={{ color: '#64748b', fontSize: 10 }}>({messages.length})</span>
        </div>

        {/* Filter */}
        <input
          type="text"
          placeholder="Filter messages..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '4px 8px',
            background: 'rgba(30, 30, 50, 0.5)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: 4,
            color: '#e2e8f0',
            fontSize: 11,
            width: 180,
            outline: 'none',
          }}
        />

        {/* Controls */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{
              padding: '4px 8px',
              background: isPaused ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
              border: `1px solid ${isPaused ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
              borderRadius: 4,
              color: isPaused ? '#ef4444' : '#22c55e',
              cursor: 'pointer',
              fontSize: 10,
            }}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            onClick={clearMessages}
            style={{
              padding: '4px 8px',
              background: 'rgba(100, 116, 139, 0.2)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: 4,
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 10,
            }}
          >
            🗑 Clear
          </button>
          <button
            onClick={exportMessages}
            style={{
              padding: '4px 8px',
              background: 'rgba(100, 116, 139, 0.2)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: 4,
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 10,
            }}
          >
            📥 Export
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Message list */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflow: 'auto',
            borderRight: selectedMessage ? '1px solid rgba(139, 92, 246, 0.2)' : 'none',
          }}
        >
          {filteredMessages.length === 0 ? (
            <div
              style={{
                padding: 20,
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              No messages yet. Interact with widgets to see postMessage traffic.
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                style={{
                  padding: '6px 12px',
                  borderBottom: '1px solid rgba(30, 30, 50, 0.5)',
                  cursor: 'pointer',
                  background:
                    selectedMessage?.id === msg.id
                      ? 'rgba(139, 92, 246, 0.1)'
                      : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {/* Direction indicator */}
                <span
                  style={{
                    color: msg.direction === 'incoming' ? '#22c55e' : '#3b82f6',
                    fontSize: 10,
                  }}
                >
                  {msg.direction === 'incoming' ? '⬇' : '⬆'}
                </span>

                {/* Timestamp */}
                <span style={{ color: '#64748b', fontSize: 10, width: 70 }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>

                {/* Type */}
                <span
                  style={{
                    color: getTypeColor(msg.type),
                    fontWeight: 500,
                    minWidth: 120,
                  }}
                >
                  {msg.type}
                </span>

                {/* Preview */}
                <span
                  style={{
                    color: '#94a3b8',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {JSON.stringify(msg.data).slice(0, 100)}
                </span>

                {/* Size */}
                <span style={{ color: '#64748b', fontSize: 10 }}>
                  {msg.size > 1024 ? `${(msg.size / 1024).toFixed(1)}KB` : `${msg.size}B`}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selectedMessage && (
          <div
            style={{
              width: 350,
              overflow: 'auto',
              padding: 12,
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>TYPE</div>
              <div style={{ color: getTypeColor(selectedMessage.type) }}>
                {selectedMessage.type}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>DIRECTION</div>
              <div
                style={{
                  color: selectedMessage.direction === 'incoming' ? '#22c55e' : '#3b82f6',
                }}
              >
                {selectedMessage.direction}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>SOURCE</div>
              <div style={{ color: '#e2e8f0' }}>{selectedMessage.source}</div>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>DATA</div>
              <pre
                style={{
                  margin: 0,
                  padding: 8,
                  background: 'rgba(30, 30, 50, 0.5)',
                  borderRadius: 4,
                  color: '#e2e8f0',
                  fontSize: 10,
                  overflow: 'auto',
                  maxHeight: 150,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {JSON.stringify(selectedMessage.data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageLogger;
