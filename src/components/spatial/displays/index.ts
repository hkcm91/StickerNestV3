/**
 * StickerNest - Spatial Displays Module
 *
 * 3D display surfaces for video/images in VR/AR space.
 * Can be placed on collision surfaces and controlled via pipelines.
 */

export {
  SpatialDisplay,
  DisplayPresets,
  getRegisteredDisplays,
  getDisplayById,
  type SpatialDisplayProps,
  type MediaSource,
  type MediaType,
} from './SpatialDisplay';

export {
  useSpatialDisplayPlacement,
  type PlacedDisplay,
  type DisplayPlacementState,
  type UseSpatialDisplayPlacementOptions,
} from './useSpatialDisplayPlacement';
