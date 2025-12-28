/**
 * StickerNest v2 - Shared Widgets Client
 * Supabase client for shared widgets operations
 */

import { supabaseClient } from './supabaseClient';
import type { WidgetManifest } from '../types/manifest';

export type WidgetVisibility = 'public' | 'unlisted' | 'private';
export type CollaboratorRole = 'viewer' | 'editor' | 'admin';

export interface SharedWidget {
  id: string;
  widget_id: string;
  owner_id: string;
  manifest: WidgetManifest;
  html: string;
  visibility: WidgetVisibility;
  downloads: number;
  likes: number;
  tags: string[];
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WidgetCollaborator {
  id: string;
  widget_id: string;
  user_id: string;
  role: CollaboratorRole;
  invited_at: string;
  accepted_at: string | null;
}

export interface PublishWidgetParams {
  widget_id: string;
  manifest: WidgetManifest;
  html: string;
  visibility?: WidgetVisibility;
  tags?: string[];
  description?: string;
  thumbnail_url?: string;
}

export interface SearchParams {
  query?: string;
  tags?: string[];
  visibility?: WidgetVisibility;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'downloads' | 'likes';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Shared Widgets API Client
 */
class SharedWidgetsClient {
  /**
   * Publish a widget to the shared registry
   */
  async publishWidget(params: PublishWidgetParams, userId: string): Promise<SharedWidget | null> {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return null;
    }

    const { data, error } = await supabaseClient
      .from('shared_widgets')
      .insert({
        widget_id: params.widget_id,
        owner_id: userId,
        manifest: params.manifest,
        html: params.html,
        visibility: params.visibility || 'public',
        tags: params.tags || [],
        description: params.description || null,
        thumbnail_url: params.thumbnail_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to publish widget:', error);
      return null;
    }

    return data as SharedWidget;
  }

  /**
   * Update a shared widget
   */
  async updateWidget(
    widgetId: string, 
    updates: Partial<Omit<SharedWidget, 'id' | 'owner_id' | 'created_at'>>
  ): Promise<SharedWidget | null> {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return null;
    }

    const { data, error } = await supabaseClient
      .from('shared_widgets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', widgetId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update widget:', error);
      return null;
    }

    return data as SharedWidget;
  }

  /**
   * Delete a shared widget
   */
  async deleteWidget(widgetId: string): Promise<boolean> {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return false;
    }

    const { error } = await supabaseClient
      .from('shared_widgets')
      .delete()
      .eq('id', widgetId);

    if (error) {
      console.error('Failed to delete widget:', error);
      return false;
    }

    return true;
  }

  /**
   * Get a shared widget by ID
   */
  async getWidget(widgetId: string): Promise<SharedWidget | null> {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return null;
    }

    const { data, error } = await supabaseClient
      .from('shared_widgets')
      .select('*')
      .eq('id', widgetId)
      .single();

    if (error) {
      console.error('Failed to get widget:', error);
      return null;
    }

    return data as SharedWidget;
  }

  /**
   * Search shared widgets
   */
  async searchWidgets(params: SearchParams = {}): Promise<SharedWidget[]> {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return [];
    }

    let query = supabaseClient
      .from('shared_widgets')
      .select('*');

    // Filter by visibility (default to public)
    if (params.visibility) {
      query = query.eq('visibility', params.visibility);
    } else {
      query = query.eq('visibility', 'public');
    }

    // Text search in manifest name and description
    if (params.query) {
      query = query.or(`manifest->>name.ilike.%${params.query}%,description.ilike.%${params.query}%`);
    }

    // Filter by tags
    if (params.tags && params.tags.length > 0) {
      query = query.contains('tags', params.tags);
    }

    // Order
    const orderBy = params.orderBy || 'created_at';
    const orderDirection = params.orderDirection || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    // Pagination
    const limit = params.limit || 20;
    const offset = params.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Failed to search widgets:', error);
      return [];
    }

    return (data as SharedWidget[]) || [];
  }

  /**
   * Get widgets by owner
   */
  async getMyWidgets(userId: string): Promise<SharedWidget[]> {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return [];
    }

    const { data, error } = await supabaseClient
      .from('shared_widgets')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get user widgets:', error);
      return [];
    }

    return (data as SharedWidget[]) || [];
  }

  /**
   * Get popular widgets
   */
  async getPopularWidgets(limit: number = 10): Promise<SharedWidget[]> {
    return this.searchWidgets({
      visibility: 'public',
      orderBy: 'downloads',
      orderDirection: 'desc',
      limit,
    });
  }

  /**
   * Get recent widgets
   */
  async getRecentWidgets(limit: number = 10): Promise<SharedWidget[]> {
    return this.searchWidgets({
      visibility: 'public',
      orderBy: 'created_at',
      orderDirection: 'desc',
      limit,
    });
  }

  /**
   * Increment download count
   */
  async incrementDownloads(widgetId: string): Promise<void> {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return;
    }

    const { error } = await supabaseClient.rpc('increment_widget_downloads', {
      widget_uuid: widgetId,
    });

    if (error) {
      console.error('Failed to increment downloads:', error);
    }
  }

  /**
   * Increment likes count
   */
  async incrementLikes(widgetId: string): Promise<void> {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return;
    }

    const { error } = await supabaseClient.rpc('increment_widget_likes', {
      widget_uuid: widgetId,
    });

    if (error) {
      console.error('Failed to increment likes:', error);
    }
  }

  /**
   * Add a collaborator to a widget
   */
  async addCollaborator(
    widgetId: string, 
    userId: string, 
    role: CollaboratorRole = 'viewer'
  ): Promise<WidgetCollaborator | null> {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return null;
    }

    const { data, error } = await supabaseClient
      .from('widget_collaborators')
      .insert({
        widget_id: widgetId,
        user_id: userId,
        role,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to add collaborator:', error);
      return null;
    }

    return data as WidgetCollaborator;
  }

  /**
   * Remove a collaborator from a widget
   */
  async removeCollaborator(widgetId: string, userId: string): Promise<boolean> {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return false;
    }

    const { error } = await supabaseClient
      .from('widget_collaborators')
      .delete()
      .eq('widget_id', widgetId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to remove collaborator:', error);
      return false;
    }

    return true;
  }

  /**
   * Get collaborators for a widget
   */
  async getCollaborators(widgetId: string): Promise<WidgetCollaborator[]> {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return [];
    }

    const { data, error } = await supabaseClient
      .from('widget_collaborators')
      .select('*')
      .eq('widget_id', widgetId);

    if (error) {
      console.error('Failed to get collaborators:', error);
      return [];
    }

    return (data as WidgetCollaborator[]) || [];
  }

  /**
   * Get widgets the user collaborates on
   */
  async getCollaboratingWidgets(userId: string): Promise<SharedWidget[]> {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return [];
    }

    const { data: collaborations, error: collabError } = await supabaseClient
      .from('widget_collaborators')
      .select('widget_id')
      .eq('user_id', userId);

    if (collabError || !collaborations) {
      console.error('Failed to get collaborations:', collabError);
      return [];
    }

    const widgetIds = collaborations.map(c => c.widget_id);
    
    if (widgetIds.length === 0) return [];

    const { data, error } = await supabaseClient
      .from('shared_widgets')
      .select('*')
      .in('id', widgetIds);

    if (error) {
      console.error('Failed to get collaborating widgets:', error);
      return [];
    }

    return (data as SharedWidget[]) || [];
  }

  /**
   * Update collaborator role
   */
  async updateCollaboratorRole(
    widgetId: string, 
    userId: string, 
    role: CollaboratorRole
  ): Promise<boolean> {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return false;
    }

    const { error } = await supabaseClient
      .from('widget_collaborators')
      .update({ role })
      .eq('widget_id', widgetId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update collaborator role:', error);
      return false;
    }

    return true;
  }
}

// Singleton instance
export const sharedWidgetsClient = new SharedWidgetsClient();
export default sharedWidgetsClient;

