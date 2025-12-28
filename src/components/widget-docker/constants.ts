/**
 * Widget Docker Constants
 */

export const MIN_WIDTH = 280;
export const MAX_WIDTH = 600;
export const MIN_HEIGHT = 200;
export const MAX_HEIGHT = 800;
export const HEADER_HEIGHT = 42;
export const TAB_HEIGHT = 36;

/** Default docker instance */
export const DEFAULT_DOCKER = {
  id: 'default',
  name: 'Main Docker',
  dockedIds: [] as string[],
  position: { x: 20, y: 80 },
  size: { width: 320, height: 400 },
  collapsed: false,
  activeTab: 0,
};
