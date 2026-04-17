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

# E2E tests (Playwright + Stagehand, Yahtzee only)
pnpm --filter www test:browser:yahtzee

# Deploy to Cloudflare
pnpm deploy
```

See `CLAUDE.md` for architecture, code style, and game design notes.
