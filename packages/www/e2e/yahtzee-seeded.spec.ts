import { test, expect } from "@playwright/test";
import { YahtzeeFixturePage } from "./helpers/yahtzee-fixture-page";

test.describe("yahtzee-seeded", () => {
    test("standard-my-turn-pre-roll", async ({ page }) => {
        const fixture = new YahtzeeFixturePage(page);
        await fixture.gotoFixture("standard-my-turn-pre-roll");

        await expect(page.getByTestId("yahtzee-title")).toContainText(/YAHTZEE/);
        await expect(page.getByTestId("yahtzee-round")).toHaveText(
            "ROUND 3 / 13",
        );
        await expect(page.getByTestId("yahtzee-roll-button")).toBeEnabled();
        await expect(page.getByTestId("scorecard-cell-p1-chance")).toHaveText("");

        for (const index of [0, 1, 2, 3, 4]) {
            await expect(page.getByTestId(`yahtzee-die-${index}`)).toHaveAttribute(
                "data-has-value",
                "false",
            );
        }

        await fixture.takeScreenshot("standard-my-turn-pre-roll-full");
        await fixture.takeScreenshot(
            "standard-my-turn-pre-roll-dice",
            "yahtzee-room",
        );
    });

    test("standard-my-turn-after-roll", async ({ page }) => {
        const fixture = new YahtzeeFixturePage(page);
        await fixture.gotoFixture("standard-my-turn-after-roll");

        await expect(page.getByTestId("yahtzee-my-score")).toHaveText("30 PTS");
        await expect(page.getByTestId("yahtzee-roll-button")).toHaveText(
            "ROLL (1 LEFT)",
        );
        await expect(
            page.getByTestId("scorecard-cell-p1-three_of_a_kind"),
        ).toHaveText("26");
        await expect(
            page.getByTestId("scorecard-cell-p1-three_of_a_kind"),
        ).toHaveAttribute("data-suggested", "true");
        await expect(
            page.getByTestId("scorecard-cell-p1-chance"),
        ).toHaveAttribute("data-suggested", "true");
        await expect(page.getByTestId("yahtzee-die-0")).toHaveAttribute(
            "data-held",
            "true",
        );
        await expect(page.getByTestId("yahtzee-die-2")).toHaveAttribute(
            "data-held",
            "true",
        );

        await fixture.takeScreenshot("standard-my-turn-after-roll-full");
        await fixture.takeScreenshot(
            "standard-my-turn-after-roll-scorecard",
            "yahtzee-scorecard",
        );
    });

    test("lying-opponent-awaiting-response", async ({ page }) => {
        const fixture = new YahtzeeFixturePage(page);
        await fixture.gotoFixture("lying-opponent-awaiting-response", {
            playerId: "p2",
        });

        await expect(page.getByTestId("yahtzee-pending-claim")).toBeVisible();
        await expect(page.getByTestId("yahtzee-believe-button")).toBeEnabled();
        await expect(page.getByTestId("yahtzee-liar-button")).toBeEnabled();
        await expect(page.getByTestId("yahtzee-claim-panel")).toHaveCount(0);
        await expect(page.getByTestId("yahtzee-die-0")).toHaveAttribute(
            "data-has-value",
            "false",
        );

        await fixture.takeScreenshot("lying-opponent-awaiting-response-full");
        await fixture.takeScreenshot(
            "lying-opponent-awaiting-response-panel",
            "yahtzee-pending-claim",
        );

        await page.getByTestId("yahtzee-believe-button").click();

        const sentMessages = await page.evaluate(
            () => window.__YAHTZEE_FIXTURE__?.sentMessages ?? [],
        );
        expect(sentMessages).toEqual([
            {
                type: "yahtzee:accept_claim",
                data: {},
            },
        ]);
    });

    test("lying-reveal-caught-lying", async ({ page }) => {
        const fixture = new YahtzeeFixturePage(page);
        await fixture.gotoFixture("lying-reveal-caught-lying", {
            playerId: "p2",
        });

        await page.waitForSelector('[data-testid="yahtzee-announcement"]');
        await expect(page.getByTestId("yahtzee-announcement")).toContainText(
            /ALICE GOT CAUGHT LYING/,
        );
        await expect(
            page.getByTestId("scorecard-cell-p1-full_house"),
        ).toHaveText("-25");
        await expect(page.getByTestId("yahtzee-roll-button")).toBeEnabled();
        await expect(
            page.getByTestId("yahtzee-last-turn-reveal"),
        ).toBeVisible();

        await fixture.takeScreenshot("lying-reveal-caught-lying-full");
        await fixture.takeScreenshot(
            "lying-reveal-caught-lying-reveal",
            "yahtzee-last-turn-reveal",
        );
    });

    test("standard-game-over", async ({ page }) => {
        const fixture = new YahtzeeFixturePage(page);
        await fixture.gotoFixture("standard-game-over");

        await expect(page.getByTestId("yahtzee-game-over")).toBeVisible();
        await expect(page.getByTestId("yahtzee-return-button")).toBeVisible();
        await expect(page.getByTestId("yahtzee-roll-button")).toHaveCount(0);

        const gameOverText = (
            (await page.getByTestId("yahtzee-game-over").textContent()) ?? ""
        ).replace(/\s+/g, "");
        expect(gameOverText).toMatch(/GAMEOVERALICE421WINNERBOB197RETURNTOLOBBY/);

        await fixture.takeScreenshot("standard-game-over-full");
        await fixture.takeScreenshot(
            "standard-game-over-panel",
            "yahtzee-game-over",
        );

        await page.getByTestId("yahtzee-return-button").click();

        const hostActions = await page.evaluate(
            () => window.__YAHTZEE_FIXTURE__?.hostActions ?? [],
        );
        expect(hostActions).toEqual(["return_to_lobby"]);
    });
});
