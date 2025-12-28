/**
 * StickerNest v2 - AI Widget Generator V2.0 Generation Session
 * Manages generation sessions with progress tracking
 */

import type {
  GenerationSession,
  GenerationRequest,
  GenerationStep,
  ProgressUpdate,
  ConversationMessage,
} from './types';
import type { DraftWidget } from '../../ai/DraftManager';

// ============================================
// Session Manager Class
// ============================================

export class SessionManager {
  private sessions: Map<string, GenerationSession> = new Map();
  private listeners: Map<string, Set<(update: ProgressUpdate) => void>> = new Map();

  /**
   * Create a new generation session
   */
  createSession(request: GenerationRequest): GenerationSession {
    const id = this.generateSessionId();
    const now = Date.now();

    const session: GenerationSession = {
      id,
      request,
      status: 'active',
      progress: [],
      widgets: [],
      conversation: request.mode === 'iterate' ? [] : undefined,
      createdAt: now,
      lastActivity: now,
    };

    this.sessions.set(id, session);
    this.listeners.set(id, new Set());

    // Add initial progress
    this.updateProgress(id, 'preparing', 'Initializing generation...', 0);

    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(id: string): GenerationSession | null {
    return this.sessions.get(id) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): GenerationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  /**
   * Update session progress
   */
  updateProgress(
    sessionId: string,
    step: GenerationStep,
    message: string,
    progress: number
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const update: ProgressUpdate = {
      step,
      message,
      progress: Math.min(100, Math.max(0, progress)),
      timestamp: Date.now(),
    };

    session.progress.push(update);
    session.lastActivity = Date.now();

    // Update status based on step
    if (step === 'complete') {
      session.status = 'complete';
    } else if (step === 'failed') {
      session.status = 'failed';
    }

    // Notify listeners
    this.notifyListeners(sessionId, update);
  }

  /**
   * Add widget to session
   */
  addWidget(sessionId: string, widget: DraftWidget): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.widgets.push(widget);
    session.lastActivity = Date.now();
  }

  /**
   * Add conversation message (for iterate mode)
   */
  addMessage(sessionId: string, message: Omit<ConversationMessage, 'id' | 'timestamp'>): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.conversation) return;

    const fullMessage: ConversationMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: Date.now(),
    };

    session.conversation.push(fullMessage);
    session.lastActivity = Date.now();
  }

  /**
   * Cancel a session
   */
  cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return;

    session.status = 'cancelled';
    this.updateProgress(sessionId, 'failed', 'Generation cancelled', session.progress.length > 0
      ? session.progress[session.progress.length - 1].progress
      : 0
    );
  }

  /**
   * Mark session as complete
   */
  completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'complete';
    this.updateProgress(sessionId, 'complete', 'Generation complete!', 100);
  }

  /**
   * Mark session as failed
   */
  failSession(sessionId: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'failed';
    this.updateProgress(sessionId, 'failed', `Generation failed: ${error}`, -1);
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(sessionId: string, callback: (update: ProgressUpdate) => void): () => void {
    const listeners = this.listeners.get(sessionId);
    if (!listeners) {
      return () => {};
    }

    listeners.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * Get latest progress for a session
   */
  getLatestProgress(sessionId: string): ProgressUpdate | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.progress.length === 0) return null;

    return session.progress[session.progress.length - 1];
  }

  /**
   * Clean up old sessions (older than 1 hour)
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const [id, session] of this.sessions) {
      if (session.lastActivity < oneHourAgo && session.status !== 'active') {
        this.sessions.delete(id);
        this.listeners.delete(id);
      }
    }
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  // ============================================
  // Private Methods
  // ============================================

  private generateSessionId(): string {
    return `session-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  }

  private generateMessageId(): string {
    return `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
  }

  private notifyListeners(sessionId: string, update: ProgressUpdate): void {
    const listeners = this.listeners.get(sessionId);
    if (!listeners) return;

    for (const callback of listeners) {
      try {
        callback(update);
      } catch (e) {
        console.error('[SessionManager] Listener error:', e);
      }
    }
  }
}

// ============================================
// Progress Step Helpers
// ============================================

export const STEP_CONFIG: Record<GenerationStep, { label: string; progress: number }> = {
  preparing: { label: 'Preparing', progress: 5 },
  'building-prompt': { label: 'Building prompt', progress: 15 },
  'calling-ai': { label: 'Generating with AI', progress: 30 },
  'parsing-response': { label: 'Parsing response', progress: 70 },
  validating: { label: 'Validating widget', progress: 80 },
  'scoring-quality': { label: 'Analyzing quality', progress: 90 },
  'creating-draft': { label: 'Creating draft', progress: 95 },
  complete: { label: 'Complete', progress: 100 },
  failed: { label: 'Failed', progress: -1 },
};

/**
 * Get human-readable label for a step
 */
export function getStepLabel(step: GenerationStep): string {
  return STEP_CONFIG[step]?.label || step;
}

/**
 * Get expected progress for a step
 */
export function getStepProgress(step: GenerationStep): number {
  return STEP_CONFIG[step]?.progress || 0;
}

// ============================================
// Singleton Export
// ============================================

let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}

/**
 * Create a new session manager instance (for testing)
 */
export function createSessionManager(): SessionManager {
  return new SessionManager();
}
