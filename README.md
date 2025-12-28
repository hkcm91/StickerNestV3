# StickerNest V2

A modern widget-based dashboard builder with AI-powered widget generation, visual pipelines, and real-time collaboration features.

## Features

- **Widget Canvas** - Drag, drop, resize, and rotate widgets on an infinite canvas
- **50+ Built-in Widgets** - Pipeline tools, debug utilities, farming sim, editors, and more
- **AI Widget Generator** - Generate custom widgets using natural language prompts
- **Visual Pipelines** - Connect widgets to create data flows and automation
- **Multi-Canvas Support** - Create and manage multiple dashboards
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Theming** - 4 built-in themes (default, cyberpunk, minimal, cozy)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/hkcm91/StickerNestV2.git
cd StickerNestV2

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

## Environment Variables

Create a `.env` file in the project root:

```env
# Required for AI features
VITE_REPLICATE_API_TOKEN=your_replicate_token

# Optional - Supabase for cloud storage and auth
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional - AI Provider API Keys (for proxy)
VITE_OPENAI_API_KEY=your_openai_key
VITE_ANTHROPIC_API_KEY=your_anthropic_key
```

**Local Dev Mode**: If Supabase is not configured, the app runs in local dev mode with localStorage persistence and a demo user.

## Usage

### Canvas Modes

- **View Mode** - Interact with widgets normally
- **Edit Mode** - Drag, resize, rotate, and arrange widgets
- **Connect Mode** - Create pipelines by connecting widget inputs/outputs

### Adding Widgets

1. Click the **Library** tab or the **+** button on mobile
2. Browse widget categories (AI Tools, Pipeline, Debug, etc.)
3. Click a widget to view details, then "Add to Canvas"
4. Or use checkboxes for multi-select and "Add All to Canvas"

### Creating Pipelines

1. Switch to **Connect Mode**
2. Click a widget's output port and drag to another widget's input port
3. Data will flow automatically when the source widget emits events
4. Use the Pipeline Visualizer widget to debug connections

### Saving Dashboards

- Click **Save** to save the current canvas to localStorage (and Supabase if configured)
- Click **Load** to browse and restore saved dashboards
- Export/Import JSON for backup and sharing

## Project Structure

```
StickerNestV2/
├── src/
│   ├── ai/                 # AI widget generation system
│   ├── components/         # React UI components
│   ├── contexts/           # React contexts (Auth, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── layouts/            # Page layouts
│   ├── pipelines/          # Visual pipeline editor
│   ├── runtime/            # Widget runtime and sandbox
│   ├── services/           # API clients and services
│   ├── state/              # Zustand stores
│   ├── types/              # TypeScript type definitions
│   └── widget-lab/         # Widget development tools
├── public/
│   └── test-widgets/       # Built-in widget bundles
├── supabase/
│   └── schema.sql          # Database schema
└── docs/                   # Documentation
```

## Widget Development

Widgets are HTML/JS bundles that run in sandboxed iframes. See [WIDGET-DEVELOPMENT.md](./docs/WIDGET-DEVELOPMENT.md) for the full guide.

### Basic Widget Structure

```
my-widget/
├── manifest.json    # Widget metadata and I/O definitions
└── index.html       # Widget entry point
```

### Minimal manifest.json

```json
{
  "id": "my-widget",
  "name": "My Widget",
  "version": "1.0.0",
  "kind": "2d",
  "entry": "index.html",
  "capabilities": {
    "draggable": true,
    "resizable": true
  },
  "outputs": {
    "data": {
      "type": "object",
      "description": "Output data"
    }
  }
}
```

### Widget API

Widgets communicate with the host via postMessage:

```javascript
// Emit output to connected widgets
window.parent.postMessage({
  type: 'widget:emit',
  payload: { type: 'data', payload: { value: 123 } }
}, '*');

// Listen for input from connected widgets
window.addEventListener('message', (e) => {
  if (e.data.type === 'widget:event') {
    console.log('Received:', e.data.payload);
  }
});

// Signal widget is ready
window.parent.postMessage({ type: 'widget:ready' }, '*');
```

## Supabase Setup

To enable cloud features, set up Supabase:

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the schema from `supabase/schema.sql` in the SQL Editor
3. Create storage buckets: `UserWidgets` and `SystemWidgets`
4. Enable authentication providers (Email, Google, GitHub)
5. Add your project URL and anon key to `.env`

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run Playwright tests
npm run test:ui      # Run tests with UI
npm run lint         # Run ESLint
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **State**: Zustand
- **Styling**: CSS-in-JS, CSS Variables
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: OpenAI, Anthropic Claude, Replicate
- **Testing**: Playwright

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- Widget sandbox architecture inspired by Figma and Notion
- AI integration powered by Replicate, OpenAI, and Anthropic
