# Widget Connections Guide

StickerNest v2 BETA introduces powerful widget-to-widget connections that let your widgets communicate across canvases and even with other users.

## Overview

Widget connections support three scopes:

| Scope | Icon | Description |
|-------|------|-------------|
| **Local** | 🏠 | Widgets on the same canvas |
| **Cross-Canvas** | 🔗 | Your widgets on different canvases |
| **Multi-User** | 👥 | Widgets owned by other users (social layer) |

---

## Quick Start

### 1. Using the Channel Selector

Widgets with connection support show a channel dropdown:

```
┌─────────────────────────────────┐
│ 🔌 Select Channel           ▼  │
└─────────────────────────────────┘
```

Click to see available connections grouped by scope:

- **Local** - Widgets on your current canvas
- **Cross-Canvas** - Your other canvases
- **Multi-User** - Connected users (requires Social Layer)

### 2. Connecting to Another Widget

1. Open the channel selector
2. Choose a scope (Local, Cross-Canvas, Multi-User)
3. Select the target widget or canvas
4. The connection status indicator will turn green when connected

### 3. Disconnecting

1. Open the channel selector
2. Click "Disconnect" at the top of the dropdown
3. The widget returns to standalone mode

---

## Connection Scopes

### Local Connections (🏠)

The simplest connection type. Widgets on the same canvas can communicate directly through the pipeline system.

**Use cases:**
- Button triggering a timer
- Data widget feeding a display
- Controller managing multiple widgets

**No special setup required** - local connections work automatically when widgets have compatible ports.

### Cross-Canvas Connections (🔗)

Connect widgets across your different canvases. Perfect for:
- Dashboards monitoring multiple workspaces
- Syncing data between projects
- Building multi-canvas applications

**How to connect:**

1. Click the "🔗 Connect Canvas" button
2. Select a canvas from the picker
3. Choose which widget ports to connect

**Requirements:**
- Both canvases must be open in browser tabs
- Same browser, same device
- Uses BroadcastChannel API (no server needed)

### Multi-User Connections (👥)

The social layer enables real-time communication with other users.

**Enable Social Layer:**

1. Open widget settings
2. Find "Social Layer" toggle
3. Enable and configure:
   - **Visibility**: Public, Friends, or Private
   - **Auto-accept trusted**: Skip permission prompts for trusted users

**Connection Flow:**

1. User A sends connection request
2. User B sees permission prompt
3. User B accepts/rejects (can also trust or block)
4. Connection established (or denied)

---

## Security & Privacy

### Trust Levels

| Level | Icon | Meaning |
|-------|------|---------|
| **Trusted** | ✓ | User you've marked as trusted |
| **Verified** | ✓ | Previously approved connection |
| **Unknown** | ? | First-time connection |
| **Blocked** | ✕ | User you've blocked |

### Security Badges

Look for the security badge on connections:

- 🔒 **Local** - Secure local connection
- 🔗 **Cross-Canvas** - Connected to your other canvas
- ✓ **Trusted/Verified** - Approved multi-user connection
- ? **Unknown** - Unverified connection (proceed with caution)
- 🚫 **Blocked** - Blocked user

### Rate Limiting

To prevent abuse, connections have message rate limits:

| Scope | Limit | Cooldown |
|-------|-------|----------|
| Local | 100/sec | None |
| Cross-Canvas | 30/sec | 5 seconds |
| Multi-User | 10/sec | 10 seconds |

If you see "Rate Limited", wait for the cooldown before sending more messages.

### Blocking Users

If you receive unwanted connection requests:

1. Click "Block this user" in the request modal
2. Or go to Settings → Privacy → Blocked Users
3. Blocked users cannot send you connection requests

---

## Widget Lab Testing

Test your widget connections before deploying:

### Connection Tester

1. Go to Widget Lab
2. Select a widget
3. Open the "Connections" tab

**Features:**

- **Port Visualization** - See all inputs/outputs with types
- **Test Event Sender** - Send test data to any input port
- **Event Log** - Monitor all incoming/outgoing events
- **Flow Diagram** - Visual representation of widget I/O

### Testing Workflow

1. **Check Ports** - Verify your widget declares correct inputs/outputs
2. **Send Test Events** - Use quick templates or custom JSON
3. **Verify Outputs** - Watch the event log for expected emissions
4. **Test Connections** - Connect to other test widgets

---

## For Widget Developers

### Declaring Connection Support

In your widget manifest:

```typescript
{
  // Define input ports
  inputs: {
    data: { type: 'object', description: 'Incoming data' },
    trigger: { type: 'trigger', description: 'Activation signal' },
  },

  // Define output ports
  outputs: {
    result: { type: 'object', description: 'Processed result' },
    clicked: { type: 'trigger', description: 'Click event' },
  },

  // I/O capability hints (for auto-discovery)
  io: {
    inputs: ['data.set', 'trigger.activate'],
    outputs: ['data.result', 'ui.clicked'],
  },
}
```

### Receiving Input

```javascript
const API = window.WidgetAPI;

// Listen for specific input
API.onInput('data.set', function(value) {
  console.log('Received:', value);
  processData(value);
});

// Listen for triggers
API.onInput('trigger.activate', function() {
  performAction();
});
```

### Emitting Output

```javascript
// Emit to connected widgets
API.emitOutput('data.result', {
  success: true,
  data: processedResult
});

// Emit trigger
API.emitOutput('ui.clicked', {});
```

### Port Type Compatibility

| Type | Compatible With |
|------|-----------------|
| `trigger` | trigger, any |
| `string` | string, any |
| `number` | number, any |
| `boolean` | boolean, any |
| `object` | object, any |
| `array` | array, any |
| `any` | All types |

---

## Walkie Talkie Widget

The built-in Walkie Talkie widget demonstrates multi-user connections:

1. Add from widget palette: "Walkie Talkie"
2. Select a channel (General, Team, Broadcast)
3. Type messages and click Send (or press Enter)
4. Messages appear in real-time for all connected users

**Features:**
- Real-time messaging
- Typing indicators
- Online status
- Trust level badges

---

## Troubleshooting

### Connection not working?

1. **Check browser console** for errors
2. **Verify port types** match between widgets
3. **Check permissions** for multi-user connections
4. **Ensure canvases are open** for cross-canvas

### Rate limited?

Wait for the cooldown period. Reduce message frequency in your widget.

### Permission denied?

The target user may have:
- Blocked you
- Set visibility to Friends/Private
- Rejected your request

### Cross-canvas not connecting?

- Ensure both tabs are in the same browser
- Check that BroadcastChannel API is supported
- Verify canvas IDs are correct

---

## API Reference

### useWidgetChannels Hook

```typescript
const {
  activeChannel,      // Currently selected channel
  channels,           // Available channels
  channelGroups,      // Channels grouped by scope
  config,             // Channel configuration
  isDiscovering,      // Discovery in progress
  switchChannel,      // Change active channel
  discoverChannels,   // Refresh available channels
  sendToChannel,      // Send message to active channel
  updateConfig,       // Update configuration
} = useWidgetChannels({
  widgetId,
  canvasId,
  userId,
  eventBus,
  manifest,
});
```

### ConnectionManager

```typescript
const manager = createConnectionManager(widgetId, canvasId, eventBus, userId);

// Connect to target
await manager.connect({
  scope: 'cross-canvas',
  targetId: 'other-canvas-id',
});

// Send message
manager.send(target, 'data.update', { value: 42 });

// Listen for messages
manager.onMessage(target, (message) => {
  console.log('Received:', message);
});

// Disconnect
manager.disconnect(target);
```

---

## Best Practices

1. **Declare clear port types** - Helps with auto-discovery
2. **Handle disconnections gracefully** - Check connection status before sending
3. **Respect rate limits** - Batch updates when possible
4. **Use trust wisely** - Only trust users you know
5. **Test in Widget Lab first** - Verify connections work before deploying
6. **Provide feedback** - Show connection status to users

---

## Coming Soon

- **Group Channels** - Connect multiple widgets at once
- **Persistent Connections** - Reconnect automatically
- **Connection History** - View past connections
- **Analytics** - Message stats and connection health

---

*Widget Connections is a BETA feature. Report issues at [GitHub Issues](https://github.com/hkcm91/StickerNestV2/issues)*
