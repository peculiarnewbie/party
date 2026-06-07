# Browser E2E Migration Plan

## Overview

Move all browser E2E tests off Stagehand and onto Playwright Test.

Current state:

- Workerd/Vitest worker E2E tests stay as-is
- Browser E2E tests are custom Node scripts
- Seeded browser tests use Stagehand for a local page session
- `poker-live.spec.ts` already uses Playwright directly
- Playwright traces and HTML reports are not wired into the main browser runs

Target state:

- Playwright Test owns all browser E2E runs
- Every browser test gets traces, screenshots, video, and HTML report support
- `pnpm test:e2e -- --browser ...` delegates into Playwright Test instead of custom Stagehand scripts
- Stagehand is removed from browser E2E entirely
- Worker E2E flow stays unchanged initially

## Goals

- Replace custom Stagehand browser runs with Playwright Test
- Get Playwright HTML report, trace viewer, and UI mode for browser E2E
- Keep existing fixture route model for seeded tests
- Keep current developer workflow as close as possible:
  - `pnpm test:e2e -- --browser <game>`
  - `pnpm test:e2e -- --browser <game> --headed`
- Add one place to inspect results:
  - `pnpm report`
- Keep:
  - `pnpm trace`

## Non-Goals

- Rewriting the workerd worker test architecture
- Building a custom inspector/report viewer
- Migrating unit tests away from Vitest
- Changing lobby/room runtime protocol

## Why Stagehand is Being Removed

Stagehand local v3 in this repo does not expose a real Playwright `BrowserContext` for reporting/tracing. It also does not cleanly expose Playwright `slowMo` locally. Our seeded browser tests do not need Stagehand AI. They are deterministic fixture tests with normal selectors.

Playwright Test gives us the reporting stack directly:

- HTML report
- per-test traces
- per-test screenshots
- optional video
- `--ui` mode
- `--repeat-each`, retries, sharding later if needed

That makes Stagehand a cost with no benefit for these tests.

## Command Contract

### Keep

- `pnpm test:e2e -- all`
- `pnpm test:e2e -- rps`
- `pnpm test:e2e -- --browser all`
- `pnpm test:e2e -- --browser rps`
- `pnpm test:e2e -- --browser rps --headed`
- `pnpm trace`

### Add

- `pnpm report`
- `pnpm test:e2e -- --browser rps --ui`

### Likely remove or replace

- Stagehand session code in browser E2E
- `--slow-mo` implementation via Stagehand env var
- Stagehand-only config names (`STAGEHAND_*`) in browser E2E helpers

### Likely keep, but narrow scope

- `--update-screenshots` stays useful
- `--no-trace` may stay if we want an explicit no-trace fast mode

## Target Configuration

### New file

`packages/www/playwright.config.ts`

### Suggested config

```ts
import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    trace: "on",
    screenshot: "on",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "rps-seeded",
      testMatch: "rps-seeded.spec.ts",
      use: { viewport: { width: 1440, height: 1200 } },
    },
    {
      name: "poker-seeded",
      testMatch: "poker-seeded.spec.ts",
      use: { viewport: { width: 1440, height: 1200 } },
    },
    {
      name: "yahtzee-seeded",
      testMatch: "yahtzee-seeded.spec.ts",
      use: { viewport: { width: 1440, height: 1200 } },
    },
    {
      name: "quiz-seeded",
      testMatch: "quiz-seeded.spec.ts",
      use: { viewport: { width: 1440, height: 1200 } },
    },
    {
      name: "poker-live",
      testMatch: "poker-live.spec.ts",
      use: { viewport: { width: 1440, height: 1200 } },
    },
  ],
  webServer: {
    command: "pnpm run dev:vite -- --host 127.0.0.1 --port 3000",
    cwd: ".",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !isCI,
    timeout: 30_000,
  },
});
```

## File Changes

### Introduce

- `packages/www/playwright.config.ts`
- `packages/www/e2e/helpers/e2e.config.ts` (rename/cleanup of Stagehand config)

### Rewrite to Playwright Test

- `packages/www/e2e/rps-seeded.spec.ts`
- `packages/www/e2e/poker-seeded.spec.ts`
- `packages/www/e2e/yahtzee-seeded.spec.ts`
- `packages/www/e2e/quiz-seeded.spec.ts`
- `packages/www/e2e/poker-live.spec.ts`

### Convert to plain Playwright helpers

- `packages/www/e2e/helpers/browser-session.ts`
- `packages/www/e2e/helpers/rps-fixture-page.ts`
- `packages/www/e2e/helpers/poker-fixture-page.ts`
- `packages/www/e2e/helpers/yahtzee-fixture-page.ts`
- `packages/www/e2e/helpers/quiz-fixture-page.ts`

### Remove Stagehand usage from browser E2E

- Stagehand imports in `browser-session.ts`
- Stagehand imports in fixture page helpers
- Stagehand imports in seeded specs

### Update tooling/docs

- `packages/www/package.json`
- `packages/www/scripts/run-e2e.ts`
- Root `package.json`
- `docs/playwright-e2e-migration-plan.md`
- `AGENTS.md` / `CLAUDE.md` testing section

### Optional cleanup

- `packages/www/e2e/stagehand.config.ts` → replace with `e2e.config.ts`
- `packages/www/scripts/open-trace.ts` stays, or becomes a thin wrapper
- remove `@browserbasehq/stagehand` dependency after migration

## New Helpers

### `packages/www/e2e/helpers/e2e.config.ts`

Replace Stagehand config names.

Exports:

- `E2E_BASE_URL`
- `E2E_VIEWPORT`
- `getE2eArtifactDir(suiteName)`

### Updated fixture pages

Fixture page objects keep their current shape, but use `Page` from `@playwright/test`.

Example conversion:

```ts
import type { Page } from "@playwright/test";

export class RpsFixturePage {
  constructor(private readonly page: Page) {}
  // ...
}
```

The page object stays useful because:
- it encapsulates fixture URLs
- it hides selector boilerplate
- it keeps existing test intent readable
- it supports component-specific screenshot helpers if needed

## Seeded Test Pattern

Each seeded spec becomes a normal Playwright Test file.

Example skeleton:

```ts
import { test, expect } from "@playwright/test";
import { RpsFixturePage } from "./helpers/rps-fixture-page";

test.describe("rps-seeded", () => {
  test("standard-my-turn", async ({ page }) => {
    const fixture = new RpsFixturePage(page);
    await fixture.gotoFixture("standard-my-turn");

    await expect(page.getByTestId("rps-title")).toHaveText("RPS TOURNAMENT");
    await expect(page.getByTestId("rps-round-label")).toHaveText("FINAL");

    await page.getByTestId("rps-throw-rock").click();

    const sent = await page.evaluate(() => window.__RPS_FIXTURE__?.sentMessages ?? []);
    expect(sent).toEqual([
      { type: "rps:throw", data: { choice: "rock" } },
    ]);
  });
});
```

Key points:

- `expect` replaces manual `assert.equal(..., true)` / `assert.deepEqual(...)`
- `page.getByTestId(...)` replaces many custom page object helpers
- `page.evaluate(...)` stays for fixture window state
- Playwright auto-captures trace, screenshot, and video context per test

## Poker Live Test Migration

`poker-live.spec.ts` already uses Playwright directly. It just needs to become a Playwright Test file.

Key change:

- wrap existing logic in `test(...)` / `test.describe(...)`
- use built-in Playwright assertions and timeouts
- use Playwright Test tracing/screenshot/video settings from config
- remove manual `context.tracing.start/stop` if Playwright config handles it
- keep multi-context multiplayer pattern (that’s the point of the test)

## `scripts/run-e2e.ts` Change

### Keep

- workerd worker path unchanged
- game suite registry pattern
- `--browser` mode routing

### Change

Browser mode currently runs custom Node scripts sequentially.

Change browser mode to invoke Playwright Test with project filters.

### Example command generation

For:

```bash
pnpm test:e2e -- --browser rps
```

Run:

```bash
pnpm exec playwright test --config=e2e/playwright.config.ts --project=rps-seeded
```

For:

```bash
pnpm test:e2e -- --browser poker
```

Run:

```bash
pnpm exec playwright test --config=e2e/playwright.config.ts --project=poker-seeded --project=poker-live
```

### Headed / flags

Map CLI flags to Playwright args:

- `--headed` → `--headed`
- `--update-screenshots` → `--update-snapshots`
- `--ui` → `playwright test --ui`

### Suggested suite shape

```ts
const E2E_SUITES: Record<string, E2eSuite> = {
  poker: {
    description: "...",
    workerFiles: ["src/worker/poker-room.test.ts"],
    browserProjects: ["poker-seeded", "poker-live"],
  },
  yahtzee: {
    description: "...",
    workerFiles: ["src/worker/yahtzee-room.test.ts"],
    browserProjects: ["yahtzee-seeded"],
  },
  rps: {
    description: "...",
    workerFiles: ["src/worker/rps-room.test.ts"],
    browserProjects: ["rps-seeded"],
  },
  quiz: {
    description: "...",
    workerFiles: [],
    browserProjects: ["quiz-seeded"],
  },
};
```

## New scripts

### Root `package.json`

```json
"report": "pnpm --filter party report"
```

### `packages/www/package.json`

```json
"report": "playwright show-report playwright-report",
"test:e2e": "node --import tsx scripts/run-e2e.ts",
"test:browser:deps": "playwright install chromium"
```

So final inspection commands become:

- `pnpm report`
- `pnpm trace`

## Screenshot / artifact layout

Keep existing `.artifacts/` concept for seeded screenshot helpers, but make it secondary.

Primary report artifacts move to Playwright-managed folders:

- `packages/www/playwright-report/`
- `packages/www/test-results/`

Custom `takeScreenshot(...)` can remain if we still want curated element screenshots, but the main inspection surface becomes HTML report + traces.

## Implementation Order

1. Add `packages/www/playwright.config.ts`
2. Add `packages/www/e2e/helpers/e2e.config.ts`
3. Migrate one seeded game first: `rps-seeded.spec.ts`
4. Update `scripts/run-e2e.ts` browser path to use `playwright test --project=...`
5. Verify `pnpm test:e2e -- --browser rps` behaves as expected
6. Migrate remaining seeded specs:
   - `poker-seeded.spec.ts`
   - `yahtzee-seeded.spec.ts`
   - `quiz-seeded.spec.ts`
7. Migrate `poker-live.spec.ts` into Playwright Test
8. Remove Stagehand imports from browser E2E helpers
9. Remove `@browserbasehq/stagehand` dependency
10. Add `pnpm report`
11. Update docs:
    - `AGENTS.md`
    - `CLAUDE.md`
    - `docs/playwright-e2e-migration-plan.md`

## Verification

### Must pass

- `pnpm test:e2e -- all`
- `pnpm test:e2e -- --browser all`
- `pnpm test:e2e -- --browser rps`
- `pnpm test:e2e -- --browser rps --headed`
- `pnpm report`
- `pnpm trace`

### Must inspect manually once

- HTML report opens and lists seeded test results
- trace viewer opens for a failed seeded test
- video exists for a forced failure
- screenshots exist for failing assertions

### Must not break

- workerd worker tests
- existing fixture route behavior
- existing `dev:vite` based local dev workflow

## Risks

- `dev:vite` port drift versus Playwright `baseURL`
- Playwright project filter bugs in custom runner
- Custom screenshot helper drift vs Playwright-managed screenshots
- `poker-live` multi-context test timing sensitivity
- Stagehand removal uncovering hidden runtime assumptions

## Open Questions

- Do we keep custom `takeScreenshot(...)` helpers after Playwright migration, or move fully to Playwright screenshots and attachments?
- Do we keep `--update-screenshots` semantics, or adopt Playwright snapshot update workflow for visual baselines?
- Do we keep `--no-trace`, or always trace once HTML report becomes the primary inspection surface?

## Recommended Outcome

After this migration:

```bash
pnpm test:e2e -- --browser rps
pnpm test:e2e -- --browser rps --headed
pnpm test:e2e -- --browser rps --ui
pnpm report
pnpm trace
```

That gives a real inspectable test UI without building our own result viewer.
