import { expect, test } from "@playwright/test";

import type { Flip7ClientMessage, Flip7PlayerView } from "../src/game/flip-7";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type { PlayerGameMessage } from "./helpers/multiplayer-room-page";

defineLiveGameSmoke({
    gameType: "flip_7",
    playerCount: 3,
    roomTestId: "flip-7-room",
});

test("flip 7 resolves random action cards, scores a round, and advances the dealer", async ({
    page,
}) => {
    const { room, playerIds } = await startLiveGame(page, {
        gameType: "flip_7",
        playerCount: 3,
    });
    const hitPlayers = new Set<string>();

    for (let step = 0; step < 60; step++) {
        const view = await room.gameView<Flip7PlayerView>();
        if (view.phase === "round_over") break;

        const signature = JSON.stringify({
            phase: view.phase,
            currentPlayerId: view.currentPlayerId,
            deckCount: view.deckCount,
            targetChoice: view.targetChoice,
            players: view.players.map((player) => ({
                id: player.id,
                status: player.status,
                cards: player.cards.length,
            })),
        });

        if (view.phase === "awaiting_target") {
            const chooserId = view.targetChoice!.chooserPlayerId;
            await room.switchPlayer(chooserId);
            const chooserView = await room.gameView<Flip7PlayerView>();
            expect(chooserView.requiresMyTargetChoice).toBe(true);
            await room.sendGameMessage({
                type: "flip_7:choose_target",
                data: { targetId: chooserView.validTargetIds[0]! },
            } satisfies PlayerGameMessage<Flip7ClientMessage>);
        } else if (view.phase === "turn") {
            const currentPlayerId = view.currentPlayerId!;
            await room.switchPlayer(currentPlayerId);
            const currentView = await room.gameView<Flip7PlayerView>();
            if (currentView.canHit && !hitPlayers.has(currentPlayerId)) {
                hitPlayers.add(currentPlayerId);
                await room.sendGameMessage({
                    type: "flip_7:hit",
                    data: {},
                } satisfies PlayerGameMessage<Flip7ClientMessage>);
            } else {
                expect(currentView.canStay).toBe(true);
                await room.sendGameMessage({
                    type: "flip_7:stay",
                    data: {},
                } satisfies PlayerGameMessage<Flip7ClientMessage>);
            }
        }

        await expect
            .poll(async () =>
                JSON.stringify({
                    phase: (await room.gameView<Flip7PlayerView>()).phase,
                    currentPlayerId: (await room.gameView<Flip7PlayerView>())
                        .currentPlayerId,
                    deckCount: (await room.gameView<Flip7PlayerView>())
                        .deckCount,
                    targetChoice: (await room.gameView<Flip7PlayerView>())
                        .targetChoice,
                    players: (
                        await room.gameView<Flip7PlayerView>()
                    ).players.map((player) => ({
                        id: player.id,
                        status: player.status,
                        cards: player.cards.length,
                    })),
                }),
            )
            .not.toBe(signature);
    }

    const roundOver = await room.gameView<Flip7PlayerView>();
    expect(roundOver.phase).toBe("round_over");
    expect(roundOver.lastRoundResult?.scores).toHaveLength(3);
    expect(
        roundOver.players.every((player) => player.status !== "active"),
    ).toBe(true);
    const dealerId = roundOver.dealerId;

    await room.switchPlayer(playerIds[0]!);
    await room.sendGameMessage({
        type: "flip_7:next_round",
        data: {},
    } satisfies PlayerGameMessage<Flip7ClientMessage>);
    await expect
        .poll(async () => (await room.gameView<Flip7PlayerView>()).roundNumber)
        .toBe(2);
    const nextRound = await room.gameView<Flip7PlayerView>();
    expect(nextRound.phase).not.toBe("round_over");
    expect(nextRound.dealerId).not.toBe(dealerId);
});
