import { defineDiceCardPartyTest } from "./helpers/party-dice-card";
import { expect, test } from "@playwright/test";

import type {
    RolledDice,
    YahtzeeClientMessage,
    YahtzeePlayerView,
} from "../src/game/yahtzee";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type { PlayerGameMessage } from "./helpers/multiplayer-room-page";

defineLiveGameSmoke({
    gameType: "yahtzee",
    playerCount: 2,
    roomTestId: "yahtzee-room",
});

test("yahtzee rolls, holds, rerolls, and scores through the live room", async ({
    page,
}) => {
    const { room } = await startLiveGame(page, {
        gameType: "yahtzee",
        playerCount: 2,
    });
    const opening = await room.gameView<YahtzeePlayerView>();
    const playerId = opening.currentPlayerId;
    await room.switchPlayer(playerId);
    await room.sendGameMessage({
        type: "yahtzee:roll",
        data: {},
    } satisfies PlayerGameMessage<YahtzeeClientMessage>);
    await expect
        .poll(async () => (await room.gameView<YahtzeePlayerView>()).phase)
        .toBe("mid_turn");
    const firstRoll = await room.gameView<YahtzeePlayerView>();
    const heldValue = firstRoll.dice[0];

    await room.sendGameMessage({
        type: "yahtzee:toggle_hold",
        data: { diceIndex: 0 },
    } satisfies PlayerGameMessage<YahtzeeClientMessage>);
    await expect
        .poll(async () => (await room.gameView<YahtzeePlayerView>()).held[0])
        .toBe(true);
    await room.sendGameMessage({
        type: "yahtzee:roll",
        data: {},
    } satisfies PlayerGameMessage<YahtzeeClientMessage>);
    await expect
        .poll(async () => (await room.gameView<YahtzeePlayerView>()).rollsLeft)
        .toBe(1);
    const secondRoll = await room.gameView<YahtzeePlayerView>();
    expect(secondRoll.dice[0]).toBe(heldValue);
    const expectedChance = secondRoll.dice.reduce(
        (total, die) => total + die,
        0,
    );

    await room.sendGameMessage({
        type: "yahtzee:score",
        data: { category: "chance" },
    } satisfies PlayerGameMessage<YahtzeeClientMessage>);
    await expect
        .poll(
            async () =>
                (await room.gameView<YahtzeePlayerView>()).players.find(
                    (player) => player.id === playerId,
                )?.scorecard.chance,
        )
        .toBe(expectedChance);
    const scored = await room.gameView<YahtzeePlayerView>();
    expect(scored.currentPlayerId).not.toBe(playerId);
    expect(scored.phase).toBe("pre_roll");
    expect(scored.dice).toEqual([0, 0, 0, 0, 0]);
});

test("lying yahtzee hides dice and catches a fabricated yahtzee", async ({
    page,
}) => {
    const { room, playerIds } = await startLiveGame(page, {
        gameType: "lying_yahtzee",
        playerCount: 2,
    });
    const opening = await room.gameView<YahtzeePlayerView>();
    const liarId = opening.currentPlayerId;
    const challengerId = playerIds.find((id) => id !== liarId)!;
    await room.switchPlayer(liarId);
    await room.sendGameMessage({
        type: "yahtzee:roll",
        data: {},
    } satisfies PlayerGameMessage<YahtzeeClientMessage>);
    await expect
        .poll(async () => (await room.gameView<YahtzeePlayerView>()).phase)
        .toBe("mid_turn");
    const liarView = await room.gameView<YahtzeePlayerView>(liarId);
    const actualDice = [...liarView.dice] as RolledDice;
    expect((await room.gameView<YahtzeePlayerView>(challengerId)).dice).toEqual(
        [0, 0, 0, 0, 0],
    );
    const falseFace = ((actualDice[0] % 6) + 1) as RolledDice[number];
    const claimedDice: RolledDice = [
        falseFace,
        falseFace,
        falseFace,
        falseFace,
        falseFace,
    ];

    await room.sendGameMessage({
        type: "yahtzee:claim",
        data: { category: "yahtzee", claimedDice },
    } satisfies PlayerGameMessage<YahtzeeClientMessage>);
    await expect
        .poll(
            async () =>
                (await room.gameView<YahtzeePlayerView>(challengerId)).phase,
        )
        .toBe("awaiting_response");
    const challengeView = await room.gameView<YahtzeePlayerView>(challengerId);
    expect(challengeView.dice).toEqual([0, 0, 0, 0, 0]);
    expect(challengeView.pendingClaim).toMatchObject({
        playerId: liarId,
        category: "yahtzee",
        claimedDice,
        claimedPoints: 50,
    });
    expect(challengeView.canChallengeClaim).toBe(true);

    await room.switchPlayer(challengerId);
    await room.sendGameMessage({
        type: "yahtzee:challenge_claim",
        data: {},
    } satisfies PlayerGameMessage<YahtzeeClientMessage>);
    await expect
        .poll(
            async () =>
                (await room.gameView<YahtzeePlayerView>()).lastTurnReveal
                    ?.outcome,
        )
        .toBe("caught_lying");
    const resolved = await room.gameView<YahtzeePlayerView>();
    expect(resolved.lastTurnReveal).toMatchObject({
        playerId: liarId,
        category: "yahtzee",
        actualDice,
        claimedDice,
        claimedPoints: 50,
        outcome: "caught_lying",
        penaltyPlayerId: liarId,
        penaltyPoints: 50,
    });
    expect(
        resolved.players.find((player) => player.id === liarId)?.scorecard
            .yahtzee,
    ).toBe(-50);
    expect(resolved.currentPlayerId).toBe(challengerId);
});
defineLiveGameSmoke({
    gameType: "lying_yahtzee",
    playerCount: 2,
    roomTestId: "yahtzee-room",
});

defineDiceCardPartyTest("yahtzee");
