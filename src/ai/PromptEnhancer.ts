/**
 * StickerNest v2 - Prompt Enhancer
 * Automatically injects event system knowledge into widget generation prompts
 * while preserving the user's original vision
 */

/** Known widget families and their event patterns */
export const WIDGET_FAMILIES: Record<string, {
  namespace: string;
  commonEvents: {
    emits: string[];
    listens: string[];
  };
  description: string;
}> = {
  vector: {
    namespace: 'vector',
    commonEvents: {
      emits: ['vector:selection-changed', 'vector:entity-added', 'vector:entity-updated', 'vector:entity-deleted'],
      listens: ['vector:spawn-shape', 'vector:set-fill', 'vector:set-stroke', 'vector:set-shadow', 'vector:transform']
    },
    description: 'vector graphics and shape manipulation'
  },
  farm: {
    namespace: 'farm',
    commonEvents: {
      emits: ['farm:harvest', 'farm:plot-status', 'farm:plant-seed', 'farm:water', 'farm:weather'],
      listens: ['farm:plant-seed', 'farm:water', 'farm:weather', 'farm:harvest']
    },
    description: 'farming simulation with crops, weather, and harvesting'
  },
  audio: {
    namespace: 'audio',
    commonEvents: {
      emits: ['audio:beat-detected', 'audio:frequency-data', 'audio:volume-changed', 'audio:track-changed'],
      listens: ['audio:play', 'audio:pause', 'audio:set-volume', 'audio:beat-detected']
    },
    description: 'audio processing, visualization, and music'
  },
  timer: {
    namespace: 'timer',
    commonEvents: {
      emits: ['timer:tick', 'timer:complete', 'timer:started', 'timer:paused'],
      listens: ['timer:start', 'timer:pause', 'timer:reset', 'timer:set-duration']
    },
    description: 'timers, countdowns, and scheduling'
  },
  data: {
    namespace: 'data',
    commonEvents: {
      emits: ['data:updated', 'data:loaded', 'data:error', 'data:selected'],
      listens: ['data:fetch', 'data:filter', 'data:sort', 'data:select']
    },
    description: 'data display, tables, charts, and visualization'
  },
  chat: {
    namespace: 'chat',
    commonEvents: {
      emits: ['chat:message-sent', 'chat:user-joined', 'chat:typing'],
      listens: ['chat:message-received', 'chat:user-list', 'chat:clear']
    },
    description: 'messaging and communication'
  },
  game: {
    namespace: 'game',
    commonEvents: {
      emits: ['game:score-changed', 'game:level-complete', 'game:game-over', 'game:action'],
      listens: ['game:start', 'game:pause', 'game:reset', 'game:input']
    },
    description: 'games and interactive entertainment'
  }
};

/** Keywords that suggest widget family membership */
const FAMILY_KEYWORDS: Record<string, string[]> = {
  vector: ['vector', 'shape', 'draw', 'canvas', 'svg', 'graphic', 'path', 'fill', 'stroke', 'color picker', 'layer', 'transform'],
  farm: ['farm', 'crop', 'plant', 'harvest', 'seed', 'water', 'weather', 'grow', 'garden', 'agriculture'],
  audio: ['audio', 'music', 'sound', 'beat', 'visualizer', 'frequency', 'volume', 'track', 'play', 'waveform', 'equalizer'],
  timer: ['timer', 'countdown', 'stopwatch', 'clock', 'schedule', 'alarm', 'duration', 'interval'],
  data: ['data', 'chart', 'graph', 'table', 'dashboard', 'analytics', 'stats', 'metrics', 'visualization'],
  chat: ['chat', 'message', 'conversation', 'room', 'messaging', 'communicate'],
  game: ['game', 'score', 'level', 'player', 'play', 'arcade', 'puzzle']
};

export interface EnhancedPrompt {
  /** The enhanced prompt with technical details */
  enhancedDescription: string;
  /** Detected widget family (if any) */
  detectedFamily: string | null;
  /** Suggested events based on family */
  suggestedEvents: {
    emits: string[];
    listens: string[];
  };
  /** Whether to use wildcard listening */
  useWildcard: boolean;
  /** Additional technical notes */
  technicalNotes: string[];
}

/**
 * Detect which widget family (if any) the prompt belongs to
 */
function detectFamily(prompt: string): string | null {
  const lowerPrompt = prompt.toLowerCase();

  // Check for explicit family mentions
  for (const [family, keywords] of Object.entries(FAMILY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        return family;
      }
    }
  }

  return null;
}

/**
 * Check if the prompt suggests this is a monitoring/logging widget
 */
function isMonitoringWidget(prompt: string): boolean {
  const monitoringKeywords = ['monitor', 'log', 'debug', 'watch', 'track', 'stats', 'activity', 'all events', 'dashboard'];
  const lowerPrompt = prompt.toLowerCase();
  return monitoringKeywords.some(k => lowerPrompt.includes(k));
}

/**
 * Check if the prompt suggests this widget should listen to a family
 */
function shouldUseWildcard(prompt: string, family: string | null): boolean {
  const lowerPrompt = prompt.toLowerCase();

  // Explicit wildcard mentions
  if (lowerPrompt.includes('all ') && lowerPrompt.includes('event')) return true;
  if (lowerPrompt.includes('wildcard')) return true;
  if (lowerPrompt.includes('monitor')) return true;
  if (lowerPrompt.includes('any ') && family) return true;

  // Stats/dashboard widgets often want all events
  if (isMonitoringWidget(prompt)) return true;

  return false;
}

/**
 * Extract specific event names mentioned in the prompt
 */
function extractMentionedEvents(prompt: string): { emits: string[], listens: string[] } {
  const emits: string[] = [];
  const listens: string[] = [];

  // Look for explicit event patterns like "emit farm:harvest" or "listen to vector:*"
  const emitPattern = /emit[s]?\s+([a-z]+:[a-z\-\*]+)/gi;
  const listenPattern = /listen[s]?\s+(?:to\s+)?([a-z]+:[a-z\-\*]+)/gi;

  let match;
  while ((match = emitPattern.exec(prompt)) !== null) {
    emits.push(match[1].toLowerCase());
  }
  while ((match = listenPattern.exec(prompt)) !== null) {
    listens.push(match[1].toLowerCase());
  }

  return { emits, listens };
}

/**
 * Enhance a user prompt with technical event system details
 * @param userPrompt - The user's widget description
 * @param forceFamily - Optional: force a specific widget family instead of auto-detecting
 */
export function enhancePrompt(userPrompt: string, forceFamily?: string): EnhancedPrompt {
  const family = forceFamily && WIDGET_FAMILIES[forceFamily] ? forceFamily : detectFamily(userPrompt);
  const useWildcard = shouldUseWildcard(userPrompt, family);
  const mentionedEvents = extractMentionedEvents(userPrompt);
  const technicalNotes: string[] = [];

  let suggestedEvents = { emits: [] as string[], listens: [] as string[] };

  // Add mentioned events first
  suggestedEvents.emits.push(...mentionedEvents.emits);
  suggestedEvents.listens.push(...mentionedEvents.listens);

  // Add family-based suggestions
  if (family && WIDGET_FAMILIES[family]) {
    const familyInfo = WIDGET_FAMILIES[family];

    // Add wildcard if appropriate
    if (useWildcard) {
      if (!suggestedEvents.listens.includes(`${family}:*`)) {
        suggestedEvents.listens.push(`${family}:*`);
      }
      technicalNotes.push(`Uses ${family}:* wildcard to receive all ${familyInfo.description} events`);
    }

    // Suggest common events if none explicitly mentioned
    if (suggestedEvents.emits.length === 0) {
      suggestedEvents.emits = familyInfo.commonEvents.emits.slice(0, 2);
    }
    if (suggestedEvents.listens.length === 0 && !useWildcard) {
      suggestedEvents.listens = familyInfo.commonEvents.listens.slice(0, 3);
    }
  }

  // Build enhanced description
  let enhancedDescription = userPrompt;

  // Add technical requirements
  const technicalAdditions: string[] = [];

  if (family) {
    technicalAdditions.push(`\n\n## Widget Family: ${family}`);
    technicalAdditions.push(`This widget belongs to the "${family}" family and should use namespaced events.`);
  }

  if (suggestedEvents.emits.length > 0 || suggestedEvents.listens.length > 0) {
    technicalAdditions.push(`\n## Event Configuration`);
    technicalAdditions.push(`Include this in the manifest:`);
    technicalAdditions.push('```json');
    technicalAdditions.push(`"events": {`);
    if (suggestedEvents.emits.length > 0) {
      technicalAdditions.push(`  "emits": ${JSON.stringify(suggestedEvents.emits)},`);
    }
    if (suggestedEvents.listens.length > 0) {
      technicalAdditions.push(`  "listens": ${JSON.stringify(suggestedEvents.listens)}`);
    }
    technicalAdditions.push(`}`);
    technicalAdditions.push('```');
  }

  if (useWildcard && family) {
    technicalAdditions.push(`\n## Wildcard Listening`);
    technicalAdditions.push(`This widget uses "${family}:*" to receive ALL events in the ${family} namespace.`);
    technicalAdditions.push(`Handle events dynamically in the switch statement or event handler.`);
  }

  // Event handling reminder
  technicalAdditions.push(`\n## Event Handling (REQUIRED)`);
  technicalAdditions.push(`The widget MUST handle incoming events like this:`);
  technicalAdditions.push('```javascript');
  technicalAdditions.push(`window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  // Handle EVENT messages (new protocol)
  if (data.type === 'EVENT' && data.payload) {
    handleEvent(data.payload.type, data.payload.payload);
  }
  // Handle widget:event messages (legacy)
  if (data.type === 'widget:event' && data.payload) {
    handleEvent(data.payload.type, data.payload.payload);
  }
});

function handleEvent(type, payload) {
  // Handle specific events
  switch(type) {
    case '${family || 'namespace'}:example-event':
      // Process the event
      break;
  }
}`);
  technicalAdditions.push('```');

  enhancedDescription += technicalAdditions.join('\n');

  return {
    enhancedDescription,
    detectedFamily: family,
    suggestedEvents,
    useWildcard,
    technicalNotes
  };
}

/**
 * Get widget family options for UI dropdowns
 */
export function getWidgetFamilyOptions(): { id: string; label: string; description: string }[] {
  return Object.entries(WIDGET_FAMILIES).map(([id, info]) => ({
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    description: info.description,
  }));
}

/**
 * Get a summary of all known widget families for AI context
 */
export function getWidgetFamiliesSummary(): string {
  const lines = ['## Known Widget Families\n'];

  for (const [name, info] of Object.entries(WIDGET_FAMILIES)) {
    lines.push(`### ${name}:* (${info.description})`);
    lines.push(`- Common emits: ${info.commonEvents.emits.slice(0, 3).join(', ')}`);
    lines.push(`- Common listens: ${info.commonEvents.listens.slice(0, 3).join(', ')}`);
    lines.push('');
  }

  return lines.join('\n');
}

export default {
  enhancePrompt,
  detectFamily,
  getWidgetFamiliesSummary,
  getWidgetFamilyOptions,
  WIDGET_FAMILIES
};
