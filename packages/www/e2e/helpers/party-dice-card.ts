import { expect, test } from "@playwright/test";
import { Schema } from "effect";
import { displayMessageSchema } from "../../src/room/display-protocol";
import { MultiplayerRoomPage } from "./multiplayer-room-page";
import type { GoFishPlayerView } from "../../src/game/go-fish";
import type { YahtzeePlayerView } from "../../src/game/yahtzee";

export function defineDiceCardPartyTest(gameType: "yahtzee" | "go_fish") {
    test(`${gameType} plays on two phones with a public display`, async ({
        page,
        browser,
    }, testInfo) => {
        const id = `party-${gameType}-${crypto.randomUUID().slice(0, 8)}`;
        const gameId = gameType.replaceAll("_", "-");
        await page.setViewportSize({ width: 320, height: 740 });
        await page.goto(`/room/${id}?view=controller`);
        const host = new MultiplayerRoomPage(page);
        await host.waitForDevtools();
        const aliceId = await host.joinAsBrowser("Alice");
        const guestContext = await browser.newContext({
            viewport: { width: 390, height: 844 },
        });
        const guest = await guestContext.newPage();
        const display = await page.context().newPage();
        const received: string[] = [];
        const sent: string[] = [];
        const errors: string[] = [];
        for (const screen of [page, guest, display])
            screen.on("pageerror", (error) => errors.push(error.message));
        display.on("websocket", (socket) => {
            if (!socket.url().includes(`/api/room/${id}`)) return;
            socket.on("framereceived", (frame) =>
                received.push(String(frame.payload)),
            );
            socket.on("framesent", (frame) => sent.push(String(frame.payload)));
        });
        try {
            await guest.goto(`/room/${id}?view=controller`);
            const bob = new MultiplayerRoomPage(guest);
            await bob.waitForDevtools();
            const bobId = await bob.joinAsBrowser("Bob");
            await display.setViewportSize({ width: 1440, height: 1080 });
            await display.goto(`/room/${id}?view=display`);
            await expect(display.getByText("Players · 2")).toBeVisible();
            await host.selectGame(gameType);
            await host.startGame();
            const table = display.getByTestId(`${gameId}-table-display`);
            await expect(table).toBeVisible();
            for (const phone of [page, guest]) {
                await expect(
                    phone.getByTestId(`${gameId}-room`),
                ).toHaveAttribute("data-layout", "controller");
                await expect(
                    phone.getByTestId("party-layout-toggle"),
                ).toHaveCount(0);
            }
            await expect(table.getByRole("button")).toHaveCount(0);
            if (gameType === "yahtzee") {
                const current = await host.gameView<YahtzeePlayerView>();
                const actor =
                    current.currentPlayerId === aliceId ? page : guest;
                const watcher =
                    current.currentPlayerId === aliceId ? guest : page;
                const actorRoom =
                    current.currentPlayerId === aliceId ? host : bob;
                await expect(
                    watcher.getByTestId("yahtzee-roll-button"),
                ).toHaveCount(0);
                await actor.getByTestId("yahtzee-roll-button").click();
                await expect
                    .poll(
                        async () =>
                            (await actorRoom.gameView<YahtzeePlayerView>())
                                .rollsLeft,
                    )
                    .toBe(2);
                await actor.getByTestId("yahtzee-die-0").click();
                await expect(
                    actor.getByTestId("yahtzee-die-0"),
                ).toHaveAttribute("data-held", "true");
                await expect(
                    table.getByRole("img", { name: /Die showing/ }),
                ).toHaveCount(5);
                await actor
                    .getByTestId(
                        `scorecard-cell-${current.currentPlayerId}-chance`,
                    )
                    .click();
                await expect
                    .poll(
                        async () =>
                            (await actorRoom.gameView<YahtzeePlayerView>())
                                .currentPlayerId,
                    )
                    .not.toBe(current.currentPlayerId);
            } else {
                const current = await host.gameView<GoFishPlayerView>();
                const actor =
                    current.currentPlayerId === aliceId ? page : guest;
                const actorRoom =
                    current.currentPlayerId === aliceId ? host : bob;
                const watcher =
                    current.currentPlayerId === aliceId ? guest : page;
                await expect(
                    watcher
                        .getByTestId("go-fish-hand")
                        .getByRole("button")
                        .first(),
                ).toBeDisabled();
                const opponent =
                    current.currentPlayerId === aliceId ? "Bob" : "Alice";
                await actor
                    .getByTestId("go-fish-opponents")
                    .getByRole("button", { name: new RegExp(opponent) })
                    .click();
                await actor
                    .getByTestId("go-fish-hand")
                    .getByRole("button")
                    .first()
                    .click();
                await expect
                    .poll(
                        async () =>
                            (await actorRoom.gameView<GoFishPlayerView>())
                                .lastAction?.type,
                    )
                    .toBe("ask");
                await expect(table.getByLabel(/Asked for/)).toBeVisible();
                if (
                    (await actorRoom.gameView<GoFishPlayerView>()).turnPhase ===
                    "go_fish"
                ) {
                    const before = (
                        await actorRoom.gameView<GoFishPlayerView>()
                    ).drawPileCount;
                    await actor
                        .getByRole("button", { name: "Go Fish!", exact: true })
                        .click();
                    await expect
                        .poll(
                            async () =>
                                (await actorRoom.gameView<GoFishPlayerView>())
                                    .drawPileCount,
                        )
                        .toBe(before - 1);
                }
                expect(
                    await bob.gameView<GoFishPlayerView>(bobId),
                ).toHaveProperty("myHand");
            }
            for (const phone of [page, guest]) {
                await phone.addStyleTag({
                    content:
                        '[data-testid="multiplayer-devtools"] { display:none !important; }',
                });
                expect(
                    await phone.evaluate(
                        () =>
                            document.documentElement.scrollWidth <= innerWidth,
                    ),
                ).toBe(true);
            }
            await page.screenshot({
                path: testInfo.outputPath("phone.png"),
                fullPage: true,
            });
            await table.screenshot({
                path: testInfo.outputPath("display.png"),
            });
            await display.reload();
            await expect(table).toBeVisible();
            expect(sent).toEqual([]);
            expect(errors).toEqual([]);
            for (const frame of received) {
                const view = Schema.decodeUnknownSync(displayMessageSchema)(
                    JSON.parse(frame),
                ).data.game?.view;
                if (!view) continue;
                expect(view).not.toHaveProperty("myId");
                expect(view).not.toHaveProperty("myHand");
                expect(view).not.toHaveProperty("drawPile");
                expect(view).not.toHaveProperty("canRoll");
            }
            await page
                .getByRole("button", { name: "END", exact: true })
                .click();
            if (gameType === "yahtzee")
                await page.getByTestId("yahtzee-return-button").click();
            await expect(display.getByTestId("join-qr")).toBeVisible();
        } finally {
            await guestContext.close();
            await display.close();
        }
    });
}
