import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function signIn(page: Page) {
    await page.goto("/");
    await page
        .getByLabel("Admin password")
        .fill(process.env.QUIZ_MANAGER_TEST_PASSWORD ?? "local-test-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("link", { name: "+ New Quiz" })).toBeVisible();
}

async function createQuiz(page: Page, title: string) {
    await page.getByRole("link", { name: "+ New Quiz" }).click();
    await page.getByLabel("Quiz title", { exact: true }).fill(title);
    await page
        .getByRole("button", { name: "Create quiz", exact: true })
        .click();
    await expect(
        page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Question", { exact: true })).toBeVisible();
}

async function deleteQuiz(page: Page, title: string) {
    await page.goto("/");
    await page
        .getByRole("row")
        .filter({ hasText: title })
        .getByRole("button", { name: "DELETE" })
        .click();
    await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(
        0,
    );
}

test("quiz editor validates answers, continues authoring, previews and persists order and edits", async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("dialog", (dialog) => dialog.accept());
    const title = `Friday night trivia ${crypto.randomUUID().slice(0, 6)}`;
    const tag = `Browser tag ${crypto.randomUUID()}`;
    await page.goto("/");
    await page.getByLabel("Admin password").fill("incorrect-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toHaveText("Invalid password");
    await signIn(page);
    await createQuiz(page, title);
    const quizUrl = page.url();
    await page
        .getByLabel("Question", { exact: true })
        .fill("Which planet has the most prominent rings?");
    await page
        .getByRole("button", { name: "Save question", exact: true })
        .click();
    await expect(page.getByRole("alert")).toHaveText(
        /Fill in at least two answers/,
    );
    await page
        .getByRole("textbox", { name: "Answer A", exact: true })
        .fill("Saturn");
    await page
        .getByRole("textbox", { name: "Answer B", exact: true })
        .fill("Jupiter");
    await page
        .getByRole("button", { name: "+ Add answer", exact: true })
        .click();
    await page
        .getByRole("textbox", { name: "Answer C", exact: true })
        .fill("Mars");
    await page
        .getByRole("button", { name: "+ Add answer", exact: true })
        .click();
    await page
        .getByRole("textbox", { name: "Answer D", exact: true })
        .fill("Neptune");
    await page
        .getByRole("button", { name: "Save question", exact: true })
        .click();
    await expect(page.getByRole("alert")).toHaveText(
        "Mark at least one answer as correct.",
    );
    await page.getByRole("checkbox", { name: "Mark answer A correct" }).check();
    const preview = page.getByRole("region", { name: "Question preview" });
    await expect(preview.getByText("Saturn", { exact: true })).toBeVisible();
    await expect(preview.getByText("Correct", { exact: true })).toHaveCount(0);
    await preview.getByRole("button", { name: "Show answers" }).click();
    await expect(preview.getByText("Correct", { exact: true })).toBeVisible();
    await page.screenshot({
        path: testInfo.outputPath("quiz-editor-desktop.png"),
        fullPage: true,
    });
    await page.getByRole("button", { name: "Save & add another" }).click();
    await expect(
        page.getByText("1 saved question", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Question", { exact: true })).toHaveValue("");
    await expect(
        page.getByRole("textbox", { name: "Answer A", exact: true }),
    ).toHaveValue("");
    await page.getByRole("button", { name: /^Short answer/ }).click();
    await page
        .getByLabel("Question", { exact: true })
        .fill("Name the largest planet.");
    await page.getByLabel("Accepted answer 1", { exact: true }).fill("Jupiter");
    await page
        .getByRole("button", { name: "Save question", exact: true })
        .click();
    await expect(
        page.getByText("2 saved questions", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Move question 2 up" }).click();
    await expect(page.getByTestId(/^saved-question-/).first()).toContainText(
        "Name the largest planet.",
    );
    await page.reload();
    await expect(page.getByTestId(/^saved-question-/).first()).toContainText(
        "Name the largest planet.",
    );
    await page
        .getByRole("button", { name: "Edit question 2", exact: true })
        .click();
    await expect(
        page.getByRole("textbox", { name: "Answer A", exact: true }),
    ).toHaveValue("Saturn");
    await expect(
        page.getByRole("checkbox", { name: "Mark answer A correct" }),
    ).toBeChecked();
    await page
        .getByLabel("Question", { exact: true })
        .fill("Which planet is famous for its rings?");
    await page.screenshot({
        path: testInfo.outputPath("quiz-editor-desktop.png"),
        fullPage: true,
    });
    await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
    await page.reload();
    await expect(page.getByTestId(/^saved-question-/).nth(1)).toContainText(
        "Which planet is famous for its rings?",
    );
    await page
        .getByRole("button", { name: "Preview question 2", exact: true })
        .click();
    await expect(preview.getByText("Saturn", { exact: true })).toBeVisible();
    await expect(preview.getByText("Correct", { exact: true })).toHaveCount(0);

    await page.goto("/tags");
    await page.getByPlaceholder("New tag name").fill(tag);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(tag, { exact: true })).toBeVisible();
    await page.getByPlaceholder("New tag name").fill(tag);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(
        page.getByText("A tag with that name already exists."),
    ).toBeVisible();
    await page.goto(quizUrl);
    await page.locator("summary").filter({ hasText: /^Tags/ }).click();
    await page.getByRole("button", { name: tag, exact: true }).click();
    await expect(
        page.getByRole("button", { name: tag, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await page.locator("summary").filter({ hasText: /^Tags/ }).click();
    await expect(
        page.getByRole("button", { name: tag, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await deleteQuiz(page, title);
    await page.goto("/tags");
    await page
        .getByText(tag, { exact: true })
        .locator("../..")
        .getByRole("button", { name: "DELETE" })
        .click();
    await expect(page.getByText(tag, { exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
});

test("phone editor preserves failed saves and protects unsaved work", async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 320, height: 740 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await signIn(page);
    const title = `Animal trivia ${crypto.randomUUID().slice(0, 6)}`;
    await createQuiz(page, title);
    await page
        .getByLabel("Question", { exact: true })
        .fill("Which animal can fly?");
    await page
        .getByRole("textbox", { name: "Answer A", exact: true })
        .pressSequentially("A bat");
    await expect(
        page.getByRole("textbox", { name: "Answer A", exact: true }),
    ).toBeFocused();
    await page
        .getByRole("textbox", { name: "Answer B", exact: true })
        .fill("A dog");
    await page.getByRole("checkbox", { name: "Mark answer A correct" }).check();
    await page
        .getByRole("button", { name: "Show preview", exact: true })
        .click();
    await expect(
        page
            .getByRole("region", { name: "Question preview" })
            .getByText("A bat", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
        path: testInfo.outputPath("quiz-editor-phone.png"),
        fullPage: true,
    });
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        )
        .toBe(true);
    await page.route(
        /\/api\/rpc\/?$/,
        (route) => {
            const request = route.request().postDataJSON();
            return route.fulfill({
                json: [
                    {
                        _tag: "Exit",
                        requestId: request.id,
                        exit: {
                            _tag: "Failure",
                            cause: [
                                {
                                    _tag: "Fail",
                                    error: { _tag: "ServiceUnavailableError" },
                                },
                            ],
                        },
                    },
                ],
            });
        },
        { times: 1 },
    );
    await page
        .getByRole("button", { name: "Save question", exact: true })
        .click();
    await expect(page.getByRole("alert")).toContainText(
        "The request could not be completed.",
    );
    await expect(
        page.getByRole("textbox", { name: "Answer A", exact: true }),
    ).toHaveValue("A bat");
    await page.getByRole("button", { name: "Save & add another" }).click();
    await expect(
        page.getByText("1 saved question", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^Short answer/ }).click();
    await page
        .getByLabel("Question", { exact: true })
        .fill("Tell us something you like.");
    await page.getByLabel("Matching rule 1").selectOption("any");
    await page.getByRole("button", { name: "Save & add another" }).click();
    await expect(
        page.getByText("2 saved questions", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^Open question/ }).click();
    await page
        .getByLabel("Question", { exact: true })
        .fill("What was the best part of your week?");
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByLabel("Question", { exact: true })).toHaveValue(
        "What was the best part of your week?",
    );
    await page.getByRole("button", { name: "Save & add another" }).click();
    await expect(
        page.getByText("3 saved questions", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^Section break/ }).click();
    await page.getByLabel("Section title", { exact: true }).fill("Round two");
    await page
        .getByRole("button", { name: "Save question", exact: true })
        .click();
    await expect(
        page.getByText("4 saved questions", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Show saved questions" }).click();
    await expect(page.getByTestId(/^saved-question-/)).toHaveCount(4);
    await page
        .getByRole("button", { name: "Edit question 2", exact: true })
        .click();
    await expect(page.getByLabel("Matching rule 1")).toHaveValue("any");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        )
        .toBe(true);
    page.on("dialog", (dialog) => dialog.accept());
    await deleteQuiz(page, title);
    expect(errors).toEqual([]);
});
