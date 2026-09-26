# Party app

Solid 2 and TanStack Router render the browser app from `src/client.tsx`. The Cloudflare Worker in `src/worker/index.ts` handles room WebSockets, then serves Vite assets through `env.ASSETS` with SPA fallback.

Run `pnpm dev`, `pnpm build`, and `pnpm test:unit` from this package. Run `pnpm test:e2e -- --browser all` from the workspace root for browser coverage. The browser test runner starts an isolated local Alchemy stack with local test credentials.

Infrastructure and bindings are declared in `alchemy.run.ts`; TypeScript bindings live in `src/env.d.ts`. Games use schema-validated WebSocket adapters.

Solid 2 batches signal writes. Protocol ordering therefore uses synchronous internal state, with signals projecting the current view. UI tests flush queued signal writes before asserting DOM changes. The test setup also normalizes happy-dom's numeric `textContent` assignment to match browsers.
