import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './shared-ui'
import { DevToolbar } from './components/dev'
import AppRouter from './router/AppRouter'
import { initCommerceCanvas } from './utils/initCommerceCanvas'
import { initStorefrontCanvas } from './utils/initStorefrontCanvas'
import { initSpatialCanvas } from './utils/initSpatialCanvas'
import './index.css'

// Initialize demo canvases
initCommerceCanvas();    // Individual commerce widgets with pipelines
initStorefrontCanvas();  // All-in-one StorefrontLayoutWidget
initSpatialCanvas();     // VR/AR spatial platform demo

// Version marker for deployment verification
const BUILD_VERSION = 'c24b0b3-' + new Date().toISOString().split('T')[0];
if (typeof window !== 'undefined') {
  console.log(`%cStickerNest v2 - Build: ${BUILD_VERSION}`, 'color: #8b5cf6; font-size: 14px; font-weight: bold;');
  (window as any).__STICKERNEST_BUILD_VERSION__ = BUILD_VERSION;
}

// Expose stores for testing/debugging (only in dev mode)
if (import.meta.env.DEV) {
  import('./state/useCanvasStore').then(module => {
    (window as any).__STICKERNEST_STORES__ = (window as any).__STICKERNEST_STORES__ || {};
    (window as any).__STICKERNEST_STORES__.canvas = module.useCanvasStore;
  });
  import('./state/useSpatialModeStore').then(module => {
    (window as any).__STICKERNEST_STORES__ = (window as any).__STICKERNEST_STORES__ || {};
    (window as any).__STICKERNEST_STORES__.spatialMode = module.useSpatialModeStore;
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <AuthProvider>
                <ToastProvider position="bottom-right">
                    <AppRouter />
                    <DevToolbar />
                </ToastProvider>
            </AuthProvider>
        </ErrorBoundary>
    </React.StrictMode>,
)
