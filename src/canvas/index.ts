/**
 * StickerNest - Canvas Module
 * Exports for canvas functionality
 */

// MainCanvas - The unified, optimized canvas component
export {
  MainCanvas,
  type MainCanvasProps,
  type MainCanvasRef,
  type CanvasProperties,
  type CanvasMode,
  // Backwards compatibility aliases
  Canvas2,
  type Canvas2Props,
  type Canvas2Ref,
} from './MainCanvas';

// Coordinate service
export { coordinateService } from './CoordinateService';
export type { Point, Delta } from './CoordinateService';

// History/Command system
export * from './history';

