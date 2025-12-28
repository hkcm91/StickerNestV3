/**
 * Docker 2.0
 * Enhanced widget docker with stacking, drag-drop, and glassmorphism theming
 */

// Types
export type {
  Docker2ThemeMode,
  Docker2ThemeColors,
  Docker2Theme,
  LayoutMode,
  GridConfig,
  LayoutConfig,
  StackedWidget,
  Docker2Instance,
  DragSource,
  DropZone,
  DragState,
  DropResult,
  Docker2State,
  Docker2Preset,
  Docker2ContainerProps,
  Docker2HeaderProps,
  WidgetStackProps,
  DropIndicatorProps,
  DragPreviewProps,
  UseDocker2Actions,
} from './Docker2.types';

// Theme
export {
  darkTheme,
  lightTheme,
  getTheme,
  toggleThemeMode,
  generateCSSVariables,
  getGlassStyle,
  getContainerStyle,
  getHeaderStyle,
  getButtonStyle,
  getIconButtonStyle,
  getDropZoneStyle,
  getWidgetCardStyle,
  animations,
  animationStyles,
  default as Docker2ThemeUtils,
} from './Docker2Theme';

// Hooks
export {
  useDocker2Store,
  useActiveDocker,
  useDockerWidgets,
  useDragState,
  useCanUndo,
  useCanRedo,
  useDocker2Keyboard,
  DOCKER2_SHORTCUTS,
  useDocker2Touch,
  useDocker2DefaultTouch,
} from './hooks';

export type {
  Docker2KeyboardOptions,
  Docker2KeyboardShortcuts,
  Docker2TouchOptions,
  Docker2TouchReturn,
  TouchGestureState,
} from './hooks';

// Components
export {
  Docker2Container,
  Docker2Header,
  WidgetStack,
  DropIndicator,
  BetweenIndicator,
} from './components';

// Layouts (to be added in Phase 4)
// export { VerticalStackLayout } from './layouts/VerticalStackLayout';
// export { HorizontalStackLayout } from './layouts/HorizontalStackLayout';
// export { GridLayout } from './layouts/GridLayout';
// export { TabbedLayout } from './layouts/TabbedLayout';
