# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A jq playground web application built with Next.js. Users can test jq queries against JSON directly in the browser. All jq processing happens locally via WebAssembly (jq-wasm) - data is only sent to the server when users explicitly share snippets.

Live at: https://play.jqlang.org

## Commands

```bash
# Development (starts Next.js + PostgreSQL via Docker)
docker compose up

# Production build
npm run build
npm run start

# Linting
npm run lint

# Database migrations
npm run prisma:migrate
```

## Architecture

### Core Data Flow

1. **Local Query Execution**: User input → Web Worker (via Comlink) → jq-wasm → Result displayed
2. **Sharing**: User clicks Share → POST /api/snippets → PostgreSQL → Returns shareable URL `/s/[slug]`
3. **Loading Shared**: Visit `/s/[slug]` → Server fetches from DB → Pre-populates Playground state

### Key Components

- **`src/components/Playground.tsx`**: Main orchestrator, manages all state (query, json, http, options, result)
- **`src/workers/`**: Web Worker implementation using Comlink for background jq execution
  - `worker.ts`: Actual jq processing logic
  - `process.ts`: Web Worker entry point
  - `model.ts`: Zod schemas for validation
- **`src/app/api/snippets/`**: CRUD endpoints for shared snippets
- **`src/lib/prisma.ts`**: Database client and operations

### Component Hierarchy

```
Playground (client component, state management)
├── Header (share, copy command, cheatsheet)
├── QueryEditor (Monaco editor for jq query)
├── OptionsSelector (jq flags: -c, -r, -n, -s, etc.)
├── JSONEditor / HTTP tabs (input source)
└── OutputEditor (results display)
```

### Database

Single `snippets` table with content-addressed slugs (SHA256 hash of json+http+query+options). Same content always produces the same URL.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: Material-UI v6 with Emotion
- **Editor**: Monaco Editor (self-hosted, optimized bundle in /public)
- **jq Engine**: jq-wasm (WebAssembly, no native deps)
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod schemas
- **Error Tracking**: Sentry
- **Deployment**: Fly.io

## Key Patterns

- All jq processing is client-side only (privacy-focused)
- Web Workers prevent UI blocking during query execution
- Zod validates all API inputs and shared snippet data
- Monaco editors are lazy-loaded for performance
