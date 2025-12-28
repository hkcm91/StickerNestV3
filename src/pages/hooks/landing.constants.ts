/**
 * Landing Page Constants
 * Demo canvases, users, and configuration constants
 */

import type { DemoCanvas, DemoUser } from './landing.types';

export const LANDING_CANVAS_ID = 'user-a-canvas-1';
export const SECONDARY_CANVAS_ID = 'user-a-canvas-2';
export const USER_B_CANVAS_ID = 'user-b-canvas-1';
export const MAX_FOUNDING_SPOTS = 500;
export const CROSS_CANVAS_PORT = 'landing.cross-bus';

export const DEMO_CANVASES: readonly DemoCanvas[] = [
  {
    id: LANDING_CANVAS_ID,
    title: 'User A - Canvas 1',
    subtitle: 'User A | 1920x1080',
    userId: 'user-a',
    slug: 'alice-main',
    accentColor: '#8b5cf6',
    background: undefined,
    size: { width: 1920, height: 1080 },
  },
  {
    id: SECONDARY_CANVAS_ID,
    title: 'User A - Canvas 2',
    subtitle: 'User A | 1600x900',
    userId: 'user-a',
    slug: 'alice-secondary',
    accentColor: '#a78bfa',
    background: 'linear-gradient(135deg, rgba(30,20,50,0.9) 0%, rgba(40,25,60,0.92) 60%, rgba(20,15,40,0.95) 100%)',
    size: { width: 1600, height: 900 },
  },
  {
    id: USER_B_CANVAS_ID,
    title: 'User B - Canvas 1',
    subtitle: 'User B | 1600x900',
    userId: 'user-b',
    slug: 'bob-canvas',
    accentColor: '#0ea5e9',
    background: 'linear-gradient(135deg, rgba(8,15,40,0.9) 0%, rgba(10,25,45,0.92) 60%, rgba(2,10,30,0.95) 100%)',
    size: { width: 1600, height: 900 },
  },
] as const;

export const DEMO_CANVAS_IDS = DEMO_CANVASES.map(canvas => canvas.id);

export const DEMO_USERS: Record<string, DemoUser> = {
  'user-a': {
    userId: 'user-a',
    username: 'Alice',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice&backgroundColor=b6e3f4',
    status: 'online',
  },
  'user-b': {
    userId: 'user-b',
    username: 'Bob',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob&backgroundColor=ffd5dc',
    status: 'online',
  },
  'user-c': {
    userId: 'user-c',
    username: 'Charlie',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie&backgroundColor=d1d4f9',
    status: 'idle',
  },
};

// Waitlist utility functions
export function getWaitlistCount(): number {
  try {
    const entries = localStorage.getItem('sn_waitlist');
    return entries ? JSON.parse(entries).length : 0;
  } catch { return 0; }
}

export function addToWaitlist(email: string): { success: boolean; error?: string } {
  try {
    const entries = JSON.parse(localStorage.getItem('sn_waitlist') || '[]');
    if (entries.some((e: { email: string }) => e.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: "You're already on the list!" };
    }
    entries.push({ email, timestamp: new Date().toISOString() });
    localStorage.setItem('sn_waitlist', JSON.stringify(entries));
    return { success: true };
  } catch { return { success: false, error: 'Something went wrong. Please try again.' }; }
}
