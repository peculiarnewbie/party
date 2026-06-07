import { test, expect } from "@playwright/test";
import { RpsFixturePage } from "./helpers/rps-fixture-page";

test.describe("rps-seeded", () => {
    test("standard-my-turn", async ({ page }) => {
        const fixture = new RpsFixturePage(page);
        await fixture.gotoFixture("standard-my-turn");

        await expect(page.getByTestId("rps-title")).toHaveText("RPS TOURNAMENT");
        await expect(page.getByTestId("rps-round-label")).toHaveText("FINAL");
        await expect(page.getByTestId("rps-throw-prompt")).toBeVisible();
        await expect(page.getByTestId("rps-throw-rock")).toBeEnabled();
        await expect(page.getByTestId("rps-throw-paper")).toBeEnabled();
        await expect(page.getByTestId("rps-throw-scissors")).toBeEnabled();

        await page.getByTestId("rps-throw-rock").click();

        const sent = await page.evaluate(
            () => window.__RPS_FIXTURE__?.sentMessages ?? [],
        );
        expect(sent).toEqual([
            {
                type: "rps:throw",
                data: { choice: "rock" },
            },
        ]);

        await fixture.takeScreenshot("standard-my-turn-full");
        await fixture.takeScreenshot("standard-my-turn-match", "rps-active-match");
    });

    test("round-results", async ({ page }) => {
        const fixture = new RpsFixturePage(page);
        await fixture.gotoFixture("round-results");

        await expect(page.getByTestId("rps-round-results")).toBeVisible();
        await expect(page.getByTestId("rps-results-title")).toHaveText(
            "SEMIFINAL RESULTS",
        );
        await expect(page.getByTestId("rps-next-round-button")).toBeEnabled();
        await expect(page.getByTestId("rps-bracket")).toBeVisible();
        await expect(page.getByTestId("rps-bracket-title")).toHaveText("BRACKET");

        await page.getByTestId("rps-next-round-button").click();

        const sent = await page.evaluate(
            () => window.__RPS_FIXTURE__?.sentMessages ?? [],
        );
        expect(sent).toEqual([
            {
                type: "rps:next_round",
                data: {},
            },
        ]);

        await fixture.takeScreenshot("round-results-full");
        await fixture.takeScreenshot("round-results-panel", "rps-round-results");
    });

    test("tournament-over", async ({ page }) => {
        const fixture = new RpsFixturePage(page);
        await fixture.gotoFixture("tournament-over");

        await expect(page.getByTestId("rps-tournament-over")).toBeVisible();
        await expect(page.getByTestId("rps-champion-label")).toHaveText(
            "TOURNAMENT CHAMPION",
        );
        await expect(page.getByTestId("rps-champion-name")).toHaveText("ALICE");
        await expect(page.getByTestId("rps-return-button")).toBeVisible();

        await fixture.takeScreenshot("tournament-over-full");
        await fixture.takeScreenshot(
            "tournament-over-panel",
            "rps-tournament-over",
        );

        await page.getByTestId("rps-return-button").click();

        const hostActions = await page.evaluate(
            () => window.__RPS_FIXTURE__?.hostActions ?? [],
        );
        expect(hostActions).toEqual(["return_to_lobby"]);
    });

    test("bye-round", async ({ page }) => {
        const fixture = new RpsFixturePage(page);
        await fixture.gotoFixture("bye-round");

        await expect(page.getByTestId("rps-bye")).toBeVisible();
        await expect(page.getByTestId("rps-bye-title")).toHaveText("BYE");
        await expect(page.getByTestId("rps-throw-rock")).toHaveCount(0);
        await expect(page.getByTestId("rps-bracket")).toBeVisible();

        await fixture.takeScreenshot("bye-round-full");
        await fixture.takeScreenshot("bye-round-panel", "rps-bye");
    });
});
