import { expect, test } from "@playwright/test";
import { nanoid } from "nanoid";
import { Schema } from "effect";
import { displayMessageSchema } from "../../src/room/display-protocol";
import type { Flip7PlayerView } from "../../src/game/flip-7";
import type { PerudoPlayerView } from "../../src/game/perudo";
import { MultiplayerRoomPage } from "./multiplayer-room-page";

export function definePartyModeTest(
    gameType: "flip_7" | "blackjack" | "perudo",
) {
    test(`${gameType} Party mode connects two phones and a public display`, async ({
        page,
        browser,
    }, testInfo) => {
        const roomId = `party-${gameType}-${nanoid(6).toLowerCase()}`;
        const gameId = gameType.replaceAll("_", "-");
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`/room/${roomId}?view=controller`);
        const host = new MultiplayerRoomPage(page);
        await host.waitForDevtools();
        await host.waitForPlayerConnected(
            (await host.snapshot()).activePlayerId,
        );
        const aliceId = await host.joinAsBrowser("Alice");
        const display = await page.context().newPage();
        await display.setViewportSize({ width: 1920, height: 1080 });
        const received: string[] = [];
        const sent: string[] = [];
        display.on("websocket", (socket) => {
            if (!socket.url().includes(`/api/room/${roomId}`)) return;
            socket.on("framereceived", (frame) =>
                received.push(String(frame.payload)),
            );
            socket.on("framesent", (frame) => sent.push(String(frame.payload)));
        });
        await display.goto(`/room/${roomId}?view=display`);
        await expect(display.getByTestId("join-qr")).toBeVisible();
        const joinLink = await display
            .locator('a[href*="view=controller"]')
            .getAttribute("href");
        if (!joinLink) throw new Error("Missing phone join link");
        const guestContext = await browser.newContext({
            viewport: { width: 390, height: 844 },
        });
        const guest = await guestContext.newPage();
        try {
            await guest.goto(joinLink);
            const bob = new MultiplayerRoomPage(guest);
            await bob.waitForDevtools();
            await bob.waitForPlayerConnected(
                (await bob.snapshot()).activePlayerId,
            );
            const bobId = await bob.joinAsBrowser("Bob");
            await expect(display.getByText("Players · 2")).toBeVisible();
            if (gameType === "flip_7") await host.addPlayerAndJoin("Charlie");
            await host.selectGame(gameType);
            await host.startGame();
            const table = display.getByTestId(`${gameId}-table-display`);
            await expect(table).toBeVisible();
            for (const phone of [page, guest]) {
                await expect(
                    phone.getByTestId(`${gameId}-room`),
                ).toHaveAttribute("data-layout", "controller");
            }
            await expect(
                display.getByTestId(`display-seat-${aliceId}`),
            ).toBeVisible();
            await expect(
                display.getByTestId(`display-seat-${bobId}`),
            ).toBeVisible();
            await expect(page.getByTestId("party-layout-toggle")).toHaveCount(
                0,
            );
            await display.reload();
            await expect(table).toBeVisible();
            if (gameType === "perudo") {
                await expect(
                    page.getByTestId("perudo-my-dice").locator("svg"),
                ).toHaveCount(5);
                await expect(
                    guest.getByTestId("perudo-my-dice").locator("svg"),
                ).toHaveCount(5);
                await expect(
                    display.getByTestId(`display-seat-${aliceId}`),
                ).toHaveAttribute("data-visible-dice-count", "0");
                await page
                    .getByRole("button", { name: "OPEN BIDDING" })
                    .click();
                const view = await host.gameView<PerudoPlayerView>();
                const bidder = view.currentPlayerId === aliceId ? page : guest;
                const challenger =
                    view.currentPlayerId === aliceId ? guest : page;
                await expect(
                    bidder.getByRole("button", {
                        name: "CHALLENGE",
                        exact: true,
                    }),
                ).toBeDisabled();
                await bidder
                    .getByRole("button", { name: "BID", exact: true })
                    .click();
                await expect(
                    display.getByTestId("perudo-display-bid"),
                ).toBeVisible();
                await challenger
                    .getByRole("button", { name: "CHALLENGE", exact: true })
                    .click();
                await expect(
                    display.getByTestId("perudo-display-result"),
                ).toBeVisible();
                await expect(
                    display.locator('[data-visible-dice-count="5"]'),
                ).not.toHaveCount(0);
                await expect(
                    display.getByTestId("perudo-display-result"),
                ).toHaveCount(0, { timeout: 12000 });
                await expect(
                    display.locator('[data-visible-dice-count="0"]'),
                ).toHaveCount(2);
            } else if (gameType === "blackjack") {
                await expect(
                    page.getByTestId("blackjack-player-dealer"),
                ).toHaveCount(0);
                await expect(
                    guest.getByTestId("blackjack-player-dealer"),
                ).toHaveCount(0);
                await expect(
                    display.getByTestId("blackjack-display-dealer"),
                ).toBeVisible();
                await expect(
                    page.getByTestId(`blackjack-player-${bobId}`),
                ).toHaveCount(0);
                await page
                    .getByRole("button", { name: "DEAL", exact: true })
                    .click();
                await guest
                    .getByRole("button", { name: "DEAL", exact: true })
                    .click();
                await expect(
                    display.getByTestId(`blackjack-hand-${aliceId}-0`),
                ).toHaveAttribute("data-card-count", "2");
                await expect(
                    display.getByTestId(`blackjack-hand-${bobId}-0`),
                ).toHaveAttribute("data-card-count", "2");
            } else {
                const signature = (view: Flip7PlayerView) =>
                    JSON.stringify([
                        view.phase,
                        view.currentPlayerId,
                        view.targetChoice,
                        view.players,
                        view.deckCount,
                    ]);
                for (let step = 0; step < 20; step++) {
                    const view = await host.gameView<Flip7PlayerView>();
                    if (view.phase === "round_over") break;
                    const actorId =
                        view.targetChoice?.chooserPlayerId ??
                        view.currentPlayerId;
                    if (actorId !== bobId) await host.switchPlayer(actorId!);
                    const phone = actorId === bobId ? guest : page;
                    const actor = actorId === bobId ? bob : host;
                    const own = await actor.gameView<Flip7PlayerView>();
                    if (view.phase === "awaiting_target") {
                        const target = own.players.find(
                            (p) => p.id === own.validTargetIds[0],
                        );
                        await phone
                            .getByRole("button", {
                                name: target!.name,
                                exact: true,
                            })
                            .click();
                    } else {
                        await phone
                            .getByRole("button", {
                                name: own.canStay ? "STAY" : "HIT",
                                exact: true,
                            })
                            .click();
                    }
                    await expect
                        .poll(async () =>
                            signature(await host.gameView<Flip7PlayerView>()),
                        )
                        .not.toBe(signature(view));
                }
                await host.switchPlayer(aliceId);
                await expect(table).toHaveAttribute("data-phase", "round_over");
            }
            await page.screenshot({
                path: testInfo.outputPath("phone.png"),
                fullPage: true,
            });
            await display.screenshot({
                path: testInfo.outputPath("display.png"),
                fullPage: true,
            });
            expect(
                await page.evaluate(
                    () =>
                        document.documentElement.scrollWidth <=
                        window.innerWidth,
                ),
            ).toBe(true);
            expect(sent).toEqual([]);
            for (const frame of received) {
                const message = Schema.decodeUnknownSync(displayMessageSchema)(
                    JSON.parse(frame),
                );
                const game = message.data.game;
                if (!game) continue;
                expect(game.view).not.toHaveProperty("myId");
                expect(game.view).not.toHaveProperty("deck");
                expect(game.view).not.toHaveProperty("shoe");
                if (game.type === "perudo" && game.view.phase !== "revealing") {
                    expect(
                        game.view.players.every(
                            (player) => player.dice === null,
                        ),
                    ).toBe(true);
                }
                if (
                    game.type === "blackjack" &&
                    ["playing", "insurance"].includes(game.view.phase)
                ) {
                    expect(game.view.dealer.cards[1]).toBe("hidden");
                    expect(game.view.dealer.value).toBeNull();
                }
            }
            await page
                .getByRole("button", { name: /^end(?: game)?$/i })
                .click();
            if (gameType !== "blackjack")
                await page
                    .getByRole("button", { name: /return to lobby/i })
                    .click();
            await expect(display.getByTestId("join-qr")).toBeVisible();
        } finally {
            await guestContext.close();
            await display.close();
        }
    });
}
