import { expect, test } from "@playwright/test";

import type { HerdClientMessage, HerdPlayerView } from "../src/game/herd";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type { PlayerGameMessage } from "./helpers/multiplayer-room-page";
import { definePartyQuestionGame } from "./helpers/party-question-game";

definePartyQuestionGame("herd");

defineLiveGameSmoke({
    gameType: "herd",
    playerCount: 3,
    roomTestId: "herd-room",
});

test("herd groups private answers, scores the majority, and assigns the pink cow", async ({
    page,
}) => {
    const { room, playerIds } = await startLiveGame(page, {
        gameType: "herd",
        playerCount: 4,
    });
    const hostId = playerIds[0]!;
    const answererIds = playerIds.slice(1);

    await room.switchPlayer(hostId);
    await room.sendGameMessage({
        type: "herd:toggle_pink_cow",
        data: { enabled: true },
    } satisfies PlayerGameMessage<HerdClientMessage>);
    await room.sendGameMessage({
        type: "herd:next_question",
        data: { customQuestion: "What color is the party cow?" },
    } satisfies PlayerGameMessage<HerdClientMessage>);
    await expect
        .poll(async () => (await room.gameView<HerdPlayerView>()).phase)
        .toBe("answering");

    const answers = new Map([
        [answererIds[0]!, "Blue"],
        [answererIds[1]!, " blue "],
        [answererIds[2]!, "Red"],
    ]);
    for (const [playerId, answer] of answers) {
        await room.switchPlayer(playerId);
        await room.sendGameMessage({
            type: "herd:submit_answer",
            data: { answer },
        } satisfies PlayerGameMessage<HerdClientMessage>);
        await expect
            .poll(
                async () =>
                    (await room.gameView<HerdPlayerView>(playerId)).myAnswer,
            )
            .toBe(answer.trim());
    }

    const privateViews = await Promise.all(
        playerIds.map((id) => room.gameView<HerdPlayerView>(id)),
    );
    for (const view of privateViews) {
        expect(view.answerGroups).toEqual([]);
        expect(view.answeredCount).toBe(3);
        if (view.isHost) {
            expect(view.myAnswer).toBeNull();
        } else {
            expect(view.myAnswer).toBe(answers.get(view.myId)!.trim());
        }
    }

    await room.switchPlayer(hostId);
    await room.sendGameMessage({
        type: "herd:close_answers",
        data: {},
    } satisfies PlayerGameMessage<HerdClientMessage>);
    await expect
        .poll(async () => (await room.gameView<HerdPlayerView>()).phase)
        .toBe("reveal");
    const reveal = await room.gameView<HerdPlayerView>();
    expect(reveal.answerGroups).toHaveLength(2);
    expect(reveal.answerGroups.map((group) => group.count).sort()).toEqual([
        1, 2,
    ]);

    await room.sendGameMessage({
        type: "herd:next_round",
        data: {},
    } satisfies PlayerGameMessage<HerdClientMessage>);
    await expect
        .poll(async () => (await room.gameView<HerdPlayerView>()).phase)
        .toBe("waiting");
    const scored = await room.gameView<HerdPlayerView>();
    expect(scored.lastRoundResult).toMatchObject({
        majorityCount: 2,
        scoringPlayerIds: answererIds.slice(0, 2),
        pinkCowPlayerId: answererIds[2],
    });
    expect(scored.pinkCowHolderId).toBe(answererIds[2]);
    expect(
        scored.players
            .filter((player) => answererIds.slice(0, 2).includes(player.id))
            .every((player) => player.score === 1),
    ).toBe(true);
});
