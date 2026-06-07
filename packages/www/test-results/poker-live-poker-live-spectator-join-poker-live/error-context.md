# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: poker-live.spec.ts >> poker-live >> spectator join
- Location: e2e/poker-live.spec.ts:130:5

# Error details

```
TimeoutError: page.waitForFunction: Timeout 10000ms exceeded.
```

# Test source

```ts
  43  |         context,
  44  |         page,
  45  |         name,
  46  |         playerId: playerId!,
  47  |     };
  48  | }
  49  | 
  50  | async function startPoker(host: PlayerSession) {
  51  |     await host.page.locator('[data-testid="room-game-option-poker"]').click();
  52  |     await host.page.locator('[data-testid="room-start-button"]').click();
  53  |     await host.page.waitForSelector('[data-testid="poker-room"]');
  54  | }
  55  | 
  56  | async function waitForPokerRoom(player: PlayerSession) {
  57  |     await player.page.waitForSelector('[data-testid="poker-room"]');
  58  | }
  59  | 
  60  | async function waitForSeatStatus(
  61  |     page: Page,
  62  |     playerId: string,
  63  |     status: string,
  64  | ) {
  65  |     await page.waitForFunction(
  66  |         ({ playerId, status }) => {
  67  |             const element = document.querySelector(
  68  |                 `[data-testid="poker-seat-${playerId}"]`,
  69  |             );
  70  |             return element?.getAttribute("data-status") === status;
  71  |         },
  72  |         { playerId, status },
  73  |     );
  74  | }
  75  | 
  76  | async function waitForStreet(page: Page, streetLabel: string) {
  77  |     await page.waitForFunction((streetLabel: string) => {
  78  |         const element = document.querySelector('[data-testid="poker-street"]');
  79  |         return element?.textContent?.trim() === streetLabel;
  80  |     }, streetLabel);
  81  | }
  82  | 
  83  | async function text(page: Page, testId: string) {
  84  |     return (await page.locator(`[data-testid="${testId}"]`).textContent()) ?? "";
  85  | }
  86  | 
  87  | async function getAttr(page: Page, testId: string, attr: string) {
  88  |     return page.locator(`[data-testid="${testId}"]`).getAttribute(attr);
  89  | }
  90  | 
  91  | async function closePlayers(players: PlayerSession[]) {
  92  |     await Promise.all(players.map((player) => player.context.close()));
  93  | }
  94  | 
  95  | test.describe("poker-live", () => {
  96  |     test("fold propagation", async ({ browser }) => {
  97  |         const roomId = createRoomId("poker-live-fold");
  98  |         const alice = await createPlayer(browser, roomId, "Alice");
  99  |         const bob = await createPlayer(browser, roomId, "Bob");
  100 | 
  101 |         try {
  102 |             await startPoker(alice);
  103 |             await waitForPokerRoom(bob);
  104 | 
  105 |             await alice.page.waitForFunction(() => {
  106 |                 const banner = document.querySelector('[data-testid="poker-turn-banner"]');
  107 |                 return banner?.textContent?.includes("YOUR TURN");
  108 |             });
  109 | 
  110 |             await alice.page.locator('[data-testid="poker-fold-button"]').click();
  111 | 
  112 |             await Promise.all([
  113 |                 waitForSeatStatus(alice.page, alice.playerId, "folded"),
  114 |                 waitForSeatStatus(bob.page, alice.playerId, "folded"),
  115 |                 waitForStreet(alice.page, "HAND OVER"),
  116 |                 waitForStreet(bob.page, "HAND OVER"),
  117 |             ]);
  118 | 
  119 |             await expect(
  120 |                 alice.page.locator('[data-testid="poker-call-button"]'),
  121 |             ).toBeDisabled();
  122 |             await expect(
  123 |                 bob.page.locator('[data-testid="poker-call-button"]'),
  124 |             ).toBeDisabled();
  125 |         } finally {
  126 |             await closePlayers([alice, bob]);
  127 |         }
  128 |     });
  129 | 
  130 |     test("spectator join", async ({ browser }) => {
  131 |         const roomId = createRoomId("poker-live-spectator");
  132 |         const alice = await createPlayer(browser, roomId, "Alice");
  133 |         const bob = await createPlayer(browser, roomId, "Bob");
  134 | 
  135 |         try {
  136 |             await startPoker(alice);
  137 |             await waitForPokerRoom(bob);
  138 | 
  139 |             const dana = await createPlayer(browser, roomId, "Dana");
  140 |             try {
  141 |                 await waitForPokerRoom(dana);
  142 | 
> 143 |                 await dana.page.waitForFunction(() => {
      |                                 ^ TimeoutError: page.waitForFunction: Timeout 10000ms exceeded.
  144 |                     const hand = document.querySelector('[data-testid="poker-hero-hand"]');
  145 |                     return hand?.getAttribute("data-spectator") === "true";
  146 |                 });
  147 | 
  148 |                 await expect(
  149 |                     dana.page.locator('[data-testid="poker-fold-button"]'),
  150 |                 ).toHaveCount(0);
  151 |                 expect(await text(dana.page, "poker-hero-status")).toMatch(
  152 |                     /SPECTATING/,
  153 |                 );
  154 |                 expect(await text(alice.page, "poker-spectator-list")).toMatch(
  155 |                     /Dana/,
  156 |                 );
  157 |                 expect(
  158 |                     await getAttr(dana.page, "poker-hero-hand", "data-visible-card-count"),
  159 |                 ).toBe("0");
  160 |             } finally {
  161 |                 await closePlayers([dana]);
  162 |             }
  163 |         } finally {
  164 |             await closePlayers([alice, bob]);
  165 |         }
  166 |     });
  167 | });
  168 | 
```