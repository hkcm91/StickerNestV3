/**
 * StickerNest v2 - Invite Code Service
 * Handles invite code validation and redemption
 */

import { supabaseClient, isLocalDevMode } from './supabaseClient';

export interface InviteCodeValidationResult {
  valid: boolean;
  codeId?: string;
  errorMessage?: string;
}

/**
 * Validate an invite code before signup
 */
export async function validateInviteCode(code: string): Promise<InviteCodeValidationResult> {
  // In local dev mode, accept any code or skip validation
  if (isLocalDevMode || !supabaseClient) {
    // Accept common test codes in dev mode
    const testCodes = ['TEST', 'BETA', 'DEV', 'BETA-2024', 'EARLY-BIRD', 'FOUNDER-VIP'];
    const normalizedCode = code.toUpperCase().trim();

    if (testCodes.some(tc => normalizedCode.includes(tc)) || normalizedCode.length >= 4) {
      return { valid: true, codeId: 'dev-code' };
    }
    return { valid: false, errorMessage: 'Invalid invite code' };
  }

  try {
    const { data, error } = await supabaseClient.rpc('validate_invite_code', {
      p_code: code.toUpperCase().trim()
    });

    if (error) {
      console.error('[InviteCode] Validation error:', error);
      return { valid: false, errorMessage: 'Failed to validate code' };
    }

    if (data && data.length > 0) {
      const result = data[0];
      return {
        valid: result.valid,
        codeId: result.code_id,
        errorMessage: result.error_message
      };
    }

    return { valid: false, errorMessage: 'Invalid invite code' };
  } catch (error) {
    console.error('[InviteCode] Validation exception:', error);
    return { valid: false, errorMessage: 'Failed to validate code' };
  }
}

/**
 * Redeem an invite code after successful signup
 */
export async function redeemInviteCode(code: string, userId: string): Promise<boolean> {
  // Skip in dev mode
  if (isLocalDevMode || !supabaseClient) {
    return true;
  }

  try {
    const { data, error } = await supabaseClient.rpc('redeem_invite_code', {
      p_code: code.toUpperCase().trim(),
      p_user_id: userId
    });

    if (error) {
      console.error('[InviteCode] Redemption error:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('[InviteCode] Redemption exception:', error);
    return false;
  }
}

/**
 * Generate a new invite code (admin only)
 */
export async function generateInviteCode(options: {
  maxUses?: number;
  expiresInDays?: number;
  note?: string;
}): Promise<string | null> {
  if (isLocalDevMode || !supabaseClient) {
    // Generate a fake code for dev
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  try {
    const { data, error } = await supabaseClient.rpc('generate_invite_code', {
      p_max_uses: options.maxUses || 1,
      p_expires_in_days: options.expiresInDays || null,
      p_note: options.note || null
    });

    if (error) {
      console.error('[InviteCode] Generation error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[InviteCode] Generation exception:', error);
    return null;
  }
}

/**
 * List all invite codes (admin only)
 */
export async function listInviteCodes(): Promise<Array<{
  id: string;
  code: string;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
  isActive: boolean;
  note: string | null;
  createdAt: string;
}>> {
  if (isLocalDevMode || !supabaseClient) {
    return [
      { id: '1', code: 'BETA-2024', maxUses: 100, usesCount: 5, expiresAt: null, isActive: true, note: 'Beta testing', createdAt: new Date().toISOString() },
      { id: '2', code: 'EARLY-BIRD', maxUses: 50, usesCount: 12, expiresAt: null, isActive: true, note: 'Early adopters', createdAt: new Date().toISOString() },
    ];
  }

  try {
    const { data, error } = await supabaseClient
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[InviteCode] List error:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      code: row.code,
      maxUses: row.max_uses,
      usesCount: row.uses_count,
      expiresAt: row.expires_at,
      isActive: row.is_active,
      note: row.note,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('[InviteCode] List exception:', error);
    return [];
  }
}
