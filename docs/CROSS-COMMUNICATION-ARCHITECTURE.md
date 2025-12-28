# StickerNest v2 - Cross-Canvas & Cross-User Communication Architecture

## Overview

This document describes the architecture for widget communication across canvases and between users.

## Communication Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        User A's Browser                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│    Canvas 1     │    Canvas 2     │         Canvas 3            │
│   (Tab 1)       │   (Tab 2)       │         (Tab 1)             │
│                 │                 │                              │
│  ┌──────────┐   │  ┌──────────┐   │      ┌──────────┐           │
│  │ Widget A │   │  │ Widget C │   │      │ Widget E │           │
│  └────┬─────┘   │  └────┬─────┘   │      └────┬─────┘           │
│       │         │       │         │           │                  │
│  ┌────▼─────┐   │  ┌────▼─────┐   │      ┌────▼─────┐           │
│  │ EventBus │   │  │ EventBus │   │      │ EventBus │           │
│  └────┬─────┘   │  └────┬─────┘   │      └────┬─────┘           │
│       │         │       │         │           │                  │
├───────┴─────────┴───────┴─────────┴───────────┴──────────────────┤
│                     CanvasRouter (New)                            │
│              Cross-Canvas Event Routing Layer                     │
├──────────────────────────────────────────────────────────────────┤
│                   BroadcastChannelTransport                       │
│                  (Same Device Communication)                      │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     StickerNest Server                           │
│                  (Multi-User Communication)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐  ┌──────────────────┐    │
│  │ Auth Layer  │  │ Permission Mgr  │  │ Message Relay    │    │
│  └─────────────┘  └─────────────────┘  └──────────────────┘    │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       User B's Browser                           │
│              (With permission from User A)                       │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Cross-Canvas Communication (Same User)

### 1.1 Event Scoping

Events can have the following scopes:

```typescript
type EventScope =
  | 'widget'      // Single widget only
  | 'canvas'      // All widgets on current canvas
  | 'user'        // All canvases for current user (NEW)
  | 'connection'  // Specific cross-user connection (NEW)
  | 'global';     // Broadcast to all (with permissions)
```

### 1.2 CanvasRouter (New Component)

```typescript
// src/runtime/CanvasRouter.ts

interface CanvasRoute {
  sourceCanvasId: string;
  sourceWidgetId: string;
  sourcePort: string;
  targetCanvasId: string;
  targetWidgetId: string;
  targetPort: string;
  enabled: boolean;
  bidirectional: boolean;
}

interface CrossCanvasMessage {
  type: 'canvas:event';
  sourceCanvasId: string;
  targetCanvasId: string;
  event: Event;
  route?: CanvasRoute;
}

class CanvasRouter {
  private routes: Map<string, CanvasRoute[]>;
  private broadcastTransport: BroadcastChannelTransport;
  private localEventBus: EventBus;

  // Route events between canvases
  routeEvent(event: Event): void;

  // Register a cross-canvas route
  addRoute(route: CanvasRoute): void;

  // Subscribe to events from another canvas
  subscribeToCanvas(canvasId: string, eventTypes: string[]): void;

  // Handle incoming cross-canvas messages
  handleIncomingMessage(message: CrossCanvasMessage): void;
}
```

### 1.3 Cross-Canvas Pipeline Connections

```typescript
// Extended PipelineConnection for cross-canvas
interface CrossCanvasPipelineConnection extends PipelineConnection {
  crossCanvas?: {
    sourceCanvasId: string;
    targetCanvasId: string;
  };
}
```

## 2. Cross-User Communication

### 2.1 Permission Model

```typescript
// src/types/permissions.ts

interface UserConnectionRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  targetUserId: string;
  requestedPermissions: ConnectionPermission[];
  canvasId?: string;      // Specific canvas or all
  widgetIds?: string[];   // Specific widgets or all
  expiresAt?: number;     // Optional expiration
  message?: string;       // Optional message to recipient
  status: 'pending' | 'approved' | 'denied' | 'expired';
  createdAt: number;
}

interface ConnectionPermission {
  type: 'read' | 'write' | 'execute' | 'full';
  scope: 'widget' | 'canvas' | 'user';
  targetId?: string;  // Specific widget/canvas or undefined for all
}

interface TrustedConnection {
  id: string;
  userId: string;
  userName: string;
  permissions: ConnectionPermission[];
  canvasId?: string;
  widgetIds?: string[];
  createdAt: number;
  expiresAt?: number;
  lastActivity: number;
}
```

### 2.2 Permission Manager

```typescript
// src/services/PermissionManager.ts

class PermissionManager {
  // Outgoing requests
  requestConnection(targetUserId: string, permissions: ConnectionPermission[]): Promise<string>;
  cancelRequest(requestId: string): Promise<void>;

  // Incoming requests
  getPendingRequests(): Promise<UserConnectionRequest[]>;
  approveRequest(requestId: string, grantedPermissions: ConnectionPermission[]): Promise<void>;
  denyRequest(requestId: string, reason?: string): Promise<void>;

  // Active connections
  getTrustedConnections(): Promise<TrustedConnection[]>;
  revokeConnection(connectionId: string): Promise<void>;
  updatePermissions(connectionId: string, permissions: ConnectionPermission[]): Promise<void>;

  // Permission checks
  canSendTo(userId: string, scope: string, targetId?: string): boolean;
  canReceiveFrom(userId: string, scope: string, targetId?: string): boolean;

  // Events
  onConnectionRequest(handler: (request: UserConnectionRequest) => void): UnsubscribeFn;
  onConnectionApproved(handler: (connection: TrustedConnection) => void): UnsubscribeFn;
  onConnectionRevoked(handler: (connectionId: string) => void): UnsubscribeFn;
}
```

### 2.3 Cross-User Message Protocol

```typescript
// Extended RuntimeMessage for cross-user
interface CrossUserMessage extends RuntimeMessage {
  crossUser: {
    sourceUserId: string;
    targetUserId: string;
    connectionId: string;  // Must have valid trusted connection
    permissions: ConnectionPermission[];
  };
}
```

## 3. Implementation Phases

### Phase 1: Cross-Canvas Foundation (Same User)
1. Implement CanvasRouter
2. Extend EventBus with 'user' scope
3. Add BroadcastChannel routing for cross-canvas
4. Create cross-canvas pipeline connections UI

### Phase 2: Permission System
1. Implement PermissionManager
2. Create permission request UI (modal/notification)
3. Add trusted connections management UI
4. Server-side permission validation

### Phase 3: Cross-User Communication
1. Extend WebSocketTransport for user-to-user messaging
2. Add server-side message relay with permission checks
3. Implement cross-user event routing
4. Add presence/collaboration UI

### Phase 4: Advanced Features
1. Connection groups (multiple users)
2. Temporary connections (one-time share)
3. Connection templates (preset permission sets)
4. Analytics and activity tracking

## 4. Security Considerations

### 4.1 Message Validation
- All cross-user messages MUST include valid connectionId
- Server validates permissions before relaying
- Rate limiting per connection
- Message size limits

### 4.2 Permission Granularity
- Widget-level: Specific widget ports only
- Canvas-level: All widgets on a canvas
- User-level: All canvases for a user

### 4.3 Audit Trail
- Log all permission changes
- Log cross-user message metadata (not content)
- Anomaly detection for suspicious patterns

## 5. Database Schema Extensions

```sql
-- Permission requests
CREATE TABLE connection_requests (
  id UUID PRIMARY KEY,
  requester_id UUID REFERENCES users(id),
  target_user_id UUID REFERENCES users(id),
  permissions JSONB NOT NULL,
  canvas_id UUID REFERENCES canvases(id),
  widget_ids UUID[],
  message TEXT,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active trusted connections
CREATE TABLE trusted_connections (
  id UUID PRIMARY KEY,
  owner_user_id UUID REFERENCES users(id),
  trusted_user_id UUID REFERENCES users(id),
  permissions JSONB NOT NULL,
  canvas_id UUID REFERENCES canvases(id),
  widget_ids UUID[],
  expires_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_user_id, trusted_user_id, canvas_id)
);

-- Message audit log (metadata only)
CREATE TABLE message_audit (
  id UUID PRIMARY KEY,
  connection_id UUID REFERENCES trusted_connections(id),
  source_user_id UUID,
  target_user_id UUID,
  message_type TEXT,
  canvas_id UUID,
  widget_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

## 6. API Endpoints

```typescript
// Permission management
POST   /api/connections/request     // Create connection request
GET    /api/connections/requests    // List pending requests (incoming)
POST   /api/connections/:id/approve // Approve request
POST   /api/connections/:id/deny    // Deny request
DELETE /api/connections/:id         // Revoke connection

// Trusted connections
GET    /api/connections             // List active connections
PATCH  /api/connections/:id         // Update permissions

// Real-time via WebSocket
ws://  /api/ws/connect              // Establish WebSocket for messaging
```

## 7. UI Components Needed

1. **ConnectionRequestModal** - For incoming requests
2. **RequestConnectionDialog** - For sending requests
3. **TrustedConnectionsList** - Manage active connections
4. **CrossCanvasConnectionEditor** - Visual pipeline editor for cross-canvas
5. **PermissionBadge** - Show connection status on widgets
6. **CollaborationIndicator** - Show who's connected to your canvas
