# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: poker-seeded.spec.ts >> poker-seeded >> spectator-active-hand
- Location: e2e/poker-seeded.spec.ts:31:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('poker-hero-status')
Expected pattern: /SPECTATING/
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByTestId('poker-hero-status')

```

```yaml
- link "Home":
  - /url: /
- separator
- text: BOB'S TURN TEXAS HOLD'EM HAND 3 FLOP ROOM FIXTURE-POKER-SPECTATOR Alice IN BB
- img
- img
- text: 2 920 +20 Bob IN D SB
- img
- img
- text: 2 1040 +20 Cara FOLDED
- img
- img
- text: 2 1040
- img: 4 4
- img: 4 4
- img: 9 9
- text: WAIT WAIT MAIN POT 240 SPECTATORS Dana TABLE LOG PLAYER ACTION Cara folded Spectating Spectators can follow the board and log, but cannot act.
- contentinfo:
  - button "Open TanStack Router Devtools":
    - img
    - img
    - text: "- TanStack Router"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { PokerFixturePage } from "./helpers/poker-fixture-page";
  3  | 
  4  | test.describe("poker-seeded", () => {
  5  |     test("standard-my-turn", async ({ page }) => {
  6  |         const fixture = new PokerFixturePage(page);
  7  |         await fixture.gotoFixture("standard-my-turn");
  8  | 
  9  |         await expect(page.getByTestId("poker-title")).toHaveText("TEXAS HOLD'EM");
  10 |         await expect(page.getByTestId("poker-hand-number")).toHaveText("HAND 7");
  11 |         await expect(page.getByTestId("poker-street")).toHaveText("TURN");
  12 |         await expect(page.getByTestId("poker-turn-banner")).toHaveText("YOUR TURN");
  13 |         expect(await fixture.isEnabled("poker-call-button")).toBe(true);
  14 |         expect(await fixture.isEnabled("poker-raise-button")).toBe(true);
  15 | 
  16 |         await page.getByTestId("poker-call-button").click();
  17 | 
  18 |         expect(await fixture.sentMessages()).toEqual([
  19 |             {
  20 |                 type: "poker:act",
  21 |                 playerId: "p1",
  22 |                 playerName: "",
  23 |                 data: { type: "call" },
  24 |             },
  25 |         ]);
  26 | 
  27 |         await fixture.takeScreenshot("standard-my-turn-full");
  28 |         await fixture.takeScreenshot("standard-my-turn-table", "poker-room");
  29 |     });
  30 | 
  31 |     test("spectator-active-hand", async ({ page }) => {
  32 |         const fixture = new PokerFixturePage(page);
  33 |         await fixture.gotoFixture("spectator-active-hand");
  34 | 
> 35 |         await expect(page.getByTestId("poker-hero-status")).toContainText(/SPECTATING/);
     |                                                             ^ Error: expect(locator).toContainText(expected) failed
  36 |         await expect(page.getByTestId("poker-spectator-copy")).toBeVisible();
  37 |         await expect(page.getByTestId("poker-fold-button")).toHaveCount(0);
  38 |         await expect(page.getByTestId("poker-spectator-list")).toContainText(/Dana/);
  39 | 
  40 |         await fixture.takeScreenshot("spectator-active-hand-full");
  41 |         await fixture.takeScreenshot("spectator-active-hand-panel", "poker-action-controls");
  42 |     });
  43 | 
  44 |     test("backwards-visible-opponents", async ({ page }) => {
  45 |         const fixture = new PokerFixturePage(page);
  46 |         await fixture.gotoFixture("backwards-visible-opponents");
  47 | 
  48 |         await expect(page.getByTestId("poker-title")).toHaveText("BACKWARDS POKER");
  49 |         expect(await fixture.getAttribute("poker-seat-p2", "data-visible-card-count")).toBe("2");
  50 |         expect(await fixture.getAttribute("poker-seat-p3", "data-visible-card-count")).toBe("2");
  51 | 
  52 |         await fixture.takeScreenshot("backwards-visible-opponents-full");
  53 |         await fixture.takeScreenshot("backwards-visible-opponents-seat", "poker-seat-p2");
  54 |     });
  55 | 
  56 |     test("tournament-over-host", async ({ page }) => {
  57 |         const fixture = new PokerFixturePage(page);
  58 |         await fixture.gotoFixture("tournament-over-host");
  59 | 
  60 |         await page.waitForSelector('[data-testid="poker-results-overlay"]');
  61 |         await expect(page.getByTestId("poker-results-overlay")).toBeVisible();
  62 |         await expect(page.getByTestId("poker-return-button")).toBeVisible();
  63 |         await expect(page.getByTestId("poker-results-title")).toContainText(/ALICE LEADS/);
  64 | 
  65 |         await fixture.takeScreenshot("tournament-over-host-full");
  66 |         await fixture.takeScreenshot("tournament-over-host-overlay", "poker-results-overlay");
  67 | 
  68 |         await page.getByTestId("poker-return-button").click();
  69 |         expect(await fixture.hostActions()).toEqual(["return_to_lobby"]);
  70 |     });
  71 | });
  72 | 
```