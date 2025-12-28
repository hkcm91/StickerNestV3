# Testing Strategy Plan

> Improve test coverage and testing infrastructure

---

## CURRENT TEST COVERAGE

### Existing Tests Found
| Test File | Location | Type |
|-----------|----------|------|
| manifestValidator.test.ts | src/utils/ | Unit |
| CapabilityChecker.test.ts | src/utils/ | Unit |
| CanvasRouter.test.ts | src/runtime/ | Unit |
| canvas.service.test.ts | server/tests/ | Integration |
| widget-generator-v2.test.ts | src/services/ | Unit |
| widget-integration.spec.ts | tests/ | E2E |
| widget-connections.spec.ts | tests/ | E2E |
| social-widgets.spec.ts | tests/ | E2E |
| usePanelsStore.test.ts | src/state/ | Unit |
| useMarketplaceStore.test.ts | src/state/ | Unit |

### Coverage Gaps
- **Canvas interactions**: NO TESTS
- **Gesture handling**: NO TESTS
- **Widget drag/resize**: NO TESTS
- **Undo/redo system**: NO TESTS
- **Most stores**: NO TESTS
- **Most components**: NO TESTS

---

## PRIORITY 1: CRITICAL PATH TESTING

### 1.1 Canvas Interaction E2E Tests
**Goal**: Test core canvas operations

**Test File**: `tests/canvas-interactions.spec.ts`

**Subtasks:**
- [ ] 1.1.1: Set up Playwright canvas test fixtures
- [ ] 1.1.2: Test widget selection
  - [ ] Single click selection
  - [ ] Ctrl/Cmd+click multi-select
  - [ ] Box selection
  - [ ] Click-away deselection
- [ ] 1.1.3: Test widget drag
  - [ ] Drag single widget
  - [ ] Drag multi-selection
  - [ ] Grid snapping
  - [ ] Bounds constraints
- [ ] 1.1.4: Test widget resize
  - [ ] Corner resize
  - [ ] Edge resize
  - [ ] Maintain aspect ratio (Shift)
  - [ ] Resize from center (Alt)
- [ ] 1.1.5: Test widget rotate
  - [ ] 90° rotation
  - [ ] Flip horizontal
  - [ ] Flip vertical
- [ ] 1.1.6: Test undo/redo
  - [ ] Undo move
  - [ ] Undo resize
  - [ ] Redo operations
  - [ ] Undo stack limits

---

### 1.2 Gesture E2E Tests
**Goal**: Test pan/zoom interactions

**Test File**: `tests/canvas-gestures.spec.ts`

**Subtasks:**
- [ ] 1.2.1: Test wheel zoom
  - [ ] Zoom in
  - [ ] Zoom out
  - [ ] Zoom to cursor position
  - [ ] Zoom limits
- [ ] 1.2.2: Test pan
  - [ ] Middle mouse drag
  - [ ] Shift+wheel horizontal pan
  - [ ] Touch two-finger pan
- [ ] 1.2.3: Test touch gestures
  - [ ] Pinch zoom
  - [ ] Two-finger pan
  - [ ] Double-tap zoom
- [ ] 1.2.4: Test momentum
  - [ ] Pan momentum
  - [ ] Momentum decay

---

### 1.3 Widget Runtime Tests
**Goal**: Test widget sandboxing

**Test File**: `tests/widget-runtime.spec.ts`

**Subtasks:**
- [ ] 1.3.1: Test widget loading
  - [ ] Load built-in widget
  - [ ] Load custom widget
  - [ ] Handle load errors
- [ ] 1.3.2: Test widget communication
  - [ ] Widget API calls
  - [ ] Event emission
  - [ ] State persistence
- [ ] 1.3.3: Test widget lifecycle
  - [ ] Mount
  - [ ] Activate/deactivate
  - [ ] Unmount
  - [ ] Cleanup

---

## PRIORITY 2: UNIT TESTS

### 2.1 Store Unit Tests
**Goal**: Test all Zustand stores

**Subtasks:**
- [ ] 2.1.1: Test useCanvasStore
  - [ ] Widget CRUD
  - [ ] Selection state
  - [ ] Viewport state
- [ ] 2.1.2: Test useSelectionStore
  - [ ] Add to selection
  - [ ] Remove from selection
  - [ ] Clear selection
- [ ] 2.1.3: Test useLayerStore
  - [ ] Create layer
  - [ ] Reorder layers
  - [ ] Delete layer
- [ ] 2.1.4: Test useLibraryStore
  - [ ] Load library
  - [ ] Filter/search
  - [ ] Category management
- [ ] 2.1.5: Test remaining stores

---

### 2.2 Utility Unit Tests
**Goal**: Test utility functions

**Subtasks:**
- [ ] 2.2.1: Test CoordinateService
  - [ ] screenToCanvas at zoom 1
  - [ ] screenToCanvas at zoom 0.5
  - [ ] screenToCanvas at zoom 2
  - [ ] screenDeltaToCanvas
- [ ] 2.2.2: Test ID generator
- [ ] 2.2.3: Test serialization utilities
- [ ] 2.2.4: Test validation utilities

---

### 2.3 Hook Unit Tests
**Goal**: Test custom hooks

**Test Setup**:
```typescript
// Use @testing-library/react-hooks
import { renderHook, act } from '@testing-library/react-hooks';

describe('useCanvasNavigation', () => {
  it('should fit canvas to view', () => {
    const { result } = renderHook(() => useCanvasNavigation());
    act(() => {
      result.current.fitToView();
    });
    // Assert viewport changed
  });
});
```

**Subtasks:**
- [ ] 2.3.1: Test useCanvasNavigation
- [ ] 2.3.2: Test useClickOutside
- [ ] 2.3.3: Test useAsync
- [ ] 2.3.4: Test useWindowMouseEvents
- [ ] 2.3.5: Test remaining hooks

---

## PRIORITY 3: COMPONENT TESTS

### 3.1 Component Testing Setup
**Goal**: Configure component testing

**Subtasks:**
- [ ] 3.1.1: Set up Vitest with React Testing Library
- [ ] 3.1.2: Create test utilities
  ```typescript
  // src/test/utils.tsx
  export const renderWithProviders = (ui: ReactElement) => {
    return render(
      <ThemeProvider>
        <AuthProvider>
          {ui}
        </AuthProvider>
      </ThemeProvider>
    );
  };
  ```
- [ ] 3.1.3: Create mock providers
- [ ] 3.1.4: Create mock stores

---

### 3.2 Critical Component Tests
**Goal**: Test key components

**Subtasks:**
- [ ] 3.2.1: Test WidgetWrapper
  - [ ] Renders widget
  - [ ] Handles selection
  - [ ] Handles drag start
- [ ] 3.2.2: Test StickerFrame
  - [ ] Renders sticker
  - [ ] Click behavior
  - [ ] Resize handles
- [ ] 3.2.3: Test ContextMenu variants
  - [ ] Opens on right-click
  - [ ] Closes on click outside
  - [ ] Executes actions

---

## PRIORITY 4: API TESTS

### 4.1 API Client Tests
**Goal**: Test API service layer

**Subtasks:**
- [ ] 4.1.1: Set up MSW for API mocking
- [ ] 4.1.2: Test auth API
  - [ ] Login
  - [ ] Logout
  - [ ] Token refresh
- [ ] 4.1.3: Test canvas API
  - [ ] Create canvas
  - [ ] Load canvas
  - [ ] Save canvas
- [ ] 4.1.4: Test widget API
  - [ ] Load widgets
  - [ ] Save widget
  - [ ] Delete widget

---

### 4.2 Server API Tests
**Goal**: Test backend endpoints

**Subtasks:**
- [ ] 4.2.1: Test auth endpoints
- [ ] 4.2.2: Test canvas endpoints
- [ ] 4.2.3: Test widget endpoints
- [ ] 4.2.4: Test marketplace endpoints

---

## PRIORITY 5: TEST INFRASTRUCTURE

### 5.1 CI/CD Integration
**Goal**: Automated test runs

**Subtasks:**
- [ ] 5.1.1: Add test job to CI pipeline
- [ ] 5.1.2: Set up test reporting
- [ ] 5.1.3: Add coverage reporting
- [ ] 5.1.4: Set coverage thresholds
- [ ] 5.1.5: Add status badges

---

### 5.2 Test Performance
**Goal**: Fast test runs

**Subtasks:**
- [ ] 5.2.1: Configure test parallelization
- [ ] 5.2.2: Add test caching
- [ ] 5.2.3: Optimize slow tests
- [ ] 5.2.4: Target < 60s total test time

---

### 5.3 Visual Regression Testing
**Goal**: Catch UI regressions

**Subtasks:**
- [ ] 5.3.1: Set up Playwright visual comparisons
- [ ] 5.3.2: Add visual tests for key pages
- [ ] 5.3.3: Add visual tests for components
- [ ] 5.3.4: Set up snapshot review process

---

## TEST PATTERNS

### Unit Test Pattern
```typescript
// filename.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { functionToTest } from './filename';

describe('functionToTest', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do expected behavior', () => {
    const result = functionToTest(input);
    expect(result).toBe(expected);
  });

  it('should handle edge case', () => {
    const result = functionToTest(edgeInput);
    expect(result).toBe(edgeExpected);
  });
});
```

### E2E Test Pattern
```typescript
// filename.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor');
  });

  test('should perform action', async ({ page }) => {
    await page.click('[data-testid="button"]');
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Store Test Pattern
```typescript
// useStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState(initialState);
  });

  it('should update state', () => {
    const { action } = useStore.getState();
    action(payload);
    expect(useStore.getState().value).toBe(expected);
  });
});
```

---

## COVERAGE TARGETS

### Phase 1 Targets
| Area | Current | Target |
|------|---------|--------|
| Canvas interactions | 0% | 80% |
| Gesture handling | 0% | 80% |
| Widget runtime | ~20% | 60% |

### Phase 2 Targets
| Area | Current | Target |
|------|---------|--------|
| Stores | ~10% | 60% |
| Utilities | ~20% | 80% |
| Hooks | 0% | 60% |

### Phase 3 Targets
| Area | Current | Target |
|------|---------|--------|
| Components | 0% | 40% |
| API clients | 0% | 60% |
| Overall | ~5% | 50% |

---

## COMPLETION CHECKLIST

After testing improvements:
- [ ] Canvas interaction tests pass
- [ ] Gesture tests pass
- [ ] Widget runtime tests pass
- [ ] All store tests pass
- [ ] All utility tests pass
- [ ] All hook tests pass
- [ ] Component tests for critical paths
- [ ] API tests with mocking
- [ ] CI/CD runs all tests
- [ ] Coverage reporting enabled
- [ ] Coverage targets met
