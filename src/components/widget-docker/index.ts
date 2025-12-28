/**
 * Widget Docker Module
 * Floating docker system for organizing widgets
 */

// Types
export type {
  DockedWidget,
  DockerInstance,
  DockerPreset,
  WidgetDockerProps,
} from './WidgetDocker.types';

// Constants
export {
  MIN_WIDTH,
  MAX_WIDTH,
  MIN_HEIGHT,
  MAX_HEIGHT,
  HEADER_HEIGHT,
  TAB_HEIGHT,
  DEFAULT_DOCKER,
} from './constants';

// Hooks
export { useDockerState } from './hooks';

// Components
export {
  GlassButton,
  TabItem,
  PresetsPanel,
  DockerDropdown,
} from './components/DockerComponents';

// Main component will be re-exported from WidgetDocker.tsx after refactoring
