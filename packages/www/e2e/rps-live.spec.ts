import { expect, test } from "@playwright/test";

import type { RpsClientMessage, RpsPlayerView } from "../src/game/rps";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type {
    MultiplayerRoomPage,
    PlayerGameMessage,
} from "./helpers/multiplayer-room-page";

defineLiveGameSmoke({
    gameType: "rps",
    playerCount: 2,
    roomTestId: "rps-room",
});

async function throwChoice(
    room: MultiplayerRoomPage,
    playerId: string,
    choice: "rock" | "scissors",
    expectPendingMatch = true,
) {
    await room.switchPlayer(playerId);
    await room.sendGameMessage({
        type: "rps:throw",
        data: { choice },
    } satisfies PlayerGameMessage<RpsClientMessage>);
    if (expectPendingMatch) {
        await expect
            .poll(
                async () =>
                    (await room.waitForGameView<RpsPlayerView>(playerId))
                        .myMatch?.myChoice,
            )
            .toBe(choice);
    }
}

test("rps keeps throws private, reconnects, and completes a four-player tournament", async ({
    page,
}) => {
    test.setTimeout(60_000);
    const { room, playerIds } = await startLiveGame(page, {
        gameType: "rps",
        playerCount: 4,
    });
    const hostId = playerIds[0]!;
    await room.switchPlayer(hostId);
    await room.waitForGameView<RpsPlayerView>(hostId);
    await page.getByRole("button", { name: "BO1", exact: true }).click();
    await expect
        .poll(async () => (await room.waitForGameView<RpsPlayerView>()).bestOf)
        .toBe(1);

    let reconnectChecked = false;
    while (true) {
        const view = await room.waitForGameView<RpsPlayerView>(hostId);
        if (view.phase === "tournament_over") break;

        if (view.phase === "round_results") {
            await room.switchPlayer(hostId);
            await room.sendGameMessage({
                type: "rps:next_round",
                data: {},
            } satisfies PlayerGameMessage<RpsClientMessage>);
            await expect
                .poll(
                    async () =>
                        (await room.waitForGameView<RpsPlayerView>(hostId))
                            .phase,
                )
                .not.toBe("round_results");
            continue;
        }

        const round = view.rounds.find(
            (entry) => entry.roundNumber === view.currentRound,
        )!;
        for (const match of round.matches.filter(
            (entry) => entry.status === "active",
        )) {
            await throwChoice(room, match.player1.id, "rock");
            await expect
                .poll(async () => {
                    const waitingPlayer =
                        await room.waitForGameView<RpsPlayerView>(
                            match.player2.id,
                        );
                    return waitingPlayer.myMatch;
                })
                .toMatchObject({
                    myChoice: null,
                    opponentHasThrown: true,
                    throws: [],
                });

            await throwChoice(room, match.player2.id, "scissors", false);
            await expect
                .poll(async () => {
                    const entries = await room.eventLog({
                        playerId: match.player1.id,
                        direction: "in",
                        typePrefix: "rps:event",
                    });
                    return entries.some((entry) => {
                        const payload = entry.payload as {
                            data?: { type?: string };
                        };
                        return payload.data?.type === "match_completed";
                    });
                })
                .toBe(true);
            await expect
                .poll(async () => {
                    const resolved = await room.waitForGameView<RpsPlayerView>(
                        match.player1.id,
                    );
                    return resolved.myMatch?.status;
                })
                .toBe("complete");

            if (!reconnectChecked) {
                reconnectChecked = true;
                const log = await room.eventLog({ playerId: match.player2.id });
                const cursor = log.at(-1)?.id ?? 0;
                await room.disconnectPlayer(match.player2.id);
                await room.reconnectPlayer(match.player2.id);
                await expect
                    .poll(async () => {
                        const entries = await room.eventLog({
                            playerId: match.player2.id,
                            direction: "in",
                            since: cursor,
                        });
                        return entries.some(
                            (entry) => entry.type === "rps:sync_response",
                        );
                    })
                    .toBe(true);
                await expect
                    .poll(async () => {
                        const restored =
                            await room.waitForGameView<RpsPlayerView>(
                                match.player2.id,
                            );
                        return restored.myMatch;
                    })
                    .toMatchObject({
                        status: "complete",
                        myChoice: null,
                        opponentHasThrown: false,
                        throws: [
                            {
                                player1Choice: "rock",
                                player2Choice: "scissors",
                            },
                        ],
                    });
            }
        }
    }

    const complete = await room.waitForGameView<RpsPlayerView>(hostId);
    expect(reconnectChecked).toBe(true);
    expect(complete.phase).toBe("tournament_over");
    expect(complete.currentRound).toBe(2);
    expect(complete.winnerId).not.toBeNull();
    expect(
        complete.players.find((player) => player.id === complete.winnerId)
            ?.eliminated,
    ).toBe(false);
});
