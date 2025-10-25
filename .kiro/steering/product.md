# Product Overview

TMarks is an AI-powered bookmark management system consisting of three interconnected applications:

## Core Applications

### 1. TMarks Web App (tmarks/)
Full-stack bookmark management platform with:
- Bookmark organization with AI-generated tags
- Tag-based filtering and search
- Tab groups management with drag-and-drop
- Public sharing with customizable URLs
- Import/export (HTML, JSON, CSV)
- User authentication and API key management

### 2. Browser Extension (tab/)
Chrome/Edge extension (Manifest V3) that:
- Captures current page metadata
- Generates AI tag suggestions (OpenAI, Anthropic, DeepSeek, etc.)
- Syncs bookmarks with TMarks backend
- Provides offline support via IndexedDB
- Manages local tag library with colors and search

### 3. Marketing Website (website/)
Static Astro site showcasing product features and pricing.

## Key Features

- **AI Tag Generation**: Multiple AI provider support for intelligent bookmark categorization
- **Cross-Platform Sync**: Browser extension syncs with web app via REST API
- **Offline-First**: Extension caches data locally for offline access
- **Public Sharing**: Share curated bookmark collections via custom URLs
- **Tab Groups**: Organize browser tabs with hierarchical structure and drag-and-drop
- **Import/Export**: Support for standard bookmark formats (Netscape HTML, JSON, CSV)

## Target Users

Developers, researchers, and power users who need intelligent bookmark organization across devices with AI-assisted tagging.
