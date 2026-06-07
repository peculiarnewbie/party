# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: poker-seeded.spec.ts >> poker-seeded >> standard-my-turn
- Location: e2e/poker-seeded.spec.ts:5:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Home" [ref=e3] [cursor=pointer]:
    - /url: /
  - separator [ref=e4]
  - generic [ref=e6]:
    - generic [ref=e7]:
      - generic [ref=e9]: YOUR TURN
      - generic [ref=e10]:
        - generic [ref=e11]: TEXAS HOLD'EM
        - generic [ref=e12]: HAND 7
        - generic [ref=e13]: TURN
        - button "END GAME" [ref=e14] [cursor=pointer]
        - generic [ref=e15]: ROOM FIXTURE-POKER-STANDARD
    - generic [ref=e17]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e20]:
            - generic [ref=e21]:
              - generic [ref=e22]:
                - generic [ref=e23]: Bob
                - generic [ref=e24]: IN
              - generic [ref=e26]: BB
            - generic [ref=e27]:
              - generic [ref=e28]:
                - img [ref=e30]
                - img [ref=e38]
              - generic [ref=e45]: "2"
            - generic [ref=e46]:
              - generic [ref=e47]: "820"
              - generic [ref=e48]: "+40"
          - generic [ref=e49]:
            - generic [ref=e50]:
              - generic [ref=e51]:
                - generic [ref=e52]: Cara
                - generic [ref=e53]: IN
              - generic [ref=e55]: D
            - generic [ref=e56]:
              - generic [ref=e57]:
                - img [ref=e59]
                - img [ref=e67]
              - generic [ref=e74]: "2"
            - generic [ref=e75]:
              - generic [ref=e76]: "1160"
              - generic [ref=e77]: "+40"
        - generic [ref=e78]:
          - generic [ref=e79]:
            - img [ref=e81]:
              - generic [ref=e83]: Q
              - generic [ref=e88]: Q
              - generic [ref=e92]: Q
            - img [ref=e97]:
              - generic [ref=e99]: J
              - generic [ref=e104]: J
              - generic [ref=e108]: J
            - img [ref=e113]:
              - generic [ref=e115]: "10"
              - generic [ref=e120]: "10"
            - img [ref=e155]:
              - generic [ref=e157]: "2"
              - generic [ref=e162]: "2"
            - generic [ref=e173]: WAIT
          - generic [ref=e176]:
            - generic [ref=e177]: MAIN POT
            - generic [ref=e178]: "420"
        - generic [ref=e180]:
          - generic [ref=e181]: TABLE LOG
          - generic [ref=e182]:
            - generic [ref=e183]:
              - generic [ref=e184]: PLAYER ACTION
              - generic [ref=e185]: Bob bet 40
            - generic [ref=e186]:
              - generic [ref=e187]: BOARD DEALT
              - generic [ref=e188]: Turn dealt
      - generic [ref=e189]:
        - generic [ref=e192]:
          - img [ref=e194]:
            - generic [ref=e196]: A
            - generic [ref=e201]: A
          - img [ref=e209]:
            - generic [ref=e211]: K
            - generic [ref=e216]: K
            - generic [ref=e220]: K
        - generic [ref=e225]:
          - generic [ref=e226]:
            - generic [ref=e227]: ACTIONS
            - generic [ref=e228]: YOUR MOVE
          - generic [ref=e229]:
            - generic [ref=e230]: "980"
            - generic [ref=e231]:
              - text: MIN 100
              - text: MAX 980
          - generic [ref=e232]:
            - button "Fold" [ref=e233] [cursor=pointer]
            - button "Call 40" [ref=e234] [cursor=pointer]
            - button "Raise" [ref=e235] [cursor=pointer]
          - generic [ref=e236]:
            - button "-10" [ref=e237] [cursor=pointer]
            - button "-50" [ref=e238] [cursor=pointer]
            - button "-100" [ref=e239] [cursor=pointer]
            - button "+10" [ref=e240] [cursor=pointer]
            - button "+50" [ref=e241] [cursor=pointer]
            - button "+100" [ref=e242] [cursor=pointer]
            - button "All-in" [ref=e243] [cursor=pointer]
            - spinbutton [ref=e244]: "100"
  - generic:
    - contentinfo:
      - button "Open TanStack Router Devtools" [ref=e245] [cursor=pointer]:
        - generic [ref=e246]:
          - img [ref=e248]
          - img [ref=e283]
        - generic [ref=e317]: "-"
        - generic [ref=e318]: TanStack Router
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
> 13 |         expect(await fixture.isEnabled("poker-call-button")).toBe(true);
     |                                                              ^ Error: expect(received).toBe(expected) // Object.is equality
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
  35 |         await expect(page.getByTestId("poker-hero-status")).toContainText(/SPECTATING/);
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