/**
 * StickerNest v2 - SharedWorker Runtime
 *
 * Persistent hub for multi-tab communication.
 * This worker lives as long as at least one tab is connected.
 *
 * Responsibilities:
 * - Track connected tabs
 * - Route messages between tabs
 * - Maintain shared state
 * - Queue messages for disconnected tabs
 * - Clean up stale tabs
 *
 * Version: 1.0.0
 */

// Track all connected ports
const ports = new Map(); // tabId -> { port, tabInfo, lastSeen }

// Shared state (simple key-value store)
const sharedState = new Map();

// Message queue for offline tabs (limited retention)
const messageQueue = new Map(); // tabId -> { messages: [], timestamp: number }
const MAX_QUEUE_SIZE = 100;
const MAX_QUEUE_AGE = 60000; // 1 minute

// Heartbeat tracking
const HEARTBEAT_TIMEOUT = 15000; // 15 seconds without heartbeat = dead
let cleanupInterval = null;

/**
 * Handle new connection
 */
self.onconnect = function(event) {
    const port = event.ports[0];

    port.onmessage = function(e) {
        handleMessage(port, e.data);
    };

    port.onmessageerror = function(e) {
        console.error('[SharedWorker] Message error:', e);
    };

    port.start();
};

/**
 * Handle incoming message from a tab
 */
function handleMessage(port, data) {
    switch (data.type) {
        case 'register':
            handleRegister(port, data.tabInfo);
            break;

        case 'unregister':
            handleUnregister(data.tabId);
            break;

        case 'broadcast':
            handleBroadcast(data.message);
            break;

        case 'send-to-tab':
            handleSendToTab(data.targetTabId, data.message);
            break;

        case 'get-tabs':
            handleGetTabs(port);
            break;

        case 'heartbeat':
            handleHeartbeat(data.tabId);
            break;

        case 'get-state':
            handleGetState(port, data.key);
            break;

        case 'set-state':
            handleSetState(data.key, data.value);
            break;

        case 'queue-message':
            handleQueueMessage(data.targetTabId, data.message);
            break;

        default:
            console.warn('[SharedWorker] Unknown message type:', data.type);
    }
}

/**
 * Register a new tab
 */
function handleRegister(port, tabInfo) {
    const tabId = tabInfo.tabId;

    // Check if this tab was previously connected (reconnection)
    const existingConnection = ports.get(tabId);
    if (existingConnection) {
        // Update the port reference
        existingConnection.port = port;
        existingConnection.tabInfo = tabInfo;
        existingConnection.lastSeen = Date.now();
    } else {
        // New tab connection
        ports.set(tabId, {
            port,
            tabInfo,
            lastSeen: Date.now()
        });

        // Notify other tabs about the new tab
        broadcastToOthers(tabId, {
            type: 'tab-joined',
            tabInfo
        });
    }

    // Get list of existing tabs for the new connection
    const existingTabs = [];
    ports.forEach((connection, id) => {
        if (id !== tabId) {
            existingTabs.push(connection.tabInfo);
        }
    });

    // Send registration confirmation with existing tabs
    port.postMessage({
        type: 'registered',
        tabId,
        existingTabs
    });

    // Check if there are queued messages for this tab
    const queued = messageQueue.get(tabId);
    if (queued && queued.messages.length > 0) {
        port.postMessage({
            type: 'queued-messages',
            messages: queued.messages
        });
        messageQueue.delete(tabId);
    }

    // Start cleanup interval if not already running
    if (!cleanupInterval) {
        cleanupInterval = setInterval(cleanupStaleTabs, 10000);
    }

    console.log(`[SharedWorker] Tab registered: ${tabId}. Total tabs: ${ports.size}`);
}

/**
 * Unregister a tab
 */
function handleUnregister(tabId) {
    const connection = ports.get(tabId);
    if (connection) {
        ports.delete(tabId);

        // Notify other tabs
        broadcastToOthers(tabId, {
            type: 'tab-left',
            tabId
        });

        console.log(`[SharedWorker] Tab unregistered: ${tabId}. Total tabs: ${ports.size}`);
    }

    // Stop cleanup interval if no tabs are connected
    if (ports.size === 0 && cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}

/**
 * Broadcast a message to all other tabs
 */
function handleBroadcast(message) {
    const sourceTabId = message.identity?.tabId;

    ports.forEach((connection, tabId) => {
        // Don't send back to the source tab
        if (tabId !== sourceTabId) {
            try {
                connection.port.postMessage({
                    type: 'message',
                    message
                });
            } catch (error) {
                console.error(`[SharedWorker] Failed to send to tab ${tabId}:`, error);
                // Mark as potentially stale
                connection.lastSeen = 0;
            }
        }
    });
}

/**
 * Send a message to a specific tab
 */
function handleSendToTab(targetTabId, message) {
    const connection = ports.get(targetTabId);

    if (connection) {
        try {
            connection.port.postMessage({
                type: 'message',
                message
            });
        } catch (error) {
            console.error(`[SharedWorker] Failed to send to tab ${targetTabId}:`, error);
            // Queue the message for later
            handleQueueMessage(targetTabId, message);
        }
    } else {
        // Tab not connected, queue the message
        handleQueueMessage(targetTabId, message);
    }
}

/**
 * Get list of all connected tabs
 */
function handleGetTabs(port) {
    const tabs = [];
    ports.forEach(connection => {
        tabs.push(connection.tabInfo);
    });

    port.postMessage({
        type: 'tabs-list',
        tabs
    });
}

/**
 * Handle heartbeat from a tab
 */
function handleHeartbeat(tabId) {
    const connection = ports.get(tabId);
    if (connection) {
        connection.lastSeen = Date.now();
    }
}

/**
 * Get shared state
 */
function handleGetState(port, key) {
    const value = sharedState.get(key);
    port.postMessage({
        type: 'state-value',
        key,
        value
    });
}

/**
 * Set shared state
 */
function handleSetState(key, value) {
    sharedState.set(key, value);

    // Optionally broadcast state changes to all tabs
    // (uncomment if needed)
    // broadcastToAll({
    //     type: 'state-changed',
    //     key,
    //     value
    // });
}

/**
 * Queue a message for a disconnected tab
 */
function handleQueueMessage(targetTabId, message) {
    let queue = messageQueue.get(targetTabId);

    if (!queue) {
        queue = { messages: [], timestamp: Date.now() };
        messageQueue.set(targetTabId, queue);
    }

    queue.messages.push(message);
    queue.timestamp = Date.now();

    // Limit queue size
    if (queue.messages.length > MAX_QUEUE_SIZE) {
        queue.messages = queue.messages.slice(-MAX_QUEUE_SIZE);
    }
}

/**
 * Broadcast to all tabs except the source
 */
function broadcastToOthers(sourceTabId, message) {
    ports.forEach((connection, tabId) => {
        if (tabId !== sourceTabId) {
            try {
                connection.port.postMessage(message);
            } catch (error) {
                console.error(`[SharedWorker] Failed to broadcast to tab ${tabId}:`, error);
            }
        }
    });
}

/**
 * Broadcast to all tabs
 */
function broadcastToAll(message) {
    ports.forEach((connection, tabId) => {
        try {
            connection.port.postMessage(message);
        } catch (error) {
            console.error(`[SharedWorker] Failed to broadcast to tab ${tabId}:`, error);
        }
    });
}

/**
 * Clean up stale tabs (no heartbeat for too long)
 */
function cleanupStaleTabs() {
    const now = Date.now();
    const staleTabs = [];

    ports.forEach((connection, tabId) => {
        if (now - connection.lastSeen > HEARTBEAT_TIMEOUT) {
            staleTabs.push(tabId);
        }
    });

    staleTabs.forEach(tabId => {
        console.log(`[SharedWorker] Cleaning up stale tab: ${tabId}`);
        handleUnregister(tabId);
    });

    // Clean up old message queues
    messageQueue.forEach((queue, tabId) => {
        if (now - queue.timestamp > MAX_QUEUE_AGE) {
            messageQueue.delete(tabId);
        }
    });
}

console.log('[SharedWorker] StickerNest runtime worker started');
