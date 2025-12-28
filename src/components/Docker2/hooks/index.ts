/**
 * Docker 2.0 Hooks
 * Re-exports for easy importing
 */

export {
  useDocker2Store,
  useActiveDocker,
  useDockerWidgets,
  useDragState,
  useCanUndo,
  useCanRedo,
  default,
} from './useDocker2Store';

export {
  useDocker2Keyboard,
  DOCKER2_SHORTCUTS,
} from './useDocker2Keyboard';
export type { Docker2KeyboardOptions, Docker2KeyboardShortcuts } from './useDocker2Keyboard';

export {
  useDocker2Touch,
  useDocker2DefaultTouch,
} from './useDocker2Touch';
export type { Docker2TouchOptions, Docker2TouchReturn, TouchGestureState } from './useDocker2Touch';
