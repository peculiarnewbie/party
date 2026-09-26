# party

Casual multiplayer party game app built with Solid 2, TanStack Router, and Effect, deployed on Cloudflare Workers.

This is a pnpm workspace. The party app lives in `packages/www`; the quiz administration app lives in `packages/quiz-manager`.

Both apps use Vite client rendering and direct Worker entrypoints. Quiz administration uses Effect RPC for every browser data operation. RPS pilots Effect RPC commands and resynchronization with an Effect Stream consuming hibernatable WebSocket updates. Other games retain their existing WebSocket protocols. Pure game logic remains independent of UI and transport.

Solid (`2.0.0-rc.9`), the Solid renderer, TanStack Solid Router (`2.0.0-rc.8`), and Effect (`4.0.0-beta.102`) are pinned prereleases. Upgrade them deliberately and run both browser and Worker tests.

Vite emits static assets into `dist`; Alchemy serves unknown page paths through the SPA asset fallback. API paths go directly to the Worker. The landing page has static metadata; there is no server rendering.

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

# Quiz administration unit and Worker RPC tests
pnpm --filter quiz-manager test:unit
pnpm --filter quiz-manager test:worker

# Unit and Worker tests (Vitest)
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
