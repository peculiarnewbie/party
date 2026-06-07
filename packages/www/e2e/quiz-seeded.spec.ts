import { test, expect } from "@playwright/test";
import { QuizFixturePage } from "./helpers/quiz-fixture-page";

test.describe("quiz-seeded", () => {
    test("default-guest-answers", async ({ page }) => {
        const fixture = new QuizFixturePage(page);
        await fixture.gotoFixture("default");

        await expect(page.getByTestId("quiz-round-label")).toHaveText("Round 1");
        await expect(page.getByTestId("quiz-question")).toHaveText(
            "This is a sample question",
        );
        await expect(page.getByTestId("quiz-answer-a")).toBeEnabled();
        await expect(page.getByTestId("quiz-answer-b")).toBeEnabled();
        await expect(page.getByTestId("quiz-answer-c")).toBeEnabled();
        await expect(page.getByTestId("quiz-choose-prompt")).toBeVisible();

        await page.getByTestId("quiz-answer-b").click();

        const sent = await page.evaluate(
            () => window.__QUIZ_FIXTURE__?.sentMessages ?? [],
        );
        expect(sent).toEqual([
            {
                type: "answer",
                data: { answer: "b" },
            },
        ]);

        await expect(page.getByTestId("quiz-locked-label")).toBeVisible();
        await expect(page.getByTestId("quiz-waiting")).toBeVisible();
        await expect(page.getByTestId("quiz-my-answer")).toBeVisible();

        await fixture.takeScreenshot("default-guest-full");
        await fixture.takeScreenshot("default-guest-answers", "quiz-room");
    });

    test("default-answer-disabled-after-selection", async ({ page }) => {
        const fixture = new QuizFixturePage(page);
        await fixture.gotoFixture("default");

        await page.getByTestId("quiz-answer-a").click();

        await expect(page.getByTestId("quiz-answer-a")).toBeDisabled();
        await expect(page.getByTestId("quiz-answer-b")).toBeDisabled();
        await expect(page.getByTestId("quiz-answer-c")).toBeDisabled();

        await fixture.takeScreenshot("default-disabled-full");
    });

    test("answered-host-view", async ({ page }) => {
        const fixture = new QuizFixturePage(page);
        await fixture.gotoFixture("answered", { playerId: "p1" });

        await page.getByTestId("quiz-answer-a").click();

        await page.waitForSelector('[data-testid="quiz-host-answers"]');
        await expect(page.getByTestId("quiz-host-answers")).toBeVisible();

        const hostAnswersText = await page
            .getByTestId("quiz-host-answers")
            .textContent();
        expect(hostAnswersText).toMatch(/Alice/);
        expect(hostAnswersText).toMatch(/Bob/);
        expect(hostAnswersText).toMatch(/Cara/);

        await fixture.takeScreenshot("answered-host-full");
        await fixture.takeScreenshot("answered-host-panel", "quiz-host-answers");
    });
});
