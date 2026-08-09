import { expect, test } from "@playwright/test";

import type { PerudoClientMessage, PerudoPlayerView } from "../src/game/perudo";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type { PlayerGameMessage } from "./helpers/multiplayer-room-page";

defineLiveGameSmoke({
    gameType: "perudo",
    playerCount: 2,
    roomTestId: "perudo-room",
});

test("perudo bids, challenges, and reveals every die", async ({ page }) => {
    const { room, playerIds } = await startLiveGame(page, {
        gameType: "perudo",
        playerCount: 2,
    });

    await expect
        .poll(async () => (await room.gameView<PerudoPlayerView>()).phase)
        .toBe("round_start");
    const hiddenViews = await Promise.all(
        playerIds.map((id) => room.gameView<PerudoPlayerView>(id)),
    );
    for (const view of hiddenViews) {
        expect(view.players.find((player) => player.id === view.myId)!.dice).not
            .toBeNull;
        expect(
            view.players.find((player) => player.id !== view.myId)!.dice,
        ).toBeNull();
    }

    await room.switchPlayer(playerIds[0]!);
    await room.sendGameMessage({
        type: "perudo:start_round",
        data: {},
    } satisfies PlayerGameMessage<PerudoClientMessage>);
    await expect
        .poll(async () => (await room.gameView<PerudoPlayerView>()).phase)
        .toBe("bidding");
    const openedViews = await Promise.all(
        playerIds.map((id) => room.gameView<PerudoPlayerView>(id)),
    );
    for (let index = 0; index < openedViews.length; index++) {
        const before = hiddenViews[index]!;
        const opened = openedViews[index]!;
        expect(opened.roundNumber).toBe(before.roundNumber);
        expect(
            opened.players.find((player) => player.id === opened.myId)!.dice,
        ).toEqual(
            before.players.find((player) => player.id === before.myId)!.dice,
        );
    }

    const bidderView = await room.gameView<PerudoPlayerView>();
    const bidderId = bidderView.currentPlayerId;
    const bid = bidderView.nextHigherBid!;
    await room.switchPlayer(bidderId);
    await room.sendGameMessage({
        type: "perudo:bid",
        data: bid,
    } satisfies PlayerGameMessage<PerudoClientMessage>);

    await expect
        .poll(async () => (await room.gameView<PerudoPlayerView>()).currentBid)
        .toMatchObject({ playerId: bidderId, ...bid });
    const challengeView = await room.gameView<PerudoPlayerView>();
    const challengerId = challengeView.currentPlayerId;
    expect(challengerId).not.toBe(bidderId);

    await room.switchPlayer(challengerId);
    await room.sendGameMessage({
        type: "perudo:challenge",
        data: {},
    } satisfies PlayerGameMessage<PerudoClientMessage>);

    await expect
        .poll(async () => (await room.gameView<PerudoPlayerView>()).phase)
        .toBe("revealing");
    const revealedViews = await Promise.all(
        playerIds.map((id) => room.gameView<PerudoPlayerView>(id)),
    );
    for (const view of revealedViews) {
        expect(view.lastChallengeResult).toMatchObject({
            challengerId,
            bidderId,
            bid: { playerId: bidderId, ...bid },
            loserNewCount: 4,
        });
        expect(view.players.every((player) => player.dice !== null)).toBe(true);
        expect(
            view.players.reduce((total, player) => total + player.diceCount, 0),
        ).toBe(9);
        expect(view.totalDiceInPlay).toBe(9);
    }

    await expect
        .poll(async () => (await room.gameView<PerudoPlayerView>()).phase, {
            timeout: 10_000,
        })
        .toBe("round_start");
    const nextRound = await room.gameView<PerudoPlayerView>();
    expect(nextRound.roundNumber).toBe(2);
    expect(nextRound.lastChallengeResult).toBeNull();
    expect(
        nextRound.players.find((player) => player.id !== nextRound.myId)!.dice,
    ).toBeNull();
});
