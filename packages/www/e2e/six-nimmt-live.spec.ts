import { expect, test } from "@playwright/test";
import { MultiplayerRoomPage } from "./helpers/multiplayer-room-page";
import type { SixNimmtPlayerView } from "../src/game/six-nimmt/schemas";

test("simultaneous private choices, reconnect, display reveal, and a full hand", async ({
    browser,
    baseURL,
}, testInfo) => {
    test.setTimeout(180_000);
    const contexts = await Promise.all(
        [0, 1, 2, 3].map(() =>
            browser.newContext({ viewport: { width: 390, height: 844 } }),
        ),
    );
    const errors: string[] = [];
    try {
        const roomId = `six-${crypto.randomUUID()}`;
        const players = [];
        for (const [i, name] of ["Alice", "Bob", "Cara"].entries()) {
            const page = await contexts[i]!.newPage();
            page.on("pageerror", (error) => errors.push(error.message));
            await page.goto(
                `${baseURL}/room/${roomId}${i ? "?view=controller" : ""}`,
            );
            const room = new MultiplayerRoomPage(page);
            await room.waitForDevtools();
            const id = await room.joinAsBrowser(name);
            players.push({ page, room, id });
        }
        const host = players[0]!;
        const display = await contexts[3]!.newPage();
        await display.setViewportSize({ width: 1920, height: 1080 });
        display.on("pageerror", (error) => errors.push(error.message));
        await display.goto(`${baseURL}/room/${roomId}?view=display`);
        await host.room.selectGame("six_nimmt");
        await host.room.startGame();
        for (const p of players)
            await expect(
                p.page.getByTestId("six-nimmt-hand").getByRole("button"),
            ).toHaveCount(10);
        await expect(display.getByTestId("six-nimmt-board")).toBeVisible();
        await expect(display.getByTestId("six-nimmt-hand")).toHaveCount(0);
        for (const [label, width, height] of [
            ["phone", 390, 844],
            ["small-phone", 360, 640],
            ["desktop", 1920, 1080],
            ["ultrawide", 2520, 1080],
        ] as const) {
            await host.page.setViewportSize({ width, height });
            const fit = await host.page
                .getByTestId("table-layout")
                .evaluate((el) => {
                    const controls = el.children[1]!;
                    return {
                        width: document.documentElement.scrollWidth,
                        height: document.documentElement.scrollHeight,
                        controlHeight: controls.clientHeight,
                        controlScroll: controls.scrollHeight,
                        bottom: controls.getBoundingClientRect().bottom,
                    };
                });
            expect(fit.width).toBeLessThanOrEqual(width);
            expect(fit.height).toBeLessThanOrEqual(height);
            expect(fit.bottom).toBeLessThanOrEqual(height);
            expect(fit.controlScroll).toBeLessThanOrEqual(
                fit.controlHeight + 1,
            );
            await host.page.screenshot({
                path: testInfo.outputPath(`${label}.png`),
            });
        }
        await host.page.setViewportSize({ width: 390, height: 844 });
        for (let turn = 1; turn <= 10; turn++) {
            for (const [i, p] of players.entries()) {
                await expect
                    .poll(
                        async () =>
                            (await p.room.gameView<SixNimmtPlayerView>())?.turn,
                    )
                    .toBe(turn);
                await p.page
                    .getByTestId("six-nimmt-hand")
                    .getByRole("button")
                    .first()
                    .click();
                await p.page.getByTestId("six-nimmt-lock").click();
                if (turn === 1 && i === 0) {
                    await expect(
                        display.getByTestId("six-nimmt-revealed-card"),
                    ).toHaveCount(0);
                    await p.page.reload();
                    await p.room.waitForDevtools();
                    await expect(
                        p.page.getByTestId("six-nimmt-lock"),
                    ).toHaveText("Card locked");
                }
            }
            for (let step = 0; step < 8; step++) {
                await expect
                    .poll(
                        async () => {
                            const v =
                                await host.room.gameView<SixNimmtPlayerView>();
                            return (
                                v &&
                                (v.stage.type === "choosing" ||
                                    v.stage.type === "round_over" ||
                                    v.stage.type === "game_over" ||
                                    v.turn > turn)
                            );
                        },
                        { timeout: 20_000 },
                    )
                    .toBe(true);
                const v = await host.room.gameView<SixNimmtPlayerView>();
                if (v.stage.type !== "choosing") break;
                const id = v.stage.playerId;
                const actor = players.find((p) => p.id === id)!;
                await actor.page.getByTestId("six-nimmt-row-0").click();
                await expect(
                    actor.page.getByTestId("six-nimmt-row-0"),
                ).toBeDisabled();
            }
        }
        const ended = await host.room.gameView<SixNimmtPlayerView>();
        expect(["round_over", "game_over"]).toContain(ended.stage.type);
        await display.screenshot({
            path: testInfo.outputPath("display-scores.png"),
        });
        if (ended.stage.type === "round_over") {
            await expect(
                players[1]!.page.getByTestId("six-nimmt-next"),
            ).toHaveCount(0);
            await host.page.getByTestId("six-nimmt-next").click();
            await expect(
                host.page.getByTestId("six-nimmt-hand").getByRole("button"),
            ).toHaveCount(10);
            await expect
                .poll(
                    async () =>
                        (await host.room.gameView<SixNimmtPlayerView>()).round,
                )
                .toBe(2);
        }
        expect(errors).toEqual([]);
    } finally {
        await Promise.all(contexts.map((context) => context.close()));
    }
});
