# StickerNest V2 - Master Refactoring Plan

> **Created**: December 2024
> **Goal**: Clean up codebase without breaking existing functionality
> **Priority**: Performance, maintainability, completing half-built features

---

## CODEBASE STATISTICS

| Metric | Value |
|--------|-------|
| Total Files | 597 |
| Total Lines | 515,566 |
| Files Over 200 Lines | 455 (76%) |
| Files Over 1000 Lines | 95 (16%) |
| Zustand Stores | 32 |
| Built-in Widgets | 50+ |
| Incomplete Features | 40+ |

---

## PLAN DOCUMENTS

| Document | Description | Priority |
|----------|-------------|----------|
| [STABLE_CODE_DO_NOT_TOUCH.md](./STABLE_CODE_DO_NOT_TOUCH.md) | Protected code list | READ FIRST |
| [01-LARGE_FILE_REFACTORING.md](./01-LARGE_FILE_REFACTORING.md) | Breaking up mega-files | HIGH |
| [02-DUPLICATE_CODE_CLEANUP.md](./02-DUPLICATE_CODE_CLEANUP.md) | Removing duplicates | HIGH |
| [03-INCOMPLETE_FEATURES.md](./03-INCOMPLETE_FEATURES.md) | Finishing half-built features | MEDIUM |
| [04-STATE_MANAGEMENT.md](./04-STATE_MANAGEMENT.md) | Store optimization | HIGH |
| [05-PERFORMANCE_IMPROVEMENTS.md](./05-PERFORMANCE_IMPROVEMENTS.md) | Performance fixes | MEDIUM |
| [06-WIDGET_SYSTEM.md](./06-WIDGET_SYSTEM.md) | Widget cleanup | MEDIUM |
| [07-TESTING_STRATEGY.md](./07-TESTING_STRATEGY.md) | Test coverage | LOW |

---

## EXECUTION ORDER

### Phase 1: Foundation (Week 1)
Focus on stability and safety.

1. **Read STABLE_CODE_DO_NOT_TOUCH.md** - Understand protected areas
2. **Duplicate code cleanup** - Low risk, high impact
3. **Remove V1 widgets** - Clean up old versions

### Phase 2: Large File Refactoring (Week 1-2)
Break up mega-components.

1. **WidgetLab.tsx** (3,105 lines) → 5-7 components
2. **SettingsPage.tsx** (2,446 lines) → Settings sections
3. **apiClient.ts** (2,059 lines) → Domain clients

### Phase 3: State Management (Week 2)
Fix store architecture.

1. **Deduplicate selection state** across 3 stores
2. **Split useCanvasStore** (1,403 lines) into focused stores
3. **Standardize serialization** patterns

### Phase 4: Incomplete Features (Week 2-3)
Complete half-built functionality.

1. **Database persistence** for runtime
2. **Feed system** completion
3. **Social features** (block/unblock)

### Phase 5: Performance (Ongoing)
Optimize as you go.

1. Add `useShallow` to selectors
2. Implement persistence batching
3. Profile and fix hot paths

---

## CRITICAL RULES

### DO NOT:
- Touch files in STABLE_CODE_DO_NOT_TOUCH.md
- Refactor while adding features
- Change domain type shapes
- Modify coordinate/gesture systems
- Add features during refactoring

### DO:
- Test interactions after every change
- Keep commits small and focused
- Update tests with refactors
- Document breaking changes
- Verify mobile still works

---

## RISK ASSESSMENT

### HIGH RISK (Requires full testing):
- Any canvas interaction code
- Coordinate transformations
- Gesture handling
- Undo/redo system
- Widget runtime

### MEDIUM RISK (Test affected areas):
- State management changes
- Large component splits
- Service refactoring

### LOW RISK (Standard testing):
- Duplicate removal
- UI component cleanup
- Utility consolidation
- New feature additions

---

## SUCCESS METRICS

After refactoring:

- [ ] No files over 800 lines (except data files)
- [ ] No duplicate code patterns
- [ ] All V1 widgets removed
- [ ] Selection state in single store
- [ ] All incomplete features documented with status
- [ ] E2E tests pass
- [ ] Mobile interactions work
- [ ] No performance regressions

---

## PROGRESS TRACKING

Update this section as work progresses:

### Completed
- [x] Initial audit completed
- [x] Plan documents created
- [x] Stable code documented

### In Progress
- [ ] Phase 1: Foundation

### Not Started
- [ ] Phase 2: Large file refactoring
- [ ] Phase 3: State management
- [ ] Phase 4: Incomplete features
- [ ] Phase 5: Performance
