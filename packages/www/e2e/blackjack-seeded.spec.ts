import { test, expect } from "@playwright/test";
import { BlackjackFixturePage } from "./helpers/blackjack-fixture-page";

test.describe("blackjack-seeded", () => {
    test("betting-phase", async ({ page }) => {
        const fixture = new BlackjackFixturePage(page);
        await fixture.gotoFixture("betting-phase");

        await expect(page.getByTestId("blackjack-room")).toBeVisible();
        await expect(page.getByText("PLACE YOUR BET")).toBeVisible();
        await expect(page.getByRole("button", { name: "DEAL" })).toBeVisible();
        await expect(page.getByRole("button", { name: "$50" })).toBeVisible();

        await page.getByRole("button", { name: "DEAL" }).click();

        const sent = await fixture.sentMessages();
        expect(sent).toEqual([
            {
                type: "blackjack:bet",
                data: { amount: 50 },
            },
        ]);

        await fixture.takeScreenshot("betting-phase-full");
        await fixture.takeScreenshot(
            "betting-phase-controls",
            "blackjack-room",
        );
    });

    test("my-turn-playing", async ({ page }) => {
        const fixture = new BlackjackFixturePage(page);
        await fixture.gotoFixture("my-turn-playing");

        await expect(page.getByTestId("blackjack-room")).toBeVisible();
        await expect(page.getByText("YOUR TURN")).toBeVisible();
        await expect(page.getByText("HIT")).toBeVisible();
        await expect(page.getByText("STAND")).toBeVisible();
        await expect(page.getByText("DOUBLE")).toBeVisible();

        await page.getByText("HIT").click();

        const sent = await fixture.sentMessages();
        expect(sent).toEqual([
            {
                type: "blackjack:hit",
                data: {},
            },
        ]);

        await fixture.takeScreenshot("my-turn-playing-full");
        await fixture.takeScreenshot("my-turn-playing-hand", "blackjack-room");
    });

    test("my-turn-stand", async ({ page }) => {
        const fixture = new BlackjackFixturePage(page);
        await fixture.gotoFixture("my-turn-playing");

        await page.getByRole("button", { name: "STAND" }).click();

        expect(await fixture.sentMessages()).toEqual([
            {
                type: "blackjack:stand",
                data: {},
            },
        ]);
    });

    test("my-turn-double", async ({ page }) => {
        const fixture = new BlackjackFixturePage(page);
        await fixture.gotoFixture("my-turn-playing");

        await page.getByRole("button", { name: "DOUBLE" }).click();

        expect(await fixture.sentMessages()).toEqual([
            {
                type: "blackjack:double",
                data: {},
            },
        ]);
    });

    test("round-over", async ({ page }) => {
        const fixture = new BlackjackFixturePage(page);
        await fixture.gotoFixture("round-over");

        await expect(page.getByTestId("blackjack-room")).toBeVisible();
        await expect(page.getByText("Alice:")).toBeVisible();
        await expect(page.getByText("Bob:")).toBeVisible();
        await expect(page.getByText("WIN").first()).toBeVisible();
        await expect(page.getByText("BUST").first()).toBeVisible();
        await expect(page.getByText("+50")).toBeVisible();
        await expect(page.getByText("-50")).toBeVisible();

        await fixture.takeScreenshot("round-over-full");
        await fixture.takeScreenshot("round-over-results", "blackjack-room");
    });

    test("insurance-prompt", async ({ page }) => {
        const fixture = new BlackjackFixturePage(page);
        await fixture.gotoFixture("insurance-prompt");

        await expect(page.getByTestId("blackjack-room")).toBeVisible();
        await expect(
            page.getByText("DEALER SHOWS ACE - INSURANCE?"),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: "YES" })).toBeVisible();
        await expect(page.getByRole("button", { name: "NO" })).toBeVisible();

        await page.getByRole("button", { name: "YES" }).click();

        const sent = await fixture.sentMessages();
        expect(sent).toEqual([
            {
                type: "blackjack:insurance",
                data: { accept: true },
            },
        ]);

        await fixture.takeScreenshot("insurance-prompt-full");
        await fixture.takeScreenshot(
            "insurance-prompt-controls",
            "blackjack-room",
        );
    });

    test("insurance-decline", async ({ page }) => {
        const fixture = new BlackjackFixturePage(page);
        await fixture.gotoFixture("insurance-prompt");

        await page.getByRole("button", { name: "NO" }).click();

        expect(await fixture.sentMessages()).toEqual([
            {
                type: "blackjack:insurance",
                data: { accept: false },
            },
        ]);
    });

    test("split-available", async ({ page }) => {
        const fixture = new BlackjackFixturePage(page);
        await fixture.gotoFixture("split-available");

        await expect(page.getByTestId("blackjack-room")).toBeVisible();
        await expect(page.getByText("YOUR TURN")).toBeVisible();
        await expect(page.getByRole("button", { name: "SPLIT" })).toBeVisible();

        await page.getByRole("button", { name: "SPLIT" }).click();

        expect(await fixture.sentMessages()).toEqual([
            {
                type: "blackjack:split",
                data: {},
            },
        ]);

        await fixture.takeScreenshot("split-available-full");
        await fixture.takeScreenshot("split-available-controls", "blackjack-room");
    });
});
