/**
 * Widget Generator 2.0 - SpecJSON Validator
 *
 * Validates SpecJSON specifications against the canonical schema
 * and provides detailed error messages and suggestions.
 */

import type {
  SpecJSON,
  SpecValidationResult,
  SpecValidationError,
  SpecValidationWarning,
  EventTrigger,
  ActionType,
  StateValueType,
  WidgetCategory,
  VisualType
} from '../types/specjson';

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

const VALID_CATEGORIES: WidgetCategory[] = [
  'productivity', 'creativity', 'social', 'games', 'media', 'data',
  'utility', 'education', 'business', 'lifestyle', 'developer', 'ai',
  'integration', 'custom'
];

const VALID_VISUAL_TYPES: VisualType[] = [
  'png', 'svg', 'lottie', 'css', 'canvas', 'html'
];

const VALID_STATE_TYPES: StateValueType[] = [
  'string', 'number', 'boolean', 'object', 'array', 'any'
];

const VALID_ACTION_TYPES: ActionType[] = [
  'setState', 'toggleState', 'incrementState', 'decrementState', 'resetState',
  'emit', 'broadcast', 'animate', 'playSound', 'navigate', 'fetch',
  'custom', 'conditional', 'sequence', 'parallel'
];

const VALID_EVENT_TRIGGERS: EventTrigger[] = [
  'onClick', 'onDoubleClick', 'onHover', 'onHoverEnd', 'onMount', 'onUnmount',
  'onResize', 'onFocus', 'onBlur', 'onKeyDown', 'onKeyUp', 'onDragStart',
  'onDrag', 'onDragEnd', 'onDrop', 'onContextMenu', 'onWheel', 'onTouchStart',
  'onTouchMove', 'onTouchEnd', 'onAnimationEnd', 'onTransitionEnd', 'onInterval',
  'onTimeout', 'onIdle', 'onVisibilityChange', 'onStateChange', 'onInput',
  'onOutput', 'onError'
];

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
const CSS_VAR_PATTERN = /^--[a-z][a-z0-9-]*$/;

// ============================================================================
// MAIN VALIDATOR
// ============================================================================

export function validateSpecJSON(spec: unknown): SpecValidationResult {
  const errors: SpecValidationError[] = [];
  const warnings: SpecValidationWarning[] = [];

  if (!spec || typeof spec !== 'object') {
    errors.push({
      path: '',
      code: 'INVALID_ROOT',
      message: 'SpecJSON must be a non-null object'
    });
    return { valid: false, errors, warnings };
  }

  const s = spec as Record<string, unknown>;

  // Required fields validation
  validateRequiredFields(s, errors);

  // ID validation
  if (typeof s.id === 'string') {
    validateId(s.id, errors, warnings);
  }

  // Version validation
  if (typeof s.version === 'string') {
    validateVersion(s.version, errors);
  }

  // Category validation
  if (s.category) {
    validateCategory(s.category as string, errors);
  }

  // Visual spec validation
  if (s.visual && typeof s.visual === 'object') {
    validateVisual(s.visual as Record<string, unknown>, errors, warnings);
  }

  // State spec validation
  if (s.state && typeof s.state === 'object') {
    validateState(s.state as Record<string, unknown>, errors, warnings);
  }

  // Events spec validation
  if (s.events && typeof s.events === 'object') {
    validateEvents(s.events as Record<string, unknown>, s.actions as Record<string, unknown>, errors, warnings);
  }

  // Actions spec validation
  if (s.actions && typeof s.actions === 'object') {
    validateActions(s.actions as Record<string, unknown>, s.state as Record<string, unknown>, errors, warnings);
  }

  // API spec validation
  if (s.api && typeof s.api === 'object') {
    validateAPI(s.api as Record<string, unknown>, errors, warnings);
  }

  // Permissions validation
  if (s.permissions && typeof s.permissions === 'object') {
    validatePermissions(s.permissions as Record<string, unknown>, errors, warnings);
  }

  // Size validation
  if (s.size && typeof s.size === 'object') {
    validateSize(s.size as Record<string, unknown>, errors, warnings);
  }

  // Tags validation
  if (s.tags && Array.isArray(s.tags)) {
    validateTags(s.tags, errors, warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// FIELD VALIDATORS
// ============================================================================

function validateRequiredFields(spec: Record<string, unknown>, errors: SpecValidationError[]): void {
  const required = [
    'id', 'version', 'displayName', 'category', 'description',
    'visual', 'state', 'events', 'actions', 'api', 'dependencies', 'permissions'
  ];

  for (const field of required) {
    if (spec[field] === undefined || spec[field] === null) {
      errors.push({
        path: field,
        code: 'REQUIRED_FIELD_MISSING',
        message: `Required field '${field}' is missing`
      });
    }
  }
}

function validateId(id: string, errors: SpecValidationError[], warnings: SpecValidationWarning[]): void {
  if (!ID_PATTERN.test(id)) {
    errors.push({
      path: 'id',
      code: 'INVALID_ID_FORMAT',
      message: `ID '${id}' must be kebab-case (lowercase letters, numbers, hyphens, starting with a letter)`
    });
  }

  if (id.length < 2) {
    errors.push({
      path: 'id',
      code: 'ID_TOO_SHORT',
      message: 'ID must be at least 2 characters long'
    });
  }

  if (id.length > 64) {
    errors.push({
      path: 'id',
      code: 'ID_TOO_LONG',
      message: 'ID must be at most 64 characters long'
    });
  }

  // Warning for potentially confusing IDs
  if (id.includes('--')) {
    warnings.push({
      path: 'id',
      code: 'DOUBLE_HYPHEN',
      message: 'ID contains double hyphens which may be confusing',
      suggestion: 'Use single hyphens to separate words'
    });
  }
}

function validateVersion(version: string, errors: SpecValidationError[]): void {
  if (!VERSION_PATTERN.test(version)) {
    errors.push({
      path: 'version',
      code: 'INVALID_VERSION_FORMAT',
      message: `Version '${version}' must be semantic (e.g., 1.0.0 or 1.0.0-beta.1)`
    });
  }
}

function validateCategory(category: string, errors: SpecValidationError[]): void {
  if (!VALID_CATEGORIES.includes(category as WidgetCategory)) {
    errors.push({
      path: 'category',
      code: 'INVALID_CATEGORY',
      message: `Category '${category}' is not valid. Must be one of: ${VALID_CATEGORIES.join(', ')}`
    });
  }
}

function validateVisual(visual: Record<string, unknown>, errors: SpecValidationError[], warnings: SpecValidationWarning[]): void {
  if (!visual.type) {
    errors.push({
      path: 'visual.type',
      code: 'REQUIRED_FIELD_MISSING',
      message: 'Visual type is required'
    });
  } else if (!VALID_VISUAL_TYPES.includes(visual.type as VisualType)) {
    errors.push({
      path: 'visual.type',
      code: 'INVALID_VISUAL_TYPE',
      message: `Visual type '${visual.type}' is not valid. Must be one of: ${VALID_VISUAL_TYPES.join(', ')}`
    });
  }

  if (!visual.skins || !Array.isArray(visual.skins)) {
    errors.push({
      path: 'visual.skins',
      code: 'REQUIRED_FIELD_MISSING',
      message: 'Visual skins array is required (can be empty)'
    });
  } else {
    // Validate each skin
    (visual.skins as Array<Record<string, unknown>>).forEach((skin, idx) => {
      if (!skin.id || typeof skin.id !== 'string') {
        errors.push({
          path: `visual.skins[${idx}].id`,
          code: 'INVALID_SKIN_ID',
          message: 'Skin ID is required and must be a string'
        });
      }
      if (!skin.name || typeof skin.name !== 'string') {
        errors.push({
          path: `visual.skins[${idx}].name`,
          code: 'INVALID_SKIN_NAME',
          message: 'Skin name is required and must be a string'
        });
      }
    });
  }

  // Validate CSS variables
  if (visual.cssVariables && Array.isArray(visual.cssVariables)) {
    (visual.cssVariables as Array<Record<string, unknown>>).forEach((cssVar, idx) => {
      if (cssVar.name && typeof cssVar.name === 'string' && !CSS_VAR_PATTERN.test(cssVar.name)) {
        errors.push({
          path: `visual.cssVariables[${idx}].name`,
          code: 'INVALID_CSS_VAR_NAME',
          message: `CSS variable name '${cssVar.name}' must start with '--' followed by lowercase letters/numbers/hyphens`
        });
      }
    });
  }

  // Warning for missing default asset
  if (!visual.defaultAsset && visual.type !== 'html' && visual.type !== 'css') {
    warnings.push({
      path: 'visual.defaultAsset',
      code: 'MISSING_DEFAULT_ASSET',
      message: 'No default asset specified',
      suggestion: 'Consider adding a default asset for visual preview'
    });
  }
}

function validateState(state: Record<string, unknown>, errors: SpecValidationError[], warnings: SpecValidationWarning[]): void {
  for (const [key, value] of Object.entries(state)) {
    if (!value || typeof value !== 'object') {
      errors.push({
        path: `state.${key}`,
        code: 'INVALID_STATE_FIELD',
        message: `State field '${key}' must be an object with type definition`
      });
      continue;
    }

    const field = value as Record<string, unknown>;

    if (!field.type) {
      errors.push({
        path: `state.${key}.type`,
        code: 'REQUIRED_FIELD_MISSING',
        message: `State field '${key}' must have a type`
      });
    } else if (!VALID_STATE_TYPES.includes(field.type as StateValueType)) {
      errors.push({
        path: `state.${key}.type`,
        code: 'INVALID_STATE_TYPE',
        message: `State type '${field.type}' is not valid. Must be one of: ${VALID_STATE_TYPES.join(', ')}`
      });
    }

    // Warning for missing default value
    if (field.default === undefined) {
      warnings.push({
        path: `state.${key}.default`,
        code: 'MISSING_DEFAULT_VALUE',
        message: `State field '${key}' has no default value`,
        suggestion: 'Consider adding a default value to ensure consistent initial state'
      });
    }
  }
}

function validateEvents(
  events: Record<string, unknown>,
  actions: Record<string, unknown> | undefined,
  errors: SpecValidationError[],
  warnings: SpecValidationWarning[]
): void {
  if (!events.triggers || typeof events.triggers !== 'object') {
    errors.push({
      path: 'events.triggers',
      code: 'REQUIRED_FIELD_MISSING',
      message: 'Events triggers object is required'
    });
    return;
  }

  const triggers = events.triggers as Record<string, unknown>;
  const actionKeys = actions ? Object.keys(actions) : [];

  for (const [trigger, actionList] of Object.entries(triggers)) {
    // Check if trigger is valid
    if (!VALID_EVENT_TRIGGERS.includes(trigger as EventTrigger)) {
      warnings.push({
        path: `events.triggers.${trigger}`,
        code: 'UNKNOWN_EVENT_TRIGGER',
        message: `Event trigger '${trigger}' is not a standard trigger`,
        suggestion: `Valid triggers: ${VALID_EVENT_TRIGGERS.slice(0, 5).join(', ')}, ...`
      });
    }

    // Check if actions exist
    if (Array.isArray(actionList)) {
      for (const action of actionList) {
        if (typeof action === 'string' && actions && !actionKeys.includes(action)) {
          errors.push({
            path: `events.triggers.${trigger}`,
            code: 'ACTION_NOT_FOUND',
            message: `Action '${action}' referenced in trigger '${trigger}' is not defined in actions`
          });
        }
      }
    }
  }

  // Validate subscriptions reference existing handlers
  if (events.subscriptions && Array.isArray(events.subscriptions)) {
    (events.subscriptions as Array<Record<string, unknown>>).forEach((sub, idx) => {
      if (sub.handler && typeof sub.handler === 'string' && actions && !actionKeys.includes(sub.handler)) {
        errors.push({
          path: `events.subscriptions[${idx}].handler`,
          code: 'HANDLER_NOT_FOUND',
          message: `Handler '${sub.handler}' is not defined in actions`
        });
      }
    });
  }
}

function validateActions(
  actions: Record<string, unknown>,
  state: Record<string, unknown> | undefined,
  errors: SpecValidationError[],
  warnings: SpecValidationWarning[]
): void {
  const stateKeys = state ? Object.keys(state) : [];
  const actionKeys = Object.keys(actions);

  for (const [actionId, actionDef] of Object.entries(actions)) {
    if (!actionDef || typeof actionDef !== 'object') {
      errors.push({
        path: `actions.${actionId}`,
        code: 'INVALID_ACTION',
        message: `Action '${actionId}' must be an object`
      });
      continue;
    }

    const action = actionDef as Record<string, unknown>;

    if (!action.type) {
      errors.push({
        path: `actions.${actionId}.type`,
        code: 'REQUIRED_FIELD_MISSING',
        message: `Action '${actionId}' must have a type`
      });
    } else if (!VALID_ACTION_TYPES.includes(action.type as ActionType)) {
      errors.push({
        path: `actions.${actionId}.type`,
        code: 'INVALID_ACTION_TYPE',
        message: `Action type '${action.type}' is not valid. Must be one of: ${VALID_ACTION_TYPES.join(', ')}`
      });
    }

    // Validate state references in action params
    const params = action.params as Record<string, unknown> | undefined;
    if (params) {
      if (params.stateKey && typeof params.stateKey === 'string' && state && !stateKeys.includes(params.stateKey)) {
        errors.push({
          path: `actions.${actionId}.params.stateKey`,
          code: 'STATE_KEY_NOT_FOUND',
          message: `State key '${params.stateKey}' referenced in action '${actionId}' is not defined in state`
        });
      }

      if (params.toggleKey && typeof params.toggleKey === 'string' && state && !stateKeys.includes(params.toggleKey)) {
        errors.push({
          path: `actions.${actionId}.params.toggleKey`,
          code: 'STATE_KEY_NOT_FOUND',
          message: `Toggle key '${params.toggleKey}' referenced in action '${actionId}' is not defined in state`
        });
      }

      // Validate sequence/parallel actions reference existing actions
      if (params.actions && Array.isArray(params.actions)) {
        for (const refAction of params.actions) {
          if (typeof refAction === 'string' && !actionKeys.includes(refAction)) {
            errors.push({
              path: `actions.${actionId}.params.actions`,
              code: 'ACTION_NOT_FOUND',
              message: `Action '${refAction}' referenced in '${actionId}' is not defined`
            });
          }
        }
      }
    }

    // Warning for missing description
    if (!action.description) {
      warnings.push({
        path: `actions.${actionId}.description`,
        code: 'MISSING_DESCRIPTION',
        message: `Action '${actionId}' has no description`,
        suggestion: 'Add a description to help users understand what this action does'
      });
    }
  }
}

function validateAPI(api: Record<string, unknown>, errors: SpecValidationError[], warnings: SpecValidationWarning[]): void {
  const requiredArrays = ['exposes', 'accepts', 'inputs', 'outputs'];

  for (const field of requiredArrays) {
    if (!Array.isArray(api[field])) {
      errors.push({
        path: `api.${field}`,
        code: 'REQUIRED_FIELD_MISSING',
        message: `API ${field} must be an array`
      });
    }
  }

  // Validate port IDs are unique
  const allPortIds = new Set<string>();

  const checkPorts = (ports: unknown[], type: string) => {
    if (!Array.isArray(ports)) return;

    ports.forEach((port, idx) => {
      const p = port as Record<string, unknown>;
      if (p.id && typeof p.id === 'string') {
        if (allPortIds.has(p.id)) {
          errors.push({
            path: `api.${type}[${idx}].id`,
            code: 'DUPLICATE_PORT_ID',
            message: `Port ID '${p.id}' is already used`
          });
        }
        allPortIds.add(p.id);
      }
    });
  };

  checkPorts(api.inputs as unknown[], 'inputs');
  checkPorts(api.outputs as unknown[], 'outputs');

  // Warning if no inputs/outputs defined
  if (Array.isArray(api.inputs) && api.inputs.length === 0 &&
      Array.isArray(api.outputs) && api.outputs.length === 0) {
    warnings.push({
      path: 'api',
      code: 'NO_IO_PORTS',
      message: 'Widget has no input or output ports',
      suggestion: 'Consider adding ports to enable pipeline connectivity'
    });
  }
}

function validatePermissions(permissions: Record<string, unknown>, errors: SpecValidationError[], warnings: SpecValidationWarning[]): void {
  const requiredBooleans = ['allowPipelineUse', 'allowForking', 'allowMarketplace'];

  for (const field of requiredBooleans) {
    if (typeof permissions[field] !== 'boolean') {
      errors.push({
        path: `permissions.${field}`,
        code: 'REQUIRED_FIELD_MISSING',
        message: `Permission '${field}' must be a boolean`
      });
    }
  }

  // Validate revenue share
  if (permissions.revenueShare && typeof permissions.revenueShare === 'object') {
    const share = permissions.revenueShare as Record<string, unknown>;
    const creator = share.creator as number;
    const platform = share.platform as number;
    const referrer = share.referrer as number | undefined;

    if (typeof creator !== 'number' || creator < 0 || creator > 1) {
      errors.push({
        path: 'permissions.revenueShare.creator',
        code: 'INVALID_REVENUE_SHARE',
        message: 'Creator revenue share must be a number between 0 and 1'
      });
    }

    if (typeof platform !== 'number' || platform < 0 || platform > 1) {
      errors.push({
        path: 'permissions.revenueShare.platform',
        code: 'INVALID_REVENUE_SHARE',
        message: 'Platform revenue share must be a number between 0 and 1'
      });
    }

    const total = (creator || 0) + (platform || 0) + (referrer || 0);
    if (total > 1.001) { // Allow small floating point errors
      errors.push({
        path: 'permissions.revenueShare',
        code: 'REVENUE_SHARE_EXCEEDS_100',
        message: `Total revenue share (${(total * 100).toFixed(1)}%) exceeds 100%`
      });
    }
  }

  // Warning for marketplace without revenue share
  if (permissions.allowMarketplace && !permissions.revenueShare) {
    warnings.push({
      path: 'permissions.revenueShare',
      code: 'MISSING_REVENUE_SHARE',
      message: 'Marketplace enabled but no revenue share configured',
      suggestion: 'Add revenue share configuration for marketplace listing'
    });
  }
}

function validateSize(size: Record<string, unknown>, errors: SpecValidationError[], warnings: SpecValidationWarning[]): void {
  if (typeof size.width !== 'number' || size.width < 1) {
    errors.push({
      path: 'size.width',
      code: 'INVALID_SIZE',
      message: 'Width must be a positive number'
    });
  }

  if (typeof size.height !== 'number' || size.height < 1) {
    errors.push({
      path: 'size.height',
      code: 'INVALID_SIZE',
      message: 'Height must be a positive number'
    });
  }

  // Validate min/max constraints
  if (size.minWidth && size.maxWidth &&
      typeof size.minWidth === 'number' && typeof size.maxWidth === 'number' &&
      size.minWidth > size.maxWidth) {
    errors.push({
      path: 'size',
      code: 'INVALID_SIZE_CONSTRAINTS',
      message: 'minWidth cannot be greater than maxWidth'
    });
  }

  if (size.minHeight && size.maxHeight &&
      typeof size.minHeight === 'number' && typeof size.maxHeight === 'number' &&
      size.minHeight > size.maxHeight) {
    errors.push({
      path: 'size',
      code: 'INVALID_SIZE_CONSTRAINTS',
      message: 'minHeight cannot be greater than maxHeight'
    });
  }

  // Warning for very large widgets
  if ((size.width as number) > 2000 || (size.height as number) > 2000) {
    warnings.push({
      path: 'size',
      code: 'LARGE_WIDGET',
      message: 'Widget dimensions exceed 2000px',
      suggestion: 'Consider if such large dimensions are necessary for the widget'
    });
  }
}

function validateTags(tags: unknown[], errors: SpecValidationError[], warnings: SpecValidationWarning[]): void {
  if (tags.length > 10) {
    errors.push({
      path: 'tags',
      code: 'TOO_MANY_TAGS',
      message: 'Maximum of 10 tags allowed'
    });
  }

  const tagPattern = /^[a-z0-9-]+$/;
  const seenTags = new Set<string>();

  tags.forEach((tag, idx) => {
    if (typeof tag !== 'string') {
      errors.push({
        path: `tags[${idx}]`,
        code: 'INVALID_TAG',
        message: 'Tag must be a string'
      });
      return;
    }

    if (!tagPattern.test(tag)) {
      errors.push({
        path: `tags[${idx}]`,
        code: 'INVALID_TAG_FORMAT',
        message: `Tag '${tag}' must be lowercase letters, numbers, and hyphens only`
      });
    }

    if (tag.length > 32) {
      errors.push({
        path: `tags[${idx}]`,
        code: 'TAG_TOO_LONG',
        message: `Tag '${tag}' exceeds maximum length of 32 characters`
      });
    }

    if (seenTags.has(tag)) {
      warnings.push({
        path: `tags[${idx}]`,
        code: 'DUPLICATE_TAG',
        message: `Tag '${tag}' is duplicated`,
        suggestion: 'Remove duplicate tags'
      });
    }
    seenTags.add(tag);
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format validation result for display
 */
export function formatValidationResult(result: SpecValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('✓ SpecJSON validation passed');
  } else {
    lines.push('✗ SpecJSON validation failed');
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push(`Errors (${result.errors.length}):`);
    for (const error of result.errors) {
      lines.push(`  • [${error.code}] ${error.path}: ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push(`Warnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      let line = `  ⚠ [${warning.code}] ${warning.path}: ${warning.message}`;
      if (warning.suggestion) {
        line += ` (${warning.suggestion})`;
      }
      lines.push(line);
    }
  }

  return lines.join('\n');
}

/**
 * Quick validation - returns true/false only
 */
export function isValidSpecJSON(spec: unknown): spec is SpecJSON {
  return validateSpecJSON(spec).valid;
}

/**
 * Validates a workspace manifest
 */
export function validateWorkspaceManifest(workspace: unknown): SpecValidationResult {
  const errors: SpecValidationError[] = [];
  const warnings: SpecValidationWarning[] = [];

  if (!workspace || typeof workspace !== 'object') {
    errors.push({
      path: '',
      code: 'INVALID_ROOT',
      message: 'WorkspaceManifest must be a non-null object'
    });
    return { valid: false, errors, warnings };
  }

  const w = workspace as Record<string, unknown>;

  // Required fields
  if (!w.id || typeof w.id !== 'string') {
    errors.push({ path: 'id', code: 'REQUIRED_FIELD_MISSING', message: 'Workspace ID is required' });
  }

  if (!w.name || typeof w.name !== 'string') {
    errors.push({ path: 'name', code: 'REQUIRED_FIELD_MISSING', message: 'Workspace name is required' });
  }

  if (!w.widgets || !Array.isArray(w.widgets)) {
    errors.push({ path: 'widgets', code: 'REQUIRED_FIELD_MISSING', message: 'Widgets array is required' });
  } else {
    // Validate each widget entry
    const seenIds = new Set<string>();
    const seenFolders = new Set<string>();

    (w.widgets as Array<Record<string, unknown>>).forEach((entry, idx) => {
      if (!entry.spec || typeof entry.spec !== 'object') {
        errors.push({
          path: `widgets[${idx}].spec`,
          code: 'INVALID_WIDGET_ENTRY',
          message: 'Widget entry must have a spec'
        });
      } else {
        // Validate the spec itself
        const specResult = validateSpecJSON(entry.spec);
        for (const error of specResult.errors) {
          errors.push({
            ...error,
            path: `widgets[${idx}].spec.${error.path}`
          });
        }
        for (const warning of specResult.warnings) {
          warnings.push({
            ...warning,
            path: `widgets[${idx}].spec.${warning.path}`
          });
        }

        // Check for duplicate IDs
        const specId = (entry.spec as Record<string, unknown>).id as string;
        if (specId && seenIds.has(specId)) {
          errors.push({
            path: `widgets[${idx}].spec.id`,
            code: 'DUPLICATE_WIDGET_ID',
            message: `Widget ID '${specId}' is already used in this workspace`
          });
        }
        seenIds.add(specId);
      }

      // Check folder names
      if (!entry.folderName || typeof entry.folderName !== 'string') {
        errors.push({
          path: `widgets[${idx}].folderName`,
          code: 'REQUIRED_FIELD_MISSING',
          message: 'Widget folder name is required'
        });
      } else {
        if (seenFolders.has(entry.folderName as string)) {
          errors.push({
            path: `widgets[${idx}].folderName`,
            code: 'DUPLICATE_FOLDER_NAME',
            message: `Folder name '${entry.folderName}' is already used`
          });
        }
        seenFolders.add(entry.folderName as string);
      }
    });

    // Max 5 widgets per workspace
    if ((w.widgets as unknown[]).length > 5) {
      errors.push({
        path: 'widgets',
        code: 'TOO_MANY_WIDGETS',
        message: 'Maximum of 5 widgets per workspace'
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
