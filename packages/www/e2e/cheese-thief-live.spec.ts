import { expect, test } from "@playwright/test";

import type {
    CheeseThiefClientMessage,
    CheeseThiefPlayerView,
} from "../src/game/cheese-thief";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type { PlayerGameMessage } from "./helpers/multiplayer-room-page";

defineLiveGameSmoke({
    gameType: "cheese_thief",
    playerCount: 4,
    roomTestId: "cheese-thief-room",
});

test("cheese thief preserves secret roles through a full caught-thief round", async ({
    page,
}) => {
    const { room, playerIds } = await startLiveGame(page, {
        gameType: "cheese_thief",
        playerCount: 4,
    });
    const privateViews = await Promise.all(
        playerIds.map((id) => room.waitForGameView<CheeseThiefPlayerView>(id)),
    );
    const thiefView = privateViews.find((view) => view.myRole === "thief")!;
    const thiefId = thiefView.myId;
    const thiefName = thiefView.players.find(
        (player) => player.id === thiefId,
    )!.name;
    expect(privateViews.filter((view) => view.myRole === "thief")).toHaveLength(
        1,
    );
    for (const view of privateViews) {
        expect(view.phase).toBe("night");
        expect(view.thiefName).toBeNull();
        expect(view.voteResult).toBeNull();
    }

    const hostId = privateViews.find((view) => view.isHost)!.myId;
    await room.switchPlayer(hostId);
    await room.sendGameMessage({
        type: "cheese_thief:start_day",
        data: {},
    } satisfies PlayerGameMessage<CheeseThiefClientMessage>);
    await expect
        .poll(async () => (await room.gameView<CheeseThiefPlayerView>()).phase)
        .toBe("day");
    await room.sendGameMessage({
        type: "cheese_thief:start_voting",
        data: {},
    } satisfies PlayerGameMessage<CheeseThiefClientMessage>);
    await expect
        .poll(async () => (await room.gameView<CheeseThiefPlayerView>()).phase)
        .toBe("voting");

    for (const playerId of playerIds) {
        const targetId =
            playerId === thiefId
                ? playerIds.find((id) => id !== thiefId)!
                : thiefId;
        await room.switchPlayer(playerId);
        await room.sendGameMessage({
            type: "cheese_thief:cast_vote",
            data: { targetId },
        } satisfies PlayerGameMessage<CheeseThiefClientMessage>);
        await expect
            .poll(
                async () =>
                    (await room.gameView<CheeseThiefPlayerView>(playerId))
                        .hasVoted,
            )
            .toBe(true);
    }

    await room.switchPlayer(hostId);
    await room.sendGameMessage({
        type: "cheese_thief:reveal_votes",
        data: {},
    } satisfies PlayerGameMessage<CheeseThiefClientMessage>);
    await expect
        .poll(async () => (await room.gameView<CheeseThiefPlayerView>()).phase)
        .toBe("reveal");
    const revealedViews = await Promise.all(
        playerIds.map((id) => room.gameView<CheeseThiefPlayerView>(id)),
    );
    for (const view of revealedViews) {
        expect(view.thiefName).toBe(thiefName);
        expect(view.voteResult).toMatchObject({
            thiefCaught: true,
            winningTeam: "sleepyheads",
            thiefId,
        });
        expect(view.voteResult?.voteCounts[thiefId]).toBe(3);
    }

    await room.switchPlayer(hostId);
    await room.sendGameMessage({
        type: "cheese_thief:next_round",
        data: {},
    } satisfies PlayerGameMessage<CheeseThiefClientMessage>);
    await expect
        .poll(async () => {
            const view = await room.gameView<CheeseThiefPlayerView>();
            return `${view.phase}:${view.round}`;
        })
        .toBe("night:2");
    const nextRound = await room.gameView<CheeseThiefPlayerView>();
    expect(nextRound.thiefName).toBeNull();
    expect(nextRound.voteResult).toBeNull();
    expect(nextRound.votedCount).toBe(0);
});
