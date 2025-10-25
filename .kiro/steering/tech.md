# Technology Stack

## TMarks Web App (tmarks/)

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: TailwindCSS 4 (alpha)
- **State Management**: Zustand
- **Data Fetching**: @tanstack/react-query
- **Routing**: React Router v7
- **Drag & Drop**: @dnd-kit
- **UI Components**: lucide-react icons
- **Virtualization**: @tanstack/react-virtual

### Backend
- **Runtime**: Cloudflare Workers (Pages Functions)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Authentication**: JWT (Access + Refresh tokens)

### Code Quality
- **Linting**: ESLint 9 with TypeScript ESLint
- **Formatting**: Prettier (no semicolons, single quotes, 100 char width)
- **Git Hooks**: Husky + lint-staged
- **Type Checking**: TypeScript strict mode

### Common Commands
```bash
npm run dev              # Start Vite dev server (port 5173)
npm run build            # TypeScript compile + Vite build
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run format           # Format with Prettier
npm run type-check       # TypeScript type checking
npm run cf:dev           # Cloudflare Workers local dev
npm run cf:deploy        # Deploy to Cloudflare
npm run db:migrate       # Run D1 migrations (production)
npm run db:migrate:local # Run D1 migrations (local)
```

## Browser Extension (tab/)

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7 with @crxjs/vite-plugin
- **Styling**: TailwindCSS 3
- **State Management**: Zustand
- **Local Database**: Dexie (IndexedDB wrapper)
- **AI SDKs**: OpenAI SDK, Anthropic SDK
- **Sanitization**: DOMPurify

### Architecture
- **Manifest**: V3 (service worker background)
- **Modules**: Popup, Options, Background, Content Script
- **Storage**: Chrome Storage API + IndexedDB

### Common Commands
```bash
npm run dev     # Start Vite dev server with HMR
npm run build   # TypeScript compile + Vite build
npm run preview # Preview production build
npm run icons   # Generate extension icons
```

## Marketing Website (website/)

### Framework
- **SSG**: Astro 5
- **UI**: React 19 components
- **Styling**: TailwindCSS 3
- **Icons**: lucide-react
- **Deployment**: Cloudflare Pages

### Common Commands
```bash
npm run dev     # Start Astro dev server
npm run build   # Astro check + build
npm run preview # Preview production build
npm run deploy  # Deploy to Cloudflare Pages
```

## Shared Conventions

### TypeScript Configuration
- Target: ES2020
- Module: ESNext
- Strict mode enabled
- Path alias: `@/*` → `./src/*`
- No unused locals/parameters
- No unchecked indexed access

### Code Style (Prettier)
- No semicolons
- Single quotes
- 2 space indentation
- Trailing commas (ES5)
- 100 character line width
- Arrow function parens: always

### Build Optimization
- Minification: Terser
- Code splitting: Manual chunks for vendor libraries
- Compression: Gzip + Brotli (production)
- Source maps: Disabled in production
- Console removal: Production builds strip console.log
