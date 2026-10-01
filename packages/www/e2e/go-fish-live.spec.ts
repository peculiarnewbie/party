import { defineDiceCardPartyTest } from "./helpers/party-dice-card";
import { expect, test } from "@playwright/test";
import { RANK_LABEL } from "../src/assets/card-deck/types";
import { MultiplayerRoomPage } from "./helpers/multiplayer-room-page";

import type {
    GoFishClientMessage,
    GoFishPlayerView,
} from "../src/game/go-fish";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type { PlayerGameMessage } from "./helpers/multiplayer-room-page";

defineLiveGameSmoke({
    gameType: "go_fish",
    playerCount: 2,
    roomTestId: "go-fish-room",
});

test("go fish styles react to selection and live turns across player browsers", async ({
    browser,
    baseURL,
}, testInfo) => {
    const roomId = `stylex-${crypto.randomUUID()}`;
    const contexts = await Promise.all(
        [0, 1, 2].map(() =>
            browser.newContext({ viewport: { width: 390, height: 844 } }),
        ),
    );
    try {
        const players = [];
        for (const [index, name] of ["Alice", "Bob", "Cara"].entries()) {
            const page = await contexts[index]!.newPage();
            await page.goto(`${baseURL}/room/${roomId}`);
            const room = new MultiplayerRoomPage(page);
            await room.waitForDevtools();
            const id = await room.joinAsBrowser(name);
            players.push({ page, room, id, name });
        }
        const host = players[0]!;
        await host.room.selectGame("go_fish");
        await host.room.startGame();
        const initial = await host.room.waitForGameView<GoFishPlayerView>();
        const actor = players.find(
            (player) => player.id === initial.currentPlayerId,
        )!;
        const target = players.find((player) => player.id !== actor.id)!;
        const seat = actor.page.getByTestId(`go-fish-opponent-${target.id}`);

        const nameplate = seat.getByTestId("table-nameplate");
        await expect(nameplate).toHaveCSS(
            "background-color",
            "rgb(247, 242, 222)",
        );
        await seat.click();
        await expect(seat).toHaveAttribute("aria-pressed", "true");
        await expect(seat).toHaveCSS("outline-style", "solid");
        await expect(seat).toHaveCSS("outline-color", "rgb(245, 197, 66)");
        const clear = actor.page.getByRole("button", {
            name: "Clear",
            exact: true,
        });
        await expect(clear).toHaveCSS("min-height", "40px");
        await actor.page.keyboard.press("Tab");
        await clear.focus();
        await expect(clear).toHaveCSS("outline-style", "solid");
        await actor.page.screenshot({
            path: testInfo.outputPath("phone-selected.png"),
        });
        await clear.click();
        await expect(seat).toHaveAttribute("aria-pressed", "false");
        await expect(seat).toHaveCSS("outline-style", "none");

        const actorView = await actor.room.gameView<GoFishPlayerView>();
        const otherViews = await Promise.all(
            players
                .filter((p) => p.id !== actor.id)
                .map(async (player) => ({
                    player,
                    view: await player.room.waitForGameView<GoFishPlayerView>(),
                })),
        );
        const ask = actorView.myHand.flatMap((card) =>
            otherViews.map(({ player, view }) => ({
                rank: card.rank,
                player,
                missing: !view.myHand.some((held) => held.rank === card.rank),
            })),
        );
        const choice = ask.find((option) => option.missing) ?? ask[0]!;
        await actor.page
            .getByTestId(`go-fish-opponent-${choice.player.id}`)
            .click();
        await actor.page
            .getByRole("button", {
                name: `Ask for ${RANK_LABEL[choice.rank]}s`,
                exact: true,
            })
            .click();
        if (choice.missing) {
            const draw = actor.page.getByRole("button", {
                name: "Go Fish!",
                exact: true,
            });
            await expect(draw).toBeVisible();
            await expect(draw).toHaveCSS(
                "background-color",
                "rgb(192, 38, 26)",
            );
            await actor.page.screenshot({
                path: testInfo.outputPath("phone-go-fish.png"),
            });
            await draw.click();
            await expect
                .poll(
                    async () =>
                        (await actor.room.gameView<GoFishPlayerView>())
                            .drawPileCount,
                )
                .toBe(actorView.drawPileCount - 1);
        } else {
            await expect
                .poll(
                    async () =>
                        (await actor.room.gameView<GoFishPlayerView>())
                            .lastResult?.type,
                )
                .toBe("cards_given");
        }
        for (const player of players) {
            await expect(player.page.getByTestId("go-fish-room")).toBeVisible();
            expect(
                await player.page.evaluate(
                    () =>
                        document.documentElement.scrollWidth <=
                        window.innerWidth,
                ),
            ).toBe(true);
        }
        await host.page.setViewportSize({ width: 1440, height: 1000 });
        await host.page.screenshot({
            path: testInfo.outputPath("desktop-table.png"),
        });
    } finally {
        await Promise.all(contexts.map((context) => context.close()));
    }
});

test("go fish resolves a legal ask through the live room", async ({ page }) => {
    const { room, playerIds } = await startLiveGame(page, {
        gameType: "go_fish",
        playerCount: 2,
    });

    await expect
        .poll(async () => (await room.gameView<GoFishPlayerView>()).turnPhase)
        .toBe("awaiting_ask");

    const initialViews = await Promise.all(
        playerIds.map((id) => room.gameView<GoFishPlayerView>(id)),
    );
    const currentPlayerId = initialViews[0]!.currentPlayerId;
    const currentView = initialViews[playerIds.indexOf(currentPlayerId)]!;
    const targetId = playerIds.find((id) => id !== currentPlayerId)!;
    const targetView = initialViews[playerIds.indexOf(targetId)]!;
    const targetRanks = new Set(targetView.myHand.map((card) => card.rank));
    const matchingCard = currentView.myHand.find((card) =>
        targetRanks.has(card.rank),
    );
    const card = matchingCard ?? currentView.myHand[0]!;
    const targetCountBefore = targetView.players.find(
        (player) => player.id === targetId,
    )!.cardCount;
    const drawPileBefore = currentView.drawPileCount;

    expect(currentView.myHand).not.toEqual(targetView.myHand);

    await room.switchPlayer(currentPlayerId);
    await room.sendGameMessage({
        type: "go_fish:ask",
        data: { targetId, rank: card.rank },
    } satisfies PlayerGameMessage<GoFishClientMessage>);

    if (matchingCard) {
        await expect
            .poll(
                async () =>
                    (await room.gameView<GoFishPlayerView>(currentPlayerId))
                        .lastResult?.type,
            )
            .toBe("cards_given");
        const resolved = await room.gameView<GoFishPlayerView>(targetId);
        const result = resolved.lastResult;
        expect(result?.type).toBe("cards_given");
        if (result?.type === "cards_given") {
            expect(result.fromId).toBe(targetId);
            expect(result.toId).toBe(currentPlayerId);
            expect(result.rank).toBe(card.rank);
            expect(result.count).toBeGreaterThan(0);
            expect(
                resolved.players.find((player) => player.id === targetId)!
                    .cardCount,
            ).toBe(targetCountBefore - result.count);
        }
    } else {
        await expect
            .poll(
                async () =>
                    (await room.gameView<GoFishPlayerView>(currentPlayerId))
                        .turnPhase,
            )
            .toBe("go_fish");
        await room.sendGameMessage({
            type: "go_fish:draw",
            data: {},
        } satisfies PlayerGameMessage<GoFishClientMessage>);
        await expect
            .poll(
                async () =>
                    (await room.gameView<GoFishPlayerView>(currentPlayerId))
                        .drawPileCount,
            )
            .toBe(drawPileBefore - 1);
        const resolved = await room.gameView<GoFishPlayerView>(targetId);
        expect(resolved.lastResult?.type).toBe("go_fish");
    }
});

defineDiceCardPartyTest("go_fish");
