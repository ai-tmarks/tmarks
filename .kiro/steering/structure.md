# Project Structure

## Repository Layout

```
/
├── tab/              # Browser extension (Chrome/Edge)
├── tmarks/           # Web application (Cloudflare Workers + React)
├── website/          # Marketing website (Astro)
└── .cunzhi-memory/   # Project memory/context (do not modify)
```

## TMarks Web App (tmarks/)

### Frontend Structure
```
src/
├── components/       # React components organized by feature
│   ├── bookmarks/   # Bookmark cards, forms, lists
│   ├── tags/        # Tag sidebar, selector, badges
│   ├── tab-groups/  # Tab group cards, items, drag-drop
│   ├── auth/        # Login, register forms
│   ├── common/      # Shared UI components
│   ├── layout/      # App shell, navigation
│   ├── import-export/ # Import/export UI
│   └── api-keys/    # API key management
├── pages/           # Route-level page components
│   ├── bookmarks/   # Bookmark list page
│   ├── tab-groups/  # Tab groups page
│   ├── share/       # Public share page
│   ├── settings/    # Settings pages
│   └── auth/        # Auth pages
├── hooks/           # Custom React hooks (useBookmarks, useTags, etc.)
├── services/        # API client functions (bookmarks.ts, tags.ts, etc.)
├── stores/          # Zustand stores (authStore, themeStore, toastStore)
├── lib/             # Utilities and types
│   ├── api-client.ts  # Base API client with auth
│   ├── types.ts       # Shared TypeScript types
│   └── image-utils.ts # Image processing utilities
├── routes/          # React Router configuration
├── styles/          # Global CSS and theme files
└── mock/            # Mock data for development
```

### Backend Structure
```
functions/
├── api/             # API route handlers (Cloudflare Pages Functions)
│   ├── auth/        # Authentication endpoints
│   ├── bookmarks/   # Bookmark CRUD operations
│   ├── tags/        # Tag management
│   ├── tab-groups/  # Tab group operations
│   ├── public/      # Public share endpoints
│   ├── v1/          # Versioned API (import/export)
│   └── shared/      # Shared backend utilities
├── lib/             # Backend utilities
│   ├── types.ts     # Backend type definitions
│   ├── response.ts  # Standard response helpers
│   ├── validation.ts # Input validation
│   ├── crypto.ts    # UUID generation, hashing
│   └── import-export/ # Import/export logic
└── middleware/      # Request middleware
    ├── auth.ts      # JWT authentication
    ├── api-key-auth-pages.ts # API key auth
    ├── security.ts  # Security headers
    └── rate-limit.ts # Rate limiting
```

### Configuration Files
- `wrangler.toml` - Cloudflare Workers config (D1, KV bindings)
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript compiler options
- `eslint.config.js` - ESLint rules
- `.prettierrc` - Code formatting rules
- `tailwind.config.js` - TailwindCSS configuration

### Database
- `migrations/` - D1 database migration SQL files
- Schema includes: users, bookmarks, tags, bookmark_tags, tab_groups, tab_items, api_keys, share_settings

## Browser Extension (tab/)

### Structure
```
src/
├── popup/           # Extension popup UI
│   ├── index.html   # Popup HTML entry
│   ├── Popup.tsx    # Main popup component
│   ├── ModeSelector.tsx # View mode selector
│   └── TabCollectionView.tsx # Tab collection UI
├── options/         # Extension options page
│   ├── index.html   # Options HTML entry
│   ├── Options.tsx  # Main options component
│   └── components/  # Options page components
├── background/      # Service worker
│   └── index.ts     # Background script logic
├── content/         # Content scripts
│   └── index.ts     # Page content extraction
├── components/      # Shared React components
├── lib/             # Core extension logic
│   ├── api/         # TMarks API client
│   ├── providers/   # AI provider adapters (OpenAI, Anthropic, etc.)
│   ├── services/    # Business logic (AI recommendations, sync)
│   ├── store/       # Zustand stores
│   ├── db/          # Dexie database schema
│   ├── utils/       # Utility functions
│   └── constants/   # Constants and config
└── types/           # TypeScript type definitions
```

### Configuration Files
- `manifest.json` - Chrome extension manifest (V3)
- `vite.config.ts` - Vite + CRXJS plugin config
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - TailwindCSS configuration

### Build Output
- `dist/` - Built extension (load as unpacked extension)

## Marketing Website (website/)

### Structure
```
src/
├── pages/           # Astro pages (routes)
│   ├── index.astro  # Homepage
│   ├── features.astro # Features page
│   └── pricing.astro  # Pricing page
├── layouts/         # Page layouts
│   └── Layout.astro # Base layout
├── components/      # React/Astro components
│   ├── home/        # Homepage components
│   ├── layout/      # Layout components
│   └── common/      # Shared components
├── lib/             # Utilities
│   └── constants.ts # Site constants
└── styles/          # Global styles
    └── global.css   # Global CSS
```

### Configuration Files
- `astro.config.mjs` - Astro configuration
- `wrangler.toml` - Cloudflare Pages deployment config
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - TailwindCSS configuration

## Naming Conventions

### Files
- Components: PascalCase (e.g., `BookmarkCard.tsx`)
- Utilities: camelCase (e.g., `api-client.ts`)
- Types: camelCase (e.g., `types.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useBookmarks.ts`)
- Services: camelCase (e.g., `bookmarks.ts`)

### Code
- React components: PascalCase
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase
- CSS classes: kebab-case (Tailwind utilities)

## Path Aliases

All projects use `@/*` to reference `src/*`:
```typescript
import { BookmarkCard } from '@/components/bookmarks/BookmarkCard'
import { useBookmarks } from '@/hooks/useBookmarks'
import type { Bookmark } from '@/lib/types'
```

## Module Organization

- **Feature-based**: Components grouped by feature (bookmarks, tags, tab-groups)
- **Separation of concerns**: UI components, business logic (services), state (stores), and API calls are separated
- **Shared code**: Common utilities and types in `lib/`
- **Type safety**: Shared types between frontend and backend in `functions/lib/types.ts` and `src/lib/types.ts`
