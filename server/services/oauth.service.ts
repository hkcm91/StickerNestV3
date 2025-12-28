import { db } from '../db/client.js';
import { idGenerators } from '../utils/id.js';
import { generateTokens } from '../middleware/auth.middleware.js';
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
} from '../utils/AppErrors.js';
import type { UserResponse } from '../schemas/auth.schema.js';

// OAuth provider types
export type OAuthProvider = 'google' | 'github' | 'discord';

// OAuth provider configuration
interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

// OAuth user info from provider
interface OAuthUserInfo {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

// OAuth token response from providers
interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

// Google user info response
interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

// GitHub user info response
interface GitHubUserInfo {
  id: number;
  email?: string;
  name?: string;
  login: string;
  avatar_url?: string;
}

// GitHub email response
interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

// Discord user info response
interface DiscordUserInfo {
  id: string;
  email?: string;
  username: string;
  global_name?: string;
  avatar?: string;
}

// Environment variable names for OAuth providers
const PROVIDER_ENV_KEYS: Record<OAuthProvider, { clientId: string; clientSecret: string }> = {
  google: {
    clientId: 'GOOGLE_CLIENT_ID',
    clientSecret: 'GOOGLE_CLIENT_SECRET',
  },
  github: {
    clientId: 'GITHUB_CLIENT_ID',
    clientSecret: 'GITHUB_CLIENT_SECRET',
  },
  discord: {
    clientId: 'DISCORD_CLIENT_ID',
    clientSecret: 'DISCORD_CLIENT_SECRET',
  },
};

// OAuth provider configurations
const PROVIDER_CONFIGS: Record<OAuthProvider, Omit<OAuthProviderConfig, 'clientId' | 'clientSecret'>> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
  },
  discord: {
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
    scopes: ['identify', 'email'],
  },
};

/**
 * Check if an OAuth provider is enabled (has credentials configured)
 */
function isProviderEnabled(provider: OAuthProvider): boolean {
  const envKeys = PROVIDER_ENV_KEYS[provider];
  return !!(process.env[envKeys.clientId] && process.env[envKeys.clientSecret]);
}

/**
 * Get OAuth provider configuration
 */
function getProviderConfig(provider: OAuthProvider): OAuthProviderConfig {
  if (!isProviderEnabled(provider)) {
    throw new ValidationError(`Unsupported provider: ${provider} is not enabled`);
  }

  const envKeys = PROVIDER_ENV_KEYS[provider];
  const baseConfig = PROVIDER_CONFIGS[provider];

  return {
    ...baseConfig,
    clientId: process.env[envKeys.clientId]!,
    clientSecret: process.env[envKeys.clientSecret]!,
  };
}

/**
 * OAuth Service - handles OAuth authentication
 */
export class OAuthService {
  /**
   * Get list of enabled OAuth providers
   */
  getEnabledProviders(): OAuthProvider[] {
    const providers: OAuthProvider[] = ['google', 'github', 'discord'];
    return providers.filter(isProviderEnabled);
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(provider: OAuthProvider, redirectUri: string, state?: string): string {
    const config = getProviderConfig(provider);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
    });

    if (state) {
      params.set('state', state);
    }

    // Provider-specific parameters
    if (provider === 'google') {
      params.set('access_type', 'offline');
      // Use 'select_account consent' to force account picker AND consent screen
      // This ensures users can switch accounts after logging out
      params.set('prompt', 'select_account consent');
    }

    if (provider === 'discord') {
      params.set('prompt', 'consent');
    }

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    provider: OAuthProvider,
    code: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
    const config = getProviderConfig(provider);

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`OAuth token exchange failed for ${provider}:`, error);
      throw new AuthenticationError('Failed to authenticate with provider');
    }

    const data = await response.json() as OAuthTokenResponse;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get user info from OAuth provider
   */
  private async getUserInfo(provider: OAuthProvider, accessToken: string): Promise<OAuthUserInfo> {
    const config = getProviderConfig(provider);

    const response = await fetch(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new AuthenticationError('Failed to get user info from provider');
    }

    // Normalize user info based on provider
    switch (provider) {
      case 'google': {
        const data = await response.json() as GoogleUserInfo;
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          avatarUrl: data.picture,
        };
      }

      case 'github': {
        const data = await response.json() as GitHubUserInfo;
        // GitHub might not include email in basic user info, need to fetch separately
        let email = data.email;
        if (!email) {
          email = await this.getGitHubPrimaryEmail(accessToken);
        }
        return {
          id: String(data.id),
          email,
          name: data.name || data.login,
          avatarUrl: data.avatar_url,
        };
      }

      case 'discord': {
        const data = await response.json() as DiscordUserInfo;
        if (!data.email) {
          throw new AuthenticationError('Email is required. Please ensure your Discord account has a verified email.');
        }
        return {
          id: data.id,
          email: data.email,
          name: data.global_name || data.username,
          avatarUrl: data.avatar
            ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
            : undefined,
        };
      }

      default:
        throw new ValidationError(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Get GitHub primary email (when not included in user info)
   */
  private async getGitHubPrimaryEmail(accessToken: string): Promise<string> {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new AuthenticationError('Failed to get email from GitHub');
    }

    const emails = await response.json() as GitHubEmail[];
    const primary = emails.find((e) => e.primary && e.verified);

    if (!primary) {
      throw new AuthenticationError('No verified email found on GitHub account');
    }

    return primary.email;
  }

  /**
   * Handle OAuth callback - authenticate or register user
   */
  async handleCallback(
    provider: OAuthProvider,
    code: string,
    redirectUri: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{
    user: UserResponse;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(provider, code, redirectUri);

    // Get user info from provider
    const userInfo = await this.getUserInfo(provider, tokens.accessToken);

    if (!userInfo.email) {
      throw new AuthenticationError('Email is required for authentication');
    }

    // Check if OAuth account already exists
    const existingOAuth = await db.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: userInfo.id,
        },
      },
      include: { user: true },
    });

    let user;
    let isNewUser = false;

    if (existingOAuth) {
      // User already has this OAuth account linked - just login
      user = existingOAuth.user;

      // Update OAuth account with latest tokens
      await db.oAuthAccount.update({
        where: { id: existingOAuth.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresIn
            ? new Date(Date.now() + tokens.expiresIn * 1000)
            : null,
          email: userInfo.email,
          displayName: userInfo.name,
          avatarUrl: userInfo.avatarUrl,
        },
      });
    } else {
      // Check if user exists with this email
      const existingUser = await db.user.findUnique({
        where: { email: userInfo.email },
      });

      if (existingUser) {
        // Link this OAuth account to existing user
        user = existingUser;

        await db.oAuthAccount.create({
          data: {
            id: idGenerators.oauthAccount(),
            userId: user.id,
            provider,
            providerUserId: userInfo.id,
            email: userInfo.email,
            displayName: userInfo.name,
            avatarUrl: userInfo.avatarUrl,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresIn
              ? new Date(Date.now() + tokens.expiresIn * 1000)
              : null,
          },
        });
      } else {
        // Create new user with OAuth account
        isNewUser = true;

        // Generate unique username from email or name
        const baseUsername = (userInfo.name || userInfo.email.split('@')[0])
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 20);

        let username = baseUsername;
        let counter = 1;

        while (await db.user.findUnique({ where: { username } })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        user = await db.user.create({
          data: {
            id: idGenerators.user(),
            username,
            email: userInfo.email,
            password: null, // OAuth users don't have a password
            oauthAccounts: {
              create: {
                id: idGenerators.oauthAccount(),
                provider,
                providerUserId: userInfo.id,
                email: userInfo.email,
                displayName: userInfo.name,
                avatarUrl: userInfo.avatarUrl,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: tokens.expiresIn
                  ? new Date(Date.now() + tokens.expiresIn * 1000)
                  : null,
              },
            },
          },
        });
      }
    }

    // Create session
    const sessionId = idGenerators.session();
    const jwtTokens = generateTokens(user.id, user.username, sessionId);

    await db.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken: jwtTokens.refreshToken,
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: this.formatUser(user),
      accessToken: jwtTokens.accessToken,
      refreshToken: jwtTokens.refreshToken,
      isNewUser,
    };
  }

  /**
   * Link OAuth provider to existing user account
   */
  async linkProvider(
    userId: string,
    provider: OAuthProvider,
    code: string,
    redirectUri: string
  ): Promise<void> {
    // Check if user already has this provider linked
    const existing = await db.oAuthAccount.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    if (existing) {
      throw new ConflictError(`${provider} account is already linked`);
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(provider, code, redirectUri);

    // Get user info from provider
    const userInfo = await this.getUserInfo(provider, tokens.accessToken);

    // Check if this OAuth account is already linked to another user
    const existingOAuth = await db.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: userInfo.id,
        },
      },
    });

    if (existingOAuth) {
      throw new ConflictError(`This ${provider} account is already linked to another user`);
    }

    // Create the OAuth account link
    await db.oAuthAccount.create({
      data: {
        id: idGenerators.oauthAccount(),
        userId,
        provider,
        providerUserId: userInfo.id,
        email: userInfo.email,
        displayName: userInfo.name,
        avatarUrl: userInfo.avatarUrl,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : null,
      },
    });
  }

  /**
   * Unlink OAuth provider from user account
   */
  async unlinkProvider(userId: string, provider: OAuthProvider): Promise<void> {
    // Check if user has this provider linked
    const oauthAccount = await db.oAuthAccount.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    if (!oauthAccount) {
      throw new ValidationError(`${provider} account is not linked`);
    }

    // Check if user has a password or other OAuth accounts
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        oauthAccounts: true,
      },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    // Don't allow unlinking if it's the only auth method
    if (!user.password && user.oauthAccounts.length <= 1) {
      throw new ValidationError(
        'Cannot unlink the only authentication method. Set a password first.'
      );
    }

    // Delete the OAuth account
    await db.oAuthAccount.delete({
      where: { id: oauthAccount.id },
    });
  }

  /**
   * Get linked OAuth providers for a user
   */
  async getLinkedProviders(userId: string): Promise<string[]> {
    const accounts = await db.oAuthAccount.findMany({
      where: { userId },
      select: { provider: true },
    });

    return accounts.map((a: { provider: string }) => a.provider);
  }

  /**
   * Format user for response (exclude sensitive fields)
   */
  private formatUser(user: {
    id: string;
    username: string;
    email: string;
    createdAt: Date;
  }): UserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

// Export singleton instance
export const oauthService = new OAuthService();
