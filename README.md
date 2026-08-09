# party

Casual multiplayer party game app built with TanStack Solid Start, deployed on Cloudflare Workers.

This is a pnpm workspace. The app lives in `packages/www`.

## Setup

```bash
pnpm install
```

## Common commands

```bash
# Dev server
pnpm --filter www dev

# Build (runs vite build + tsc --noEmit)
pnpm --filter www build

# Unit tests (Vitest)
pnpm --filter www test:unit

# Real workerd/Durable Object E2E for every game
pnpm test:e2e -- all

# Playwright seeded and live-room E2E for every game
pnpm test:e2e -- --browser all

# Run one game in either mode
pnpm test:e2e -- rps
pnpm test:e2e -- --browser rps

# Deploy to Cloudflare
pnpm deploy
```

See `CLAUDE.md` for architecture, code style, and game design notes.
