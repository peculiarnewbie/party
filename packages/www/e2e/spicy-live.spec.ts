import { expect, test } from "@playwright/test";

import type { SpicyClientMessage, SpicyPlayerView } from "../src/game/spicy";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type { PlayerGameMessage } from "./helpers/multiplayer-room-page";

defineLiveGameSmoke({
    gameType: "spicy",
    playerCount: 3,
    roomTestId: "spicy-room",
});

test("spicy catches a deliberate lie and applies the challenge penalty", async ({
    page,
}) => {
    const { room } = await startLiveGame(page, {
        gameType: "spicy",
        playerCount: 3,
    });
    const opening = await room.gameView<SpicyPlayerView>();
    const liarId = opening.currentPlayerId;
    await room.switchPlayer(liarId);
    const liarView = await room.gameView<SpicyPlayerView>();
    const card = liarView.myHand[0]!;
    let trait: "number" | "spice";
    let declaredNumber = liarView.allowedDeclarationNumbers[0]!;
    let declaredSpice = liarView.allowedDeclarationSpices[0]!;

    if (card.kind === "standard") {
        trait = "number";
        declaredNumber = liarView.allowedDeclarationNumbers.find(
            (number) => number !== card.number,
        )!;
    } else if (card.kind === "wild_spice") {
        trait = "number";
    } else {
        trait = "spice";
    }

    const liarHandCountBefore = liarView.players.find(
        (player) => player.id === liarId,
    )!.handCount;
    await room.sendGameMessage({
        type: "spicy:play_card",
        data: { cardId: card.id, declaredNumber, declaredSpice },
    } satisfies PlayerGameMessage<SpicyClientMessage>);

    await expect
        .poll(async () => (await room.gameView<SpicyPlayerView>()).stackTop)
        .toMatchObject({
            ownerId: liarId,
            declaredNumber,
            declaredSpice,
            stackSize: 1,
        });
    const challengeView = await room.gameView<SpicyPlayerView>();
    const challengerId = challengeView.currentPlayerId;
    const challengerWonCardsBefore = challengeView.players.find(
        (player) => player.id === challengerId,
    )!.wonCardCount;
    expect(challengeView.stackTop).not.toHaveProperty("actualCard");

    await room.switchPlayer(challengerId);
    await room.sendGameMessage({
        type: "spicy:challenge",
        data: { trait },
    } satisfies PlayerGameMessage<SpicyClientMessage>);
    await expect
        .poll(
            async () =>
                (await room.gameView<SpicyPlayerView>()).lastPublicResult?.type,
        )
        .toBe("challenge_resolved");

    const resolved = await room.gameView<SpicyPlayerView>();
    const result = resolved.lastPublicResult;
    expect(result?.type).toBe("challenge_resolved");
    if (result?.type === "challenge_resolved") {
        expect(result).toMatchObject({
            challengerId,
            challengedPlayerId: liarId,
            challengedTrait: trait,
            challengerWon: true,
            winnerId: challengerId,
            loserId: liarId,
            collectedCardCount: 1,
            loserDrewCount: 2,
        });
        expect(result.actualCard.id).toBe(card.id);
    }
    expect(resolved.stackTop).toBeNull();
    expect(
        resolved.players.find((player) => player.id === challengerId)!
            .wonCardCount,
    ).toBe(challengerWonCardsBefore + 1);
    expect(
        resolved.players.find((player) => player.id === liarId)!.handCount,
    ).toBe(liarHandCountBefore + 1);
});
