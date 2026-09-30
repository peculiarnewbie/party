import { expect, test } from "@playwright/test";
import { MultiplayerRoomPage } from "./multiplayer-room-page";
import type { HerdPlayerView } from "../../src/game/herd/views";
import type { FunFactsPlayerView } from "../../src/game/fun-facts/views";

export function definePartyQuestionGame(gameType: "herd" | "fun_facts") {
    test(`${gameType} plays a Party round on real phones with a private-safe shared display`, async ({
        browser,
        baseURL,
    }, testInfo) => {
        test.setTimeout(120_000);
        const contexts = await Promise.all(
            Array.from({ length: 5 }, () =>
                browser.newContext({ viewport: { width: 390, height: 844 } }),
            ),
        );
        const errors: string[] = [];
        try {
            const roomId = `party-${gameType}-${crypto.randomUUID()}`;
            const players = [];
            for (const [index, name] of [
                "Host",
                "Alice",
                "Bob",
                "Charlie",
            ].entries()) {
                const page = await contexts[index].newPage();
                page.on("pageerror", (error) => errors.push(error.message));
                await page.goto(`${baseURL}/room/${roomId}?view=controller`, {
                    waitUntil: "domcontentloaded",
                });
                const room = new MultiplayerRoomPage(page);
                await expect(page.getByTestId("room-lobby")).toBeVisible({
                    timeout: 30_000,
                });
                await room.waitForDevtools();
                const id = await room.joinAsBrowser(name);
                await page.addStyleTag({
                    content:
                        '[data-testid="multiplayer-devtools"] { display: none !important; }',
                });
                players.push({ page, room, id });
            }
            const host = players[0];
            const display = await contexts[4].newPage();
            await display.setViewportSize({ width: 1920, height: 1080 });
            display.on("pageerror", (error) => errors.push(error.message));
            const frames: string[] = [];
            display.on("websocket", (socket) =>
                socket.on("framereceived", (frame) =>
                    frames.push(String(frame.payload)),
                ),
            );
            await display.goto(`${baseURL}/room/${roomId}?view=display`, {
                waitUntil: "domcontentloaded",
            });
            await expect(display.getByTestId("party-display")).toBeVisible({
                timeout: 30_000,
            });
            await host.room.selectGame(gameType);
            await host.room.startGame();
            const board = display.getByTestId(
                `${gameType === "herd" ? "herd" : "fun-facts"}-table-display`,
            );
            await expect(board).toBeVisible();
            await host.page
                .getByRole("textbox", { name: "Custom question" })
                .fill("What's your party answer?");
            await host.page
                .getByRole("button", { name: "START FIRST QUESTION" })
                .click();
            await expect(
                board.getByText("What's your party answer?"),
            ).toBeVisible();
            const answeringPlayers =
                gameType === "herd" ? players.slice(1) : players;
            const answers: Record<string, string | number> = {};
            for (const [index, player] of answeringPlayers.entries()) {
                const answer =
                    gameType === "herd"
                        ? ["Secret Dog", "Secret Dogs", "Secret Cat"][index]
                        : [91002, 91001, 91004, 91003][index];
                answers[player.id] = answer;
                await player.page
                    .getByLabel("Your answer")
                    .fill(String(answer));
                await player.page
                    .getByRole("button", { name: "SUBMIT", exact: true })
                    .click();
                await expect(
                    player.page.getByText("ANSWER SUBMITTED"),
                ).toBeVisible({ timeout: 15_000 });
            }
            await expect(board.getByTestId("display-answer-count")).toHaveText(
                `${answeringPlayers.length} / ${answeringPlayers.length}`,
            );
            expect(frames.join("\n")).not.toContain("Secret Dog");
            expect(frames.join("\n")).not.toContain("9100");
            await display.reload({ waitUntil: "domcontentloaded" });
            await expect(board.getByTestId("display-answer-count")).toHaveText(
                `${answeringPlayers.length} / ${answeringPlayers.length}`,
            );
            await display.screenshot({
                path: testInfo.outputPath("party-answering.png"),
            });
            await host.page
                .getByRole("button", { name: /CLOSE ANSWERS/ })
                .click();
            if (gameType === "herd") {
                await expect(
                    board.getByTestId("herd-display-answer-group"),
                ).toHaveCount(3);
                await host.page
                    .getByRole("button", {
                        name: "Secret Dog: 1 answers",
                        exact: true,
                    })
                    .click();
                await host.page
                    .getByRole("button", {
                        name: "Secret Dogs: 1 answers",
                        exact: true,
                    })
                    .click();
                await expect(
                    board.getByTestId("herd-display-answer-group"),
                ).toHaveCount(2);
                await expect(
                    board.getByText("Secret Dogs", { exact: true }),
                ).toBeVisible();
                await expect(
                    board.getByText("+1 pending", { exact: true }),
                ).toHaveCount(3);
                expect(
                    (await host.room.gameView<HerdPlayerView>()).players.every(
                        (player) => player.score === 0,
                    ),
                ).toBe(true);
                await host.page
                    .getByRole("button", {
                        name: "Separate Secret Dogs",
                        exact: true,
                    })
                    .click();
                await expect(
                    board.getByTestId("herd-display-answer-group"),
                ).toHaveCount(3);
                await host.page
                    .getByRole("button", {
                        name: "Secret Dog: 1 answers",
                        exact: true,
                    })
                    .click();
                await host.page
                    .getByRole("button", {
                        name: "Secret Dogs: 1 answers",
                        exact: true,
                    })
                    .click();
                await expect(
                    board.getByTestId("herd-display-answer-group"),
                ).toHaveCount(2);
                await display.reload({ waitUntil: "domcontentloaded" });
                await expect(
                    board.getByText("Secret Dogs", { exact: true }),
                ).toBeVisible();
                await expect(
                    board.getByText("+1 pending", { exact: true }),
                ).toHaveCount(3);
                await expect(
                    host.page.getByRole("button", {
                        name: /CONFIRM SCORING|MERGE SELECTED/,
                    }),
                ).toHaveCount(0);
            } else {
                await expect
                    .poll(
                        async () =>
                            (await host.room.gameView<FunFactsPlayerView>())
                                .phase,
                    )
                    .toBe("placing");
                while (true) {
                    const view = await host.room.gameView<FunFactsPlayerView>();
                    if (view.phase !== "placing") break;
                    await expect(
                        board.getByTestId("fun-facts-display-arrow"),
                    ).toHaveCount(view.placedArrows.length);
                    await expect(board.getByLabel("Hidden answer")).toHaveCount(
                        view.placedArrows.length,
                    );
                    const player = players.find(
                        (player) => player.id === view.currentPlacerId,
                    )!;
                    const position = view.placedArrows.filter(
                        (arrow) =>
                            Number(answers[arrow.playerId]) <=
                            Number(answers[player.id]),
                    ).length;
                    await player.page
                        .getByRole("button", { name: /PLACE HERE/ })
                        .nth(position)
                        .click();
                    await expect
                        .poll(
                            async () =>
                                (await host.room.gameView<FunFactsPlayerView>())
                                    .placedArrows.length,
                        )
                        .toBe(view.placedArrows.length + 1);
                }
                await expect(board.getByLabel("Revealed answer")).toHaveText([
                    "91001",
                    "91002",
                    "91003",
                    "91004",
                ]);
                await expect(board.getByText("In order · +1")).toHaveCount(4);
                await expect(
                    players[1].page.getByText("Look up for the reveal!"),
                ).toBeVisible();
            }
            await display.screenshot({
                path: testInfo.outputPath("party-reveal.png"),
            });
            await players[1].page.screenshot({
                path: testInfo.outputPath("phone-result.png"),
            });
            for (const player of players) {
                expect(
                    await player.page.evaluate(
                        () => document.documentElement.scrollWidth,
                    ),
                ).toBeLessThanOrEqual(390);
            }
            expect(
                await display.evaluate(
                    () => document.documentElement.scrollWidth,
                ),
            ).toBeLessThanOrEqual(1920);
            await expect(board.getByRole("button")).toHaveCount(0);
            await expect(board.getByRole("textbox")).toHaveCount(0);
            await host.page
                .getByRole("button", { name: "NEXT ROUND", exact: true })
                .click();
            await expect
                .poll(
                    async () =>
                        (
                            await host.room.gameView<
                                HerdPlayerView | FunFactsPlayerView
                            >()
                        ).phase,
                )
                .toBe("waiting");
            if (gameType === "herd") {
                expect(
                    (await host.room.gameView<HerdPlayerView>()).players.filter(
                        (player) => player.score === 1,
                    ),
                ).toHaveLength(2);
            }
            await expect(
                board.getByText("Ready for the next question?"),
            ).toBeVisible();
            await expect(
                board.getByTestId(
                    gameType === "herd"
                        ? "herd-display-answer-group"
                        : "fun-facts-display-arrow",
                ),
            ).toHaveCount(0);
            expect(errors).toEqual([]);
        } finally {
            await Promise.all(contexts.map((context) => context.close()));
        }
    });
}
