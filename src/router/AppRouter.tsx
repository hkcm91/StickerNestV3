/**
 * StickerNest v2 - App Router
 * Handles URL routing for canvas navigation, sharing, and embedding
 */

import React, { Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useParams,
  useSearchParams,
  Outlet,
} from 'react-router-dom';
import { CommandPaletteProvider } from '../shared-ui';
import { lazyWithRetry, lazyWithRetryNamed } from '../utils/lazyWithRetry';

// Lazy load pages for code splitting with automatic retry on chunk load failure
const MainApp = lazyWithRetry(() => import('../App'));
const SharedCanvasPage = lazyWithRetry(() => import('../pages/SharedCanvasPage'));
const EmbedCanvasPage = lazyWithRetry(() => import('../pages/EmbedCanvasPage'));
const LoginPage = lazyWithRetry(() => import('../pages/LoginPage'));
const SignupPage = lazyWithRetry(() => import('../pages/SignupPage'));
const UserProfilePage = lazyWithRetry(() => import('../pages/UserProfilePage'));
const FavoritesPage = lazyWithRetry(() => import('../pages/FavoritesPage'));
const ExplorePage = lazyWithRetry(() => import('../pages/ExplorePage'));
const MarketplacePage = lazyWithRetry(() => import('../pages/MarketplacePage'));
const WidgetDetailPage = lazyWithRetry(() => import('../pages/WidgetDetailPage'));
const SettingsPage = lazyWithRetry(() => import('../pages/SettingsPage'));
const LandingPage = lazyWithRetry(() => import('../pages/LandingPage'));
const HomePage = lazyWithRetry(() => import('../pages/HomePage'));
const AuthCallbackPage = lazyWithRetry(() => import('../pages/AuthCallbackPage'));
const BusinessCardDemoPage = lazyWithRetryNamed(() => import('../pages/BusinessCardDemoPage'), 'BusinessCardDemoPage');
const DemoMessagingPage = lazyWithRetry(() => import('../pages/DemoMessagingPage'));
const StickerLabPage = lazyWithRetry(() => import('../pages/StickerLabPage'));
const InviteAcceptPage = lazyWithRetry(() => import('../pages/InviteAcceptPage'));
const SharedWithMePage = lazyWithRetry(() => import('../pages/SharedWithMePage'));

// Loading component
const LoadingSpinner: React.FC = () => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--sn-bg-primary, #0f0f19)',
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{
        width: 48,
        height: 48,
        border: '3px solid rgba(139, 92, 246, 0.2)',
        borderTopColor: 'var(--sn-accent-primary, #8b5cf6)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <span style={{ color: 'var(--sn-text-secondary, #94a3b8)', fontSize: 14 }}>
        Loading...
      </span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

// Root layout wrapper
const RootLayout: React.FC = () => (
  <CommandPaletteProvider>
    <Suspense fallback={<LoadingSpinner />}>
      <Outlet />
    </Suspense>
  </CommandPaletteProvider>
);

import { RouteErrorPage } from '../pages/RouteErrorPage';

// ... (existing imports)

// Route definitions
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      // Landing page with waitlist and demo canvas
      {
        index: true,
        element: <LandingPage />,
      },
      // Canvas 2.0 demo home page (alternative)
      {
        path: 'home',
        element: <HomePage />,
      },
      // Authentication pages
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
      // OAuth callback handler
      {
        path: 'auth/callback',
        element: <AuthCallbackPage />,
      },
      // User Profile - combined gallery and profile at /@username or /u/username
      {
        path: 'u/:username',
        element: <UserProfilePage />,
      },
      // Own profile (no username = current user)
      {
        path: 'profile',
        element: <UserProfilePage />,
      },
      // Legacy gallery routes - redirect to profile
      {
        path: 'gallery',
        element: <Navigate to="/profile" replace />,
      },
      // Legacy gallery with username - use same component (will redirect in UI)
      {
        path: 'gallery/:username',
        element: <UserProfilePage />,
      },
      // Legacy profile with username
      {
        path: 'profile/:username',
        element: <UserProfilePage />,
      },
      // Favorites - saved canvases
      {
        path: 'favorites',
        element: <FavoritesPage />,
      },
      // Shared with me - canvases shared by others
      {
        path: 'shared',
        element: <SharedWithMePage />,
      },
      // Invite acceptance page
      {
        path: 'invite/:token',
        element: <InviteAcceptPage />,
      },
      // Redirect old dashboard route to app
      {
        path: 'dashboard',
        element: <Navigate to="/app" replace />,
      },
      // Main app (canvas workspace)
      {
        path: 'app',
        element: <MainApp />,
      },
      // Explore / Discover public canvases
      {
        path: 'explore',
        element: <ExplorePage />,
      },
      // Marketplace
      {
        path: 'marketplace',
        element: <MarketplacePage />,
      },
      // Widget detail page
      {
        path: 'marketplace/:id',
        element: <WidgetDetailPage />,
      },
      // Settings (authenticated)
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      // Canvas Editor - Create new canvas (uses LandingPage as editor)
      {
        path: 'create',
        element: <LandingPage />,
      },
      // Canvas Editor - Edit existing canvas (uses LandingPage as editor)
      {
        path: 'create/:canvasId',
        element: <LandingPage />,
      },
      // Canvas by ID (for authenticated users) - Main canvas editing entry point
      {
        path: 'canvas/:canvasId',
        element: <MainApp />,
      },
      // Shared canvas by slug (public access)
      {
        path: 'c/:slug',
        element: <SharedCanvasPage />,
      },
      // Embed canvas (for iframe embedding)
      {
        path: 'embed/:slug',
        element: <EmbedCanvasPage />,
      },
      // Business Card Demo
      {
        path: 'demo/business-card',
        element: <BusinessCardDemoPage />,
      },
      // Cross-Canvas Messaging Demo
      {
        path: 'demo/messaging',
        element: <DemoMessagingPage />,
      },
      // Sticker Lab 3.0 - Widget development environment
      {
        path: 'lab',
        element: <StickerLabPage />,
      },
      // Fallback redirect
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;

// ==================
// Route Hooks
// ==================

/**
 * Hook to get current canvas route params
 */
export function useCanvasParams() {
  const { canvasId, slug } = useParams<{ canvasId?: string; slug?: string }>();
  const [searchParams] = useSearchParams();

  return {
    canvasId,
    slug,
    isShared: !!slug,
    isEmbed: window.location.pathname.startsWith('/embed/'),
    password: searchParams.get('p') || undefined,
  };
}

/**
 * Generate shareable URL for a canvas
 */
export function generateShareUrl(slug: string, options?: { embed?: boolean; password?: string }): string {
  const baseUrl = window.location.origin;
  const path = options?.embed ? `/embed/${slug}` : `/c/${slug}`;
  let url = `${baseUrl}${path}`;

  if (options?.password) {
    url += `?p=${encodeURIComponent(options.password)}`;
  }

  return url;
}

/**
 * Generate embed code for a canvas
 */
export function generateEmbedCode(slug: string, width = 800, height = 600): string {
  const embedUrl = generateShareUrl(slug, { embed: true });
  return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}
