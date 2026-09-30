import { expect, test } from "@playwright/test";

import type {
    FunFactsClientMessage,
    FunFactsPlayerView,
} from "../src/game/fun-facts";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type { PlayerGameMessage } from "./helpers/multiplayer-room-page";
import { definePartyQuestionGame } from "./helpers/party-question-game";

definePartyQuestionGame("fun_facts");

defineLiveGameSmoke({
    gameType: "fun_facts",
    playerCount: 3,
    roomTestId: "fun-facts-room",
});

test("fun facts privately answers, orders every arrow, and scores a perfect round", async ({
    page,
}) => {
    const { room, playerIds } = await startLiveGame(page, {
        gameType: "fun_facts",
        playerCount: 3,
    });
    const hostId = playerIds[0]!;
    const answers = new Map([
        [playerIds[0]!, 30],
        [playerIds[1]!, 10],
        [playerIds[2]!, 20],
    ]);

    await room.switchPlayer(hostId);
    await room.sendGameMessage({
        type: "fun_facts:next_question",
        data: { customQuestion: "How many parties have you hosted?" },
    } satisfies PlayerGameMessage<FunFactsClientMessage>);
    await expect
        .poll(async () => (await room.gameView<FunFactsPlayerView>()).phase)
        .toBe("answering");

    for (const [playerId, answer] of answers) {
        await room.switchPlayer(playerId);
        await room.sendGameMessage({
            type: "fun_facts:submit_answer",
            data: { answer },
        } satisfies PlayerGameMessage<FunFactsClientMessage>);
        await expect
            .poll(
                async () =>
                    (await room.gameView<FunFactsPlayerView>(playerId))
                        .myAnswer,
            )
            .toBe(answer);
    }

    await room.switchPlayer(hostId);
    await room.sendGameMessage({
        type: "fun_facts:close_answers",
        data: {},
    } satisfies PlayerGameMessage<FunFactsClientMessage>);
    await expect
        .poll(async () => (await room.gameView<FunFactsPlayerView>()).phase)
        .toBe("placing");

    let placedCount = 1;
    while ((await room.gameView<FunFactsPlayerView>()).phase === "placing") {
        const view = await room.gameView<FunFactsPlayerView>();
        expect(view.placedArrows.every((arrow) => arrow.answer === null)).toBe(
            true,
        );
        const placerId = view.currentPlacerId!;
        const placerAnswer = answers.get(placerId)!;
        const position = view.placedArrows.filter(
            (arrow) => answers.get(arrow.playerId)! <= placerAnswer,
        ).length;
        await room.switchPlayer(placerId);
        await room.sendGameMessage({
            type: "fun_facts:place_arrow",
            data: { position },
        } satisfies PlayerGameMessage<FunFactsClientMessage>);
        placedCount++;
        await expect
            .poll(async () => {
                const next = await room.gameView<FunFactsPlayerView>();
                return next.phase === "reveal"
                    ? next.lastRoundResult?.placedOrder.length
                    : next.placedArrows.length;
            })
            .toBe(placedCount);
    }

    const revealed = await room.gameView<FunFactsPlayerView>();
    const orderedAnswers = revealed.lastRoundResult!.placedOrder.map((id) =>
        answers.get(id),
    );
    expect(orderedAnswers).toEqual([10, 20, 30]);
    expect(revealed.lastRoundResult).toMatchObject({
        correctArrows: expect.arrayContaining(playerIds),
        removedArrows: [],
        pointsEarned: 3,
    });
    expect(revealed.teamScore).toBe(3);
    expect(revealed.placedArrows.map((arrow) => arrow.answer)).toEqual([
        10, 20, 30,
    ]);

    await room.switchPlayer(hostId);
    await room.sendGameMessage({
        type: "fun_facts:next_round",
        data: {},
    } satisfies PlayerGameMessage<FunFactsClientMessage>);
    await expect
        .poll(async () => (await room.gameView<FunFactsPlayerView>()).phase)
        .toBe("waiting");
});
