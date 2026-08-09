import { expect, test } from "@playwright/test";

import type { SkullClientMessage, SkullPlayerView } from "../src/game/skull";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type { PlayerGameMessage } from "./helpers/multiplayer-room-page";

defineLiveGameSmoke({
    gameType: "skull",
    playerCount: 3,
    roomTestId: "skull-room",
});

test("skull completes a flower challenge and starts the next round", async ({
    page,
}) => {
    const { room } = await startLiveGame(page, {
        gameType: "skull",
        playerCount: 3,
    });

    for (let placed = 1; placed <= 3; placed++) {
        const view = await room.waitForGameView<SkullPlayerView>();
        await room.switchPlayer(view.currentPlayerId);
        const current = await room.gameView<SkullPlayerView>();
        expect(current.myHand).toContain("flower");
        await room.sendGameMessage({
            type: "skull:play_disc",
            data: { disc: "flower" },
        } satisfies PlayerGameMessage<SkullClientMessage>);
        await expect
            .poll(async () => {
                const next = await room.gameView<SkullPlayerView>();
                return next.players.reduce(
                    (total, player) => total + player.matCount,
                    0,
                );
            })
            .toBe(placed);
    }

    const building = await room.gameView<SkullPlayerView>();
    expect(building.phase).toBe("building");
    const challengerId = building.currentPlayerId;
    await room.switchPlayer(challengerId);
    await room.sendGameMessage({
        type: "skull:start_challenge",
        data: { bid: 1 },
    } satisfies PlayerGameMessage<SkullClientMessage>);

    for (let passes = 0; passes < 2; passes++) {
        await expect
            .poll(async () => (await room.gameView<SkullPlayerView>()).phase)
            .toBe("auction");
        const auction = await room.gameView<SkullPlayerView>();
        expect(auction.currentPlayerId).not.toBe(challengerId);
        const passingPlayerId = auction.currentPlayerId;
        await room.switchPlayer(passingPlayerId);
        await room.sendGameMessage({
            type: "skull:pass_bid",
            data: {},
        } satisfies PlayerGameMessage<SkullClientMessage>);
        if (passes === 0) {
            await expect
                .poll(
                    async () =>
                        (await room.gameView<SkullPlayerView>())
                            .currentPlayerId,
                )
                .not.toBe(passingPlayerId);
        }
    }

    await expect
        .poll(async () => (await room.gameView<SkullPlayerView>()).roundNumber)
        .toBe(2);
    const nextRound = await room.gameView<SkullPlayerView>();
    expect(nextRound.phase).toBe("turn_prep");
    expect(nextRound.lastPublicResult?.type).toBe("round_started");
    expect(
        nextRound.players.find((player) => player.id === challengerId)!
            .successfulChallenges,
    ).toBe(1);
    expect(nextRound.players.every((player) => player.matCount === 0)).toBe(
        true,
    );
});
