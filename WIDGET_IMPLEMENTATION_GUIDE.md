# Widget Implementation Guide

**Purpose:** Detailed notes for developers upgrading or rebuilding each widget
**Companion to:** WIDGET_AUDIT_REPORT.md

---

## Table of Contents

1. [Tier S Widgets - Minor Upgrades](#tier-s-widgets---minor-upgrades)
2. [Tier A Widgets - Feature Enhancements](#tier-a-widgets---feature-enhancements)
3. [Tier B Widgets - Significant Rewrites](#tier-b-widgets---significant-rewrites)
4. [Tier C Widgets - Rebuild from Scratch](#tier-c-widgets---rebuild-from-scratch)
5. [Built-in Widgets - Core Improvements](#built-in-widgets---core-improvements)
6. [Common Patterns to Apply](#common-patterns-to-apply)
7. [Testing Checklist](#testing-checklist)

---

## Tier S Widgets - Minor Upgrades

### 1. slideshow-widget (Score: 95)

**Location:** `public/test-widgets/slideshow-widget/index.html`
**Lines of Code:** ~1037

#### Current Strengths
- Multiple transition types (fade, slide, zoom, blur)
- Ken Burns effect support
- Keyboard navigation (arrows, space, s, l, k, f)
- Progress bar with real-time updates
- Thumbnail strip navigation
- Fullscreen support
- Speed control slider
- Shuffle and loop modes

#### Specific Improvements Needed

**1. Add Touch/Swipe Support**
```javascript
// Add at line ~935 after keyboard controls
let touchStartX = 0;
let touchEndX = 0;

slideshowContainer.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

slideshowContainer.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  const diff = touchStartX - touchEndX;
  if (Math.abs(diff) > 50) {
    diff > 0 ? nextSlide() : prevSlide();
  }
});
```

**2. Add Image Preloading**
```javascript
function preloadImages() {
  images.forEach((img, idx) => {
    if (idx <= currentIndex + 2 || idx >= images.length - 1) {
      const preload = new Image();
      preload.src = img.url;
    }
  });
}
```

**3. Add Lazy Loading for Thumbnails**
- Change thumbnail img to have `loading="lazy"`
- Add intersection observer for off-screen thumbnails

**4. Accessibility Improvements**
- Add `role="region"` and `aria-label="Slideshow"` to container
- Add `aria-live="polite"` for slide changes
- Add `aria-current="true"` for active thumbnail

**Estimated Effort:** 2-3 hours

---

### 2. gradient-maker (Score: 93)

**Location:** `public/test-widgets/gradient-maker/index.html`
**Lines of Code:** ~908

#### Current Strengths
- Linear, radial, and conic gradient support
- Interactive angle wheel
- Color stop management with position sliders
- 12 preset gradients
- CSS export with copy button
- Canvas broadcast integration
- Brand color sync

#### Specific Improvements Needed

**1. Add Undo/Redo History**
```javascript
const history = [];
let historyIndex = -1;
const MAX_HISTORY = 20;

function saveToHistory() {
  history.splice(historyIndex + 1);
  history.push(JSON.parse(JSON.stringify(state)));
  if (history.length > MAX_HISTORY) history.shift();
  historyIndex = history.length - 1;
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    state = JSON.parse(JSON.stringify(history[historyIndex]));
    renderStops();
    updatePreview();
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    state = JSON.parse(JSON.stringify(history[historyIndex]));
    renderStops();
    updatePreview();
  }
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
  if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
});
```

**2. Save Custom Presets**
```javascript
function saveCustomPreset(name) {
  const customPresets = JSON.parse(localStorage.getItem('gradient-presets') || '[]');
  customPresets.push({ name, stops: [...state.stops], type: state.type, angle: state.angle });
  localStorage.setItem('gradient-presets', JSON.stringify(customPresets));
  renderPresets();
}
```

**3. Increase Stop Limit**
- Change max stops from 8 to 12
- Add warning when approaching limit

**4. Add Gradient Direction Preview**
- Show arrow/indicator in preview area showing gradient direction

**Estimated Effort:** 2-3 hours

---

### 3. image-editor (Score: 92)

**Location:** `public/test-widgets/image-editor/index.html`
**Lines of Code:** ~563

#### Current Strengths
- Brightness, contrast, saturation, blur, hue controls
- Preset filters (grayscale, sepia, vivid, cool, warm, vintage)
- Drag-and-drop image loading
- Export to PNG/JPG
- Clean StickerNest theme
- Real-time preview

#### Specific Improvements Needed

**1. Add Crop/Rotate Functionality**
```javascript
let cropMode = false;
let rotation = 0;

function rotate(degrees) {
  rotation = (rotation + degrees) % 360;
  canvas.style.transform = `rotate(${rotation}deg)`;
  emit('image.rotated', { rotation });
}

function enableCrop() {
  cropMode = true;
  // Add crop overlay UI
  const cropOverlay = document.createElement('div');
  cropOverlay.className = 'crop-overlay';
  cropOverlay.innerHTML = `
    <div class="crop-handles">
      <div class="crop-handle nw"></div>
      <div class="crop-handle ne"></div>
      <div class="crop-handle sw"></div>
      <div class="crop-handle se"></div>
    </div>
  `;
  canvasArea.appendChild(cropOverlay);
}
```

**2. Add Flip Horizontal/Vertical**
```javascript
let flipH = false;
let flipV = false;

function flipHorizontal() {
  flipH = !flipH;
  canvas.style.transform = `scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;
}
```

**3. Add Filter Intensity Sliders Per Preset**
- Allow adjusting intensity of presets (0-100%)
- Interpolate between original and preset values

**4. Add Image History/Compare**
- Before/after comparison slider
- History panel showing previous states

**5. Add Toolbar Icons**
- Replace text buttons with icons
- Add tooltips

**Estimated Effort:** 4-5 hours

---

### 4. folder-widget (Score: 91)

**Location:** `public/test-widgets/folder-widget/index.html`
**Lines of Code:** ~807

#### Current Strengths
- Desktop folder metaphor with open/closed states
- 8 color options
- Drag-drop file support
- Context menu with options
- Keyboard shortcuts (F2, Enter, Escape, Delete)
- Item grid view when open

#### Specific Improvements Needed

**1. Replace prompt() with Inline Editing**
```javascript
function startInlineRename() {
  const nameEl = state.isOpen ? document.getElementById('headerName') : document.getElementById('folderName');
  nameEl.contentEditable = true;
  nameEl.classList.add('editing');
  nameEl.focus();

  // Select all text
  const range = document.createRange();
  range.selectNodeContents(nameEl);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);

  nameEl.onblur = finishRename;
  nameEl.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
    if (e.key === 'Escape') { nameEl.textContent = state.name; nameEl.blur(); }
  };
}
```

**2. Add Nested Folder Support**
```javascript
// Add type: 'folder' to items
function addNestedFolder() {
  const folder = {
    id: generateId(),
    type: 'folder',
    name: 'New Folder',
    color: 'yellow',
    items: [],
    createdAt: Date.now()
  };
  state.items.push(folder);
  saveState();
  renderItems();
}
```

**3. Add Search/Filter**
```javascript
function filterItems(query) {
  const filtered = state.items.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );
  renderItems(filtered);
}
```

**4. Add List View Toggle**
- Grid view (current) vs list view option
- Remember preference in state

**5. Add File Preview**
- Hover preview for images
- Quick view modal

**Estimated Effort:** 3-4 hours

---

### 5. project-tracker (Score: 90)

**Location:** `public/test-widgets/project-tracker/index.html`
**Lines of Code:** ~464

#### Current Strengths
- Full task CRUD operations
- Priority levels (high, medium, low)
- Active/completed/all filtering
- Time tracking integration
- Notes count display
- Task selection for ecosystem widgets
- Ecosystem event broadcasting

#### Specific Improvements Needed

**1. Add State Persistence via WidgetAPI**
```javascript
function saveState() {
  if (window.WidgetAPI && window.WidgetAPI.setState) {
    window.WidgetAPI.setState({
      tasks: state.tasks,
      selectedTaskId: state.selectedTaskId,
      filter: state.filter
    });
  }
}

function loadState() {
  if (window.WidgetAPI && window.WidgetAPI.getState) {
    const saved = window.WidgetAPI.getState();
    if (saved) {
      state = { ...state, ...saved };
    }
  }
}
```

**2. Remove Sample Data on Init**
- Replace sample tasks with empty state
- Add "Add your first task" empty state

**3. Add Due Dates**
```javascript
// Add to task object
const task = {
  id: generateId(),
  title: title,
  completed: false,
  priority: priority,
  dueDate: null, // NEW
  createdAt: Date.now(),
  timeSpent: 0,
  notes: []
};

// Add date picker input
<input type="date" id="dueDateInput">
```

**4. Add Task Drag-to-Reorder**
```javascript
// Add sortablejs or implement basic drag
taskList.addEventListener('dragstart', handleDragStart);
taskList.addEventListener('dragover', handleDragOver);
taskList.addEventListener('drop', handleDrop);
```

**5. Add Task Categories/Tags**
- Multiple tags per task
- Filter by tag
- Color-coded tags

**Estimated Effort:** 4-5 hours

---

### 6. spotify-playlist-widget (Score: 88)

**Location:** `public/test-widgets/spotify-playlist-widget/index.html`
**Lines of Code:** ~1113

#### Current Strengths
- Multiple playlist management
- Spotify URL parsing (track, album, playlist, artist)
- oEmbed API integration for metadata
- Embedded Spotify player
- Shuffle mode
- LocalStorage persistence
- Toast notifications
- Pipeline input support

#### Specific Improvements Needed

**1. Add Drag-to-Reorder Tracks**
- Implement drag handles
- Visual feedback during drag

**2. Add Playlist Import from Spotify**
```javascript
async function importSpotifyPlaylist(playlistUrl) {
  const parsed = parseSpotifyUrl(playlistUrl);
  if (parsed.type !== 'playlist') return;

  // Note: Would need Spotify API access for full import
  // For now, add as single item
  addTrack(playlistUrl);
}
```

**3. Add Search Within Playlist**
```javascript
function searchTracks(query) {
  const playlist = getCurrentPlaylist();
  if (!playlist) return [];
  return playlist.tracks.filter(t =>
    t.title.toLowerCase().includes(query.toLowerCase()) ||
    t.artist.toLowerCase().includes(query.toLowerCase())
  );
}
```

**4. Add Keyboard Shortcuts**
- Space: play/pause
- N: next
- P: previous
- S: toggle shuffle

**5. Add Mini Player Mode**
- Collapsed view showing only current track and controls

**Estimated Effort:** 3-4 hours

---

### 7. youtube-playlist-widget (Score: 87)

**Location:** `public/test-widgets/youtube-playlist-widget/index.html`
**Lines of Code:** ~1131

#### Current Strengths
- YouTube IFrame API integration
- Progress bar with seek
- Volume control
- Shuffle mode
- Multiple playlist management
- Video thumbnail display
- noembed API for titles
- LocalStorage persistence

#### Specific Improvements Needed

**1. Add Playback Speed Control**
```javascript
function setPlaybackSpeed(rate) {
  if (player && playerReady) {
    player.setPlaybackRate(rate);
  }
}
// Add UI: 0.5x, 1x, 1.25x, 1.5x, 2x
```

**2. Add Picture-in-Picture**
```javascript
async function togglePiP() {
  const video = document.querySelector('iframe');
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
  } else {
    // Note: PiP for iframes requires special handling
  }
}
```

**3. Add Quality Selection**
- Show available quality options
- Remember preference

**4. Add Loop Single Video**
```javascript
let loopSingle = false;

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    if (loopSingle) {
      player.seekTo(0);
      player.playVideo();
    } else {
      playNext();
    }
  }
}
```

**5. Add Watch Later Queue**
- Separate queue from playlist
- "Play next" option

**Estimated Effort:** 3-4 hours

---

### 8. chat-room (Score: 87)

**Location:** `public/test-widgets/chat-room/index.html`
**Lines of Code:** ~531

#### Current Strengths
- Message display with sender avatars
- Typing indicators with animation
- Emoji picker
- Message reactions
- Auto-resize input
- System messages
- Canvas-scoped event broadcasting

#### Specific Improvements Needed

**1. Replace Simulated Users with Real Multi-Instance**
```javascript
// Use instanceId to identify unique chat instances
// Broadcast messages to all instances on canvas
function sendMessage() {
  const message = {
    id: Date.now().toString(),
    user: state.myUser,
    text: text,
    time: new Date(),
    instanceId: instanceId
  };

  emit('chat:message', { message, senderId: instanceId });
}
```

**2. Add Message Editing/Deletion**
```javascript
function editMessage(messageId) {
  const message = state.messages.find(m => m.id === messageId);
  if (message && message.user.id === state.myUser.id) {
    // Enable edit mode
    message.editing = true;
    renderMessages();
  }
}
```

**3. Add Message Threading/Replies**
- Reply to specific message
- Thread view

**4. Add Image/File Sharing**
```javascript
function handleFileUpload(file) {
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const message = {
        type: 'image',
        dataUrl: e.target.result,
        fileName: file.name
      };
      addMessage(message);
    };
    reader.readAsDataURL(file);
  }
}
```

**5. Add Sound Notifications**
- Optional notification sound for new messages
- Mute toggle

**Estimated Effort:** 4-5 hours

---

### 9. vector-editor (Score: 86)

**Location:** `public/test-widgets/vector-editor/index.html`
**Lines of Code:** ~506

#### Current Strengths
- SVG-based drawing
- Rectangle, circle, line tools
- Color picker
- Shape selection
- Grid background
- Shape count display
- Event emission for shape changes

#### Specific Improvements Needed

**1. Add More Shape Tools**
```javascript
// Polygon tool
case 'polygon':
  const points = calculatePolygonPoints(startPoint, pos, 6); // hexagon
  tempElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  tempElement.setAttribute('points', points);
  break;

// Path/pen tool (freehand)
case 'pen':
  if (!pathPoints) pathPoints = [];
  pathPoints.push(`${pos.x},${pos.y}`);
  tempElement.setAttribute('d', `M ${pathPoints.join(' L ')}`);
  break;
```

**2. Add Shape Transform Handles**
```javascript
function showTransformHandles(shapeId) {
  const el = canvas.querySelector(`[data-id="${shapeId}"]`);
  const bbox = el.getBBox();

  const handles = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  handles.className = 'transform-handles';
  // Add corner handles for resize
  // Add rotation handle at top
}
```

**3. Add Layers Panel**
- Z-order management
- Layer visibility toggle
- Layer naming

**4. Add Snap to Grid**
```javascript
function snapToGrid(point, gridSize = 20) {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
}
```

**5. Add Export to SVG/PNG**
```javascript
function exportSVG() {
  const svgContent = canvas.outerHTML;
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  // Download or emit
}
```

**Estimated Effort:** 5-6 hours

---

### 10. text-editor (Score: 85)

**Location:** `public/test-widgets/text-editor/index.html`
**Lines of Code:** ~350

#### Current Strengths
- Rich text editing with contenteditable
- Bold, italic, underline, strikethrough
- Lists (ordered/unordered)
- Text alignment
- Edit/readonly/preview modes
- Character count
- Event-driven updates

#### Specific Improvements Needed

**1. Replace execCommand with Modern API**
```javascript
// execCommand is deprecated. Use Selection API instead:
function applyFormat(format) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const wrapper = document.createElement(formatToTag[format]);
  range.surroundContents(wrapper);
}

const formatToTag = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
  strikethrough: 's'
};
```

**2. Add Heading Levels**
```javascript
function applyHeading(level) {
  document.execCommand('formatBlock', false, `h${level}`);
}
// Add H1, H2, H3 buttons to toolbar
```

**3. Add Link Insertion**
```javascript
function insertLink() {
  const url = prompt('Enter URL:');
  if (url) {
    document.execCommand('createLink', false, url);
  }
}
```

**4. Add Word Count**
```javascript
function updateWordCount() {
  const text = editor.innerText || '';
  const words = text.trim().split(/\s+/).filter(w => w).length;
  wordCount.textContent = `${words} words`;
}
```

**5. Add Markdown Support**
- Toggle between rich text and markdown view
- Convert on mode switch

**Estimated Effort:** 3-4 hours

---

## Tier A Widgets - Feature Enhancements

### 11. activity-feed (Score: 84)

**Location:** `public/test-widgets/activity-feed/index.html`

#### Key Improvements
1. Add event grouping (collapse similar events)
2. Add time-based grouping ("Today", "Yesterday", etc.)
3. Add export to JSON/CSV
4. Add click to jump to source widget
5. Add event detail modal

**Implementation Notes:**
- Currently only shows 100 events (increase to 500 with virtual scrolling)
- Add "mark as read" functionality
- Add priority/severity indicators

---

### 12. notification-center (Score: 70)

**Location:** `public/test-widgets/notification-center/index.html`

#### Key Improvements
1. Add notification persistence across sessions
2. Add notification grouping by type
3. Add notification actions (quick actions from notification)
4. Add sound/vibration options
5. Add notification scheduling
6. Add "Do Not Disturb" mode

---

### 13. kanban-board (Score: 88)

**Location:** `public/test-widgets/kanban-board/index.html`

#### Key Improvements (Needs Read)
1. Add custom column creation
2. Add card colors/labels
3. Add due dates with overdue highlighting
4. Add card templates
5. Add WIP limits per column
6. Add swimlanes

---

### 14. button-deck (Score: 84)

**Location:** `public/test-widgets/button-deck/index.html`

#### Key Improvements
1. Replace prompt() with modal dialog
2. Add drag-to-reorder buttons
3. Add button groups/folders
4. Add long-press actions
5. Add button icons from emoji picker
6. Add multi-action buttons (hold vs click)

---

## Tier B Widgets - Significant Rewrites

### Guidelines for Tier B Rewrites

These widgets have core functionality but need substantial improvements. When rewriting:

1. **Keep the core concept** - The widget idea is valid
2. **Improve the UI** - Align with StickerNest design system
3. **Add proper state management** - Use WidgetAPI.setState/getState
4. **Add accessibility** - ARIA labels, keyboard nav
5. **Add error handling** - Try-catch, user feedback
6. **Add mobile support** - Touch events, responsive

### synth-master (Score: 61)

**Current Issues:**
- Very niche use case
- No audio output (visual only)
- Limited modulation targets

**Rebuild Strategy:**
- Rename to "LFO Controller"
- Add actual Web Audio API integration
- Add multiple LFO outputs
- Add MIDI-like control

### text-effects (Score: 60)

**Rebuild Strategy:**
- Merge into text-editor as a panel
- Use CSS animations instead of JS
- Add more effect presets
- Add custom effect builder

---

## Tier C Widgets - Rebuild from Scratch

### color-sender / color-receiver (Score: 53-54)

**Current Purpose:** Demo widget-to-widget communication

**Rebuild as:** "Color Palette" widget
- Multiple color slots
- Color picker with history
- Palette import/export
- Broadcast selected color to canvas

### echo-widget / ping-sender / ping-receiver (Score: 48-52)

**Action:** Move to dev-tools directory
**Do not rebuild** - These are debug utilities

---

## Built-in Widgets - Core Improvements

### BasicTextWidget

**Location:** `src/widgets/builtin/BasicTextWidget.ts`

**Improvements:**
1. Add inline editing
2. Add font size control
3. Add text alignment
4. Add link detection

### NotesWidget

**Improvements:**
1. Add markdown support
2. Add search
3. Add tags
4. Add export

### ToDoListWidget

**Improvements:**
1. Add drag reorder
2. Add due dates
3. Add subtasks
4. Add filter by status

### TimerWidget

**Improvements:**
1. Add presets (5min, 15min, 25min pomodoro)
2. Add sound options
3. Add auto-restart option
4. Add session history

### ClockWidget

**Improvements:**
1. Add timezone support
2. Add multiple clock faces
3. Add world clock mode
4. Add alarm (optional)

---

## Common Patterns to Apply

### 1. Accessibility Template

```javascript
// Add to all interactive widgets
function setupAccessibility() {
  // Set role
  container.setAttribute('role', 'application');
  container.setAttribute('aria-label', 'Widget Name');

  // Make focusable
  container.setAttribute('tabindex', '0');

  // Keyboard navigation
  container.addEventListener('keydown', handleKeyNav);
}

function handleKeyNav(e) {
  switch (e.key) {
    case 'Tab':
      // Move between interactive elements
      break;
    case 'Enter':
    case ' ':
      // Activate focused element
      break;
    case 'Escape':
      // Close modals, cancel actions
      break;
  }
}
```

### 2. Error Handling Template

```javascript
function safeExecute(fn, fallback = null) {
  try {
    return fn();
  } catch (error) {
    console.error('[WidgetName] Error:', error);
    showError(error.message);
    return fallback;
  }
}

function showError(message) {
  // Show toast or inline error
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
```

### 3. Mobile Support Template

```javascript
function setupMobileSupport() {
  // Touch events
  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchmove', handleTouchMove, { passive: true });
  element.addEventListener('touchend', handleTouchEnd);

  // Responsive font sizes
  if (window.innerWidth < 400) {
    document.body.classList.add('compact-mode');
  }

  // Prevent double-tap zoom
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) e.preventDefault();
    lastTap = now;
  });
}
```

### 4. State Persistence Template

```javascript
function saveState() {
  if (window.WidgetAPI?.setState) {
    window.WidgetAPI.setState(state);
  }
  // Fallback to localStorage
  try {
    localStorage.setItem('widget-name-state', JSON.stringify(state));
  } catch (e) {}
}

function loadState() {
  if (window.WidgetAPI?.getState) {
    const saved = window.WidgetAPI.getState();
    if (saved) return saved;
  }
  try {
    return JSON.parse(localStorage.getItem('widget-name-state'));
  } catch (e) {
    return null;
  }
}
```

---

## Testing Checklist

Before marking a widget as complete, verify:

### Functionality
- [ ] All features work as documented
- [ ] Events emit correctly (check with echo-widget)
- [ ] State persists across reloads
- [ ] No console errors

### UI/UX
- [ ] Follows StickerNest design system
- [ ] Responsive at different sizes
- [ ] Loading states shown
- [ ] Empty states shown
- [ ] Error states shown

### Accessibility
- [ ] Keyboard navigable
- [ ] Screen reader compatible (test with VoiceOver/NVDA)
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

### Mobile
- [ ] Touch targets >= 44px
- [ ] Touch events work
- [ ] No horizontal scroll
- [ ] Text readable without zoom

### Performance
- [ ] Initial render < 100ms
- [ ] No memory leaks (test with DevTools)
- [ ] Animations at 60fps
- [ ] Event handlers debounced where appropriate

### Integration
- [ ] WidgetAPI events work
- [ ] Pipeline inputs/outputs work
- [ ] Cross-canvas communication works (if applicable)

---

## Widget Priority Queue

Based on impact and effort, implement in this order:

### Sprint 1 (High Impact, Low Effort)
1. slideshow-widget - Add touch support
2. gradient-maker - Add undo/redo
3. folder-widget - Inline rename

### Sprint 2 (High Impact, Medium Effort)
4. project-tracker - Add persistence
5. text-editor - Replace execCommand
6. image-editor - Add crop/rotate

### Sprint 3 (Medium Impact, Medium Effort)
7. vector-editor - Add more tools
8. chat-room - Real multi-instance
9. button-deck - Better editing

### Sprint 4 (Cleanup)
10. Remove Tier D widgets
11. Consolidate vector suite
12. Extract farm game

---

## Appendix: File Locations Quick Reference

```
src/widgets/builtin/
├── BasicTextWidget.ts
├── NotesWidget.ts
├── ToDoListWidget.ts
├── TimerWidget.ts
├── ImageStickerWidget.ts
├── ClockWidget.ts
├── WeatherWidget.ts
├── QuoteWidget.ts
├── ProgressBarWidget.ts
├── BookmarkWidget.ts
├── CounterWidget.ts
├── LottiePlayerWidget.ts
├── ContainerWidget.ts
├── DataDisplayWidget.ts
├── CrossCanvasBroadcasterWidget.ts
├── CrossCanvasListenerWidget.ts
└── ColorSyncWidget.ts

public/test-widgets/
├── slideshow-widget/         (Tier S)
├── gradient-maker/           (Tier S)
├── image-editor/             (Tier S)
├── folder-widget/            (Tier S)
├── project-tracker/          (Tier S)
├── spotify-playlist-widget/  (Tier S)
├── youtube-playlist-widget/  (Tier S)
├── chat-room/                (Tier S)
├── vector-editor/            (Tier S)
├── text-editor/              (Tier S)
├── activity-feed/            (Tier A)
├── notification-center/      (Tier A)
├── kanban-board/             (Tier A)
├── button-deck/              (Tier A)
├── notes-widget/             (Tier A)
├── time-tracker/             (Tier A)
└── ... (see full list in audit report)
```
