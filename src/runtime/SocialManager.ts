import { EventBus } from './EventBus';
import { FeedService } from '../services/social/FeedService';
import { SocialGraphService } from '../services/social/SocialGraphService';

export class SocialManager {
    private eventBus: EventBus;
    private userId: string | null = null;
    private friends: Set<string> = new Set();

    constructor(eventBus: EventBus, userId: string | null) {
        this.eventBus = eventBus;
        this.userId = userId;

        this.setupListeners();
        if (userId) {
            this.loadFriends();
        }
    }

    private setupListeners() {
        // Listen for widget publishing
        this.eventBus.on('widget:published', async (event) => {
            if (!this.userId) return;

            try {
                await FeedService.postActivity({
                    verb: 'published',
                    object_type: 'widget',
                    object_id: event.payload.widgetId,
                    metadata: {
                        title: event.payload.name,
                        version: event.payload.version
                    }
                });
                console.log('[SocialManager] Published activity for widget', event.payload.widgetId);
            } catch (err) {
                console.error('[SocialManager] Failed to post activity:', err);
            }
        });

        // Listen for canvas saving (maybe only public ones?)
        this.eventBus.on('canvas:saved', async (event) => {
            if (!this.userId || !event.payload.isPublic) return;

            try {
                await FeedService.postActivity({
                    verb: 'published',
                    object_type: 'canvas',
                    object_id: event.payload.canvasId,
                    metadata: {
                        title: event.payload.title
                    }
                });
            } catch (err) {
                console.error('[SocialManager] Failed to post activity:', err);
            }
        });
    }

    private async loadFriends() {
        if (!this.userId) return;
        try {
            const following = await SocialGraphService.getFollowing(this.userId);
            this.friends = new Set(following.map((p: any) => p.id));

            // Emit friends loaded event so PresenceManager can update UI
            this.eventBus.emit({
                type: 'social:friends-loaded',
                scope: 'global',
                payload: { friendIds: Array.from(this.friends) }
            });
        } catch (err) {
            console.error('[SocialManager] Failed to load friends:', err);
        }
    }

    public isFriend(userId: string): boolean {
        return this.friends.has(userId);
    }
}
