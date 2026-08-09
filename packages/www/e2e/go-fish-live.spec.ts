import { expect, test } from "@playwright/test";

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
