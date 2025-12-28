/**
 * StickerNest v2 - Stream Events Store (Zustand)
 * Circular buffer for stream events from OBS, Twitch, YouTube
 * Provides event history, filtering, and replay capabilities
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ==================
// Types
// ==================

/** Base stream event */
export interface StreamEvent {
  id: string;
  timestamp: number;
  source: 'obs' | 'twitch' | 'youtube' | 'system';
  type: string;
  payload: Record<string, unknown>;
}

/** OBS-specific events */
export interface OBSEvent extends StreamEvent {
  source: 'obs';
  type:
    | 'obs:scene-changed'
    | 'obs:source-visibility'
    | 'obs:stream-started'
    | 'obs:stream-stopped'
    | 'obs:recording-started'
    | 'obs:recording-stopped'
    | 'obs:source-created'
    | 'obs:source-removed'
    | 'obs:filter-enabled'
    | 'obs:filter-disabled';
}

/** Twitch-specific events */
export interface TwitchEvent extends StreamEvent {
  source: 'twitch';
  type:
    | 'twitch:follow'
    | 'twitch:subscribe'
    | 'twitch:gift-sub'
    | 'twitch:bits'
    | 'twitch:raid'
    | 'twitch:reward-redeem'
    | 'twitch:chat-message'
    | 'twitch:stream-online'
    | 'twitch:stream-offline'
    | 'twitch:hype-train-begin'
    | 'twitch:hype-train-end';
}

/** YouTube-specific events */
export interface YouTubeEvent extends StreamEvent {
  source: 'youtube';
  type:
    | 'youtube:chat-message'
    | 'youtube:super-chat'
    | 'youtube:super-sticker'
    | 'youtube:member-join'
    | 'youtube:member-gift'
    | 'youtube:stream-online'
    | 'youtube:stream-offline';
}

/** Normalized stream event (platform-agnostic) */
export interface NormalizedStreamEvent extends StreamEvent {
  source: 'system';
  type:
    | 'stream:follow'
    | 'stream:subscribe'
    | 'stream:gift'
    | 'stream:donation'
    | 'stream:raid'
    | 'stream:reward'
    | 'stream:chat'
    | 'stream:online'
    | 'stream:offline';
  originalSource: 'twitch' | 'youtube';
  originalType: string;
}

/** All stream event types */
export type AnyStreamEvent = OBSEvent | TwitchEvent | YouTubeEvent | NormalizedStreamEvent;

/** Event filter options */
export interface EventFilter {
  sources?: Array<'obs' | 'twitch' | 'youtube' | 'system'>;
  types?: string[];
  since?: number;
  until?: number;
  limit?: number;
}

// ==================
// Store State
// ==================

export interface StreamEventsState {
  /** Circular event buffer */
  events: AnyStreamEvent[];
  /** Maximum buffer size */
  maxEvents: number;
  /** Event counts by type */
  eventCounts: Map<string, number>;
  /** Session start timestamp */
  sessionStart: number;
  /** Whether event collection is paused */
  isPaused: boolean;
}

// ==================
// Store Actions
// ==================

export interface StreamEventsActions {
  /** Add a new event to the buffer */
  addEvent: (event: Omit<AnyStreamEvent, 'id' | 'timestamp'>) => void;
  /** Add multiple events at once */
  addEvents: (events: Array<Omit<AnyStreamEvent, 'id' | 'timestamp'>>) => void;
  /** Get filtered events */
  getEvents: (filter?: EventFilter) => AnyStreamEvent[];
  /** Get events by type */
  getEventsByType: (type: string) => AnyStreamEvent[];
  /** Get events by source */
  getEventsBySource: (source: AnyStreamEvent['source']) => AnyStreamEvent[];
  /** Get recent events (last N) */
  getRecentEvents: (count: number) => AnyStreamEvent[];
  /** Clear all events */
  clearEvents: () => void;
  /** Set max buffer size */
  setMaxEvents: (max: number) => void;
  /** Pause/resume event collection */
  setPaused: (paused: boolean) => void;
  /** Start a new session (reset counts) */
  startNewSession: () => void;
  /** Replay events (for testing) */
  replayEvents: (events: AnyStreamEvent[], delayMs?: number) => Promise<void>;
}

// ==================
// Initial State
// ==================

const initialState: StreamEventsState = {
  events: [],
  maxEvents: 1000,
  eventCounts: new Map(),
  sessionStart: Date.now(),
  isPaused: false,
};

// ==================
// Helpers
// ==================

function generateEventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// ==================
// Store Creation
// ==================

export const useStreamEventsStore = create<StreamEventsState & StreamEventsActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      addEvent: (eventData) => {
        const state = get();
        if (state.isPaused) return;

        const event: AnyStreamEvent = {
          ...eventData,
          id: generateEventId(),
          timestamp: Date.now(),
        } as AnyStreamEvent;

        set(
          (state) => {
            // Add to buffer
            const newEvents = [...state.events, event];

            // Trim if exceeds max (circular buffer)
            if (newEvents.length > state.maxEvents) {
              newEvents.splice(0, newEvents.length - state.maxEvents);
            }

            // Update event counts
            const newCounts = new Map(state.eventCounts);
            const currentCount = newCounts.get(event.type) || 0;
            newCounts.set(event.type, currentCount + 1);

            return {
              events: newEvents,
              eventCounts: newCounts,
            };
          },
          false,
          'addEvent'
        );
      },

      addEvents: (eventsData) => {
        const state = get();
        if (state.isPaused) return;

        const timestamp = Date.now();
        const newEvents: AnyStreamEvent[] = eventsData.map((eventData, index) => ({
          ...eventData,
          id: generateEventId(),
          timestamp: timestamp + index, // Ensure unique timestamps
        })) as AnyStreamEvent[];

        set(
          (state) => {
            let allEvents = [...state.events, ...newEvents];

            // Trim if exceeds max
            if (allEvents.length > state.maxEvents) {
              allEvents = allEvents.slice(-state.maxEvents);
            }

            // Update event counts
            const newCounts = new Map(state.eventCounts);
            for (const event of newEvents) {
              const currentCount = newCounts.get(event.type) || 0;
              newCounts.set(event.type, currentCount + 1);
            }

            return {
              events: allEvents,
              eventCounts: newCounts,
            };
          },
          false,
          'addEvents'
        );
      },

      getEvents: (filter) => {
        const { events } = get();
        if (!filter) return events;

        let filtered = events;

        if (filter.sources?.length) {
          filtered = filtered.filter((e) => filter.sources!.includes(e.source));
        }

        if (filter.types?.length) {
          filtered = filtered.filter((e) => filter.types!.includes(e.type));
        }

        if (filter.since) {
          filtered = filtered.filter((e) => e.timestamp >= filter.since!);
        }

        if (filter.until) {
          filtered = filtered.filter((e) => e.timestamp <= filter.until!);
        }

        if (filter.limit) {
          filtered = filtered.slice(-filter.limit);
        }

        return filtered;
      },

      getEventsByType: (type) => {
        return get().events.filter((e) => e.type === type);
      },

      getEventsBySource: (source) => {
        return get().events.filter((e) => e.source === source);
      },

      getRecentEvents: (count) => {
        const { events } = get();
        return events.slice(-count);
      },

      clearEvents: () => {
        set(
          {
            events: [],
            eventCounts: new Map(),
          },
          false,
          'clearEvents'
        );
      },

      setMaxEvents: (maxEvents) => {
        set(
          (state) => {
            // Trim existing events if needed
            const events =
              state.events.length > maxEvents
                ? state.events.slice(-maxEvents)
                : state.events;
            return { maxEvents, events };
          },
          false,
          'setMaxEvents'
        );
      },

      setPaused: (isPaused) => {
        set({ isPaused }, false, 'setPaused');
      },

      startNewSession: () => {
        set(
          {
            events: [],
            eventCounts: new Map(),
            sessionStart: Date.now(),
          },
          false,
          'startNewSession'
        );
      },

      replayEvents: async (events, delayMs = 100) => {
        const { addEvent } = get();
        for (const event of events) {
          addEvent(event);
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      },
    }),
    {
      name: 'StreamEventsStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ==================
// Selector Hooks
// ==================

/** Get all events */
export const useAllStreamEvents = () => useStreamEventsStore((state) => state.events);

/** Get event count */
export const useStreamEventCount = () => useStreamEventsStore((state) => state.events.length);

/** Get event counts by type */
export const useEventCounts = () => useStreamEventsStore((state) => state.eventCounts);

/** Get count for specific event type */
export const useEventTypeCount = (type: string) =>
  useStreamEventsStore((state) => state.eventCounts.get(type) || 0);

/** Check if collection is paused */
export const useIsEventsPaused = () => useStreamEventsStore((state) => state.isPaused);

/** Get session duration in seconds */
export const useSessionDuration = () =>
  useStreamEventsStore((state) => Math.floor((Date.now() - state.sessionStart) / 1000));

/** Get last N events */
export const useRecentStreamEvents = (count: number) =>
  useStreamEventsStore((state) => state.events.slice(-count));

/** Get events from a specific source */
export const useSourceEvents = (source: AnyStreamEvent['source']) =>
  useStreamEventsStore((state) => state.events.filter((e) => e.source === source));

// ==================
// Event Normalization Helpers
// ==================

/**
 * Normalize a Twitch event to a platform-agnostic format
 */
export function normalizeTwitchEvent(event: TwitchEvent): NormalizedStreamEvent | null {
  const baseEvent = {
    id: generateEventId(),
    timestamp: event.timestamp,
    source: 'system' as const,
    originalSource: 'twitch' as const,
    originalType: event.type,
    payload: event.payload,
  };

  switch (event.type) {
    case 'twitch:follow':
      return { ...baseEvent, type: 'stream:follow' };
    case 'twitch:subscribe':
      return { ...baseEvent, type: 'stream:subscribe' };
    case 'twitch:gift-sub':
      return { ...baseEvent, type: 'stream:gift' };
    case 'twitch:bits':
      return { ...baseEvent, type: 'stream:donation' };
    case 'twitch:raid':
      return { ...baseEvent, type: 'stream:raid' };
    case 'twitch:reward-redeem':
      return { ...baseEvent, type: 'stream:reward' };
    case 'twitch:chat-message':
      return { ...baseEvent, type: 'stream:chat' };
    case 'twitch:stream-online':
      return { ...baseEvent, type: 'stream:online' };
    case 'twitch:stream-offline':
      return { ...baseEvent, type: 'stream:offline' };
    default:
      return null;
  }
}

/**
 * Normalize a YouTube event to a platform-agnostic format
 */
export function normalizeYouTubeEvent(event: YouTubeEvent): NormalizedStreamEvent | null {
  const baseEvent = {
    id: generateEventId(),
    timestamp: event.timestamp,
    source: 'system' as const,
    originalSource: 'youtube' as const,
    originalType: event.type,
    payload: event.payload,
  };

  switch (event.type) {
    case 'youtube:super-chat':
    case 'youtube:super-sticker':
      return { ...baseEvent, type: 'stream:donation' };
    case 'youtube:member-join':
      return { ...baseEvent, type: 'stream:subscribe' };
    case 'youtube:member-gift':
      return { ...baseEvent, type: 'stream:gift' };
    case 'youtube:chat-message':
      return { ...baseEvent, type: 'stream:chat' };
    case 'youtube:stream-online':
      return { ...baseEvent, type: 'stream:online' };
    case 'youtube:stream-offline':
      return { ...baseEvent, type: 'stream:offline' };
    default:
      return null;
  }
}
