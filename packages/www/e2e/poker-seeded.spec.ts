import { test, expect } from "@playwright/test";
import { PokerFixturePage } from "./helpers/poker-fixture-page";

test.describe("poker-seeded", () => {
    test("standard-my-turn", async ({ page }) => {
        const fixture = new PokerFixturePage(page);
        await fixture.gotoFixture("standard-my-turn");

        await expect(page.getByTestId("poker-title")).toHaveText("TEXAS HOLD'EM");
        await expect(page.getByTestId("poker-hand-number")).toHaveText("HAND 7");
        await expect(page.getByTestId("poker-street")).toHaveText("TURN");
        await expect(page.getByTestId("poker-turn-banner")).toHaveText("YOUR TURN");

        expect(await fixture.isEnabled("poker-check-call-button")).toBe(true);
        expect(await fixture.isEnabled("poker-fold-button")).toBe(true);
        expect(await fixture.isEnabled("poker-bet-raise-button")).toBe(true);
        expect(await fixture.isEnabled("poker-all-in-button")).toBe(true);

        await expect(page.getByTestId("poker-check-call-button")).toContainText("Call 40");

        await page.getByTestId("poker-check-call-button").click();

        expect(await fixture.sentMessages()).toEqual([
            {
                type: "poker:act",
                data: { type: "call" },
            },
        ]);

        await fixture.takeScreenshot("standard-my-turn-full");
        await fixture.takeScreenshot("standard-my-turn-table", "poker-room");
    });

    test("standard-my-turn-raise", async ({ page }) => {
        const fixture = new PokerFixturePage(page);
        await fixture.gotoFixture("standard-my-turn");

        await expect(page.getByTestId("poker-turn-banner")).toHaveText("YOUR TURN");

        await expect(page.getByTestId("poker-bet-raise-button")).toContainText("Raise");

        await page.getByTestId("poker-bet-raise-button").click();

        const messages = await fixture.sentMessages();
        expect(messages).toEqual([
            {
                type: "poker:act",
                data: { type: "raise", amount: 100 },
            },
        ]);
    });

    test("standard-my-turn-fold", async ({ page }) => {
        const fixture = new PokerFixturePage(page);
        await fixture.gotoFixture("standard-my-turn");

        await page.getByTestId("poker-fold-button").click();

        expect(await fixture.sentMessages()).toEqual([
            {
                type: "poker:act",
                data: { type: "fold" },
            },
        ]);
    });

    test("standard-my-turn-all-in", async ({ page }) => {
        const fixture = new PokerFixturePage(page);
        await fixture.gotoFixture("standard-my-turn");

        await page.getByTestId("poker-all-in-button").click();

        expect(await fixture.sentMessages()).toEqual([
            {
                type: "poker:act",
                data: { type: "all_in" },
            },
        ]);
    });

    test("spectator-active-hand", async ({ page }) => {
        const fixture = new PokerFixturePage(page);
        await fixture.gotoFixture("spectator-active-hand");

        await expect(page.getByTestId("poker-hero-hand")).toContainText(/Spectating/);
        await expect(page.getByTestId("poker-spectator-copy")).toBeVisible();
        await expect(page.getByTestId("poker-fold-button")).toHaveCount(0);
        await expect(page.getByTestId("poker-check-call-button")).toHaveCount(0);
        await expect(page.getByTestId("poker-spectator-list")).toContainText(/Dana/);

        await expect(page.getByTestId("poker-street")).toHaveText("FLOP");
        await expect(page.getByTestId("poker-turn-banner")).toContainText(/BOB'S TURN/);

        await fixture.takeScreenshot("spectator-active-hand-full");
        await fixture.takeScreenshot("spectator-active-hand-panel", "poker-action-controls");
    });

    test("backwards-visible-opponents", async ({ page }) => {
        const fixture = new PokerFixturePage(page);
        await fixture.gotoFixture("backwards-visible-opponents");

        await expect(page.getByTestId("poker-title")).toHaveText("BACKWARDS POKER");
        expect(await fixture.getAttribute("poker-seat-p2", "data-visible-card-count")).toBe("2");
        expect(await fixture.getAttribute("poker-seat-p3", "data-visible-card-count")).toBe("2");

        await expect(page.getByTestId("poker-street")).toHaveText("PREFLOP");
        await expect(page.getByTestId("poker-turn-banner")).toHaveText("YOUR TURN");

        expect(await fixture.isEnabled("poker-check-call-button")).toBe(true);
        expect(await fixture.isEnabled("poker-fold-button")).toBe(true);
        expect(await fixture.isEnabled("poker-all-in-button")).toBe(true);

        await fixture.takeScreenshot("backwards-visible-opponents-full");
        await fixture.takeScreenshot("backwards-visible-opponents-seat", "poker-seat-p2");
    });

    test("tournament-over-host", async ({ page }) => {
        const fixture = new PokerFixturePage(page);
        await fixture.gotoFixture("tournament-over-host");

        await page.waitForSelector('[data-testid="poker-results-overlay"]');
        await expect(page.getByTestId("poker-results-overlay")).toBeVisible();
        await expect(page.getByTestId("poker-return-button")).toBeVisible();
        await expect(page.getByTestId("poker-results-title")).toContainText(/ALICE LEADS/);

        await expect(page.getByTestId("poker-street")).toHaveText("TOURNAMENT OVER");

        await fixture.takeScreenshot("tournament-over-host-full");
        await fixture.takeScreenshot("tournament-over-host-overlay", "poker-results-overlay");

        await page.getByTestId("poker-return-button").click();
        expect(await fixture.hostActions()).toEqual(["return_to_lobby"]);
    });
});
