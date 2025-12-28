/**
 * Landing Page Types
 * Shared types for landing page hooks and components
 */

export interface DemoCanvas {
  id: string;
  title: string;
  subtitle: string;
  userId: string;
  slug: string;
  accentColor: string;
  background?: string;
  size: { width: number; height: number };
}

export interface DemoUser {
  userId: string;
  username: string;
  avatarUrl: string;
  status: 'online' | 'idle' | 'offline';
}

export interface BroadcastStatus {
  message: string;
  from: string;
  accent: string;
  timestamp: number;
}

export interface WaitlistEntry {
  email: string;
  idea?: string;
  timestamp: string;
}
