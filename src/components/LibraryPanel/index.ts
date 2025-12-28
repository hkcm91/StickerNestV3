/**
 * StickerNest v2 - Library Panel Components
 *
 * Barrel export for the redesigned library panel system.
 * Provides a professional slide-out panel with tabs, quick access,
 * and enhanced widget cards.
 */

// Main composed panel (use this for integration)
export { LibraryPanel } from './LibraryPanel';
export { default as LibraryPanelDefault } from './LibraryPanel';

// Main container
export { LibrarySlideoutContainer } from './LibrarySlideoutContainer';
export { default as LibrarySlideoutContainerDefault } from './LibrarySlideoutContainer';

// Navigation
export { LibraryTabBar } from './LibraryTabBar';
export { default as LibraryTabBarDefault } from './LibraryTabBar';

// Quick access (favorites & recents)
export { LibraryQuickAccess } from './LibraryQuickAccess';
export { default as LibraryQuickAccessDefault } from './LibraryQuickAccess';

// Widget display
export { WidgetCard } from './WidgetCard';
export { default as WidgetCardDefault } from './WidgetCard';

// Widget grid
export { LibraryWidgetGrid } from './LibraryWidgetGrid';
export { default as LibraryWidgetGridDefault } from './LibraryWidgetGrid';

// Sticker grid
export { LibraryStickerGrid } from './LibraryStickerGrid';
export { default as LibraryStickerGridDefault } from './LibraryStickerGrid';
