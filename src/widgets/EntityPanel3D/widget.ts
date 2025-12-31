/**
 * StickerNest v2 - 3D Entity Panel Widget (Bridge)
 *
 * Exports the widget with manifest and component for registration.
 */

import type { WidgetManifest } from '../../types/manifest';
import { EntityPanel3DWidget } from './index';
import manifest from './manifest.json';

export { EntityPanel3DWidget };

export const EntityPanel3DWidgetDef = {
  manifest: manifest as unknown as WidgetManifest,
  component: EntityPanel3DWidget,
};

export default EntityPanel3DWidgetDef;
