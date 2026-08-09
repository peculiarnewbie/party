import { expect, test } from "@playwright/test";

import type {
    CockroachPokerClientMessage,
    CockroachPokerPlayerView,
} from "../src/game/cockroach-poker";
import { CREATURE_TYPES } from "../src/game/cockroach-poker";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type { PlayerGameMessage } from "./helpers/multiplayer-room-page";

defineLiveGameSmoke({
    gameType: "cockroach_poker",
    playerCount: 3,
    roomTestId: "cockroach-poker-room",
});

test("cockroach poker passes a bluff before the final player calls it", async ({
    page,
}) => {
    const { room, playerIds } = await startLiveGame(page, {
        gameType: "cockroach_poker",
        playerCount: 3,
    });
    const opening = await room.gameView<CockroachPokerPlayerView>();
    const offererId = opening.activePlayerId;
    const receiverId = playerIds.find((id) => id !== offererId)!;
    const finalReceiverId = playerIds.find(
        (id) => id !== offererId && id !== receiverId,
    )!;
    await room.switchPlayer(offererId);
    const offererView = await room.gameView<CockroachPokerPlayerView>();
    const actualCard = offererView.myHand[0]!;
    const falseClaim = CREATURE_TYPES.find(
        (creature) => creature !== actualCard,
    )!;

    await room.sendGameMessage({
        type: "cockroach_poker:offer_card",
        data: { targetId: receiverId, cardIndex: 0, claim: actualCard },
    } satisfies PlayerGameMessage<CockroachPokerClientMessage>);
    await expect
        .poll(
            async () =>
                (await room.gameView<CockroachPokerPlayerView>(receiverId))
                    .offerChain?.currentReceiverId,
        )
        .toBe(receiverId);
    expect(
        (await room.gameView<CockroachPokerPlayerView>(receiverId)).offerChain
            ?.peekedCard,
    ).toBeNull();

    await room.switchPlayer(receiverId);
    await room.sendGameMessage({
        type: "cockroach_poker:peek_and_pass",
        data: { targetId: finalReceiverId, newClaim: falseClaim },
    } satisfies PlayerGameMessage<CockroachPokerClientMessage>);
    await expect
        .poll(
            async () =>
                (await room.gameView<CockroachPokerPlayerView>(finalReceiverId))
                    .offerChain?.currentReceiverId,
        )
        .toBe(finalReceiverId);
    const passerView =
        await room.gameView<CockroachPokerPlayerView>(receiverId);
    const finalReceiverView =
        await room.gameView<CockroachPokerPlayerView>(finalReceiverId);
    expect(passerView.offerChain?.peekedCard).toBe(actualCard);
    expect(finalReceiverView.offerChain).toMatchObject({
        currentOffererId: receiverId,
        currentClaim: falseClaim,
        peekedCard: null,
        mustAccept: true,
    });

    await room.switchPlayer(finalReceiverId);
    await room.sendGameMessage({
        type: "cockroach_poker:call_false",
        data: {},
    } satisfies PlayerGameMessage<CockroachPokerClientMessage>);
    await expect
        .poll(
            async () =>
                (await room.gameView<CockroachPokerPlayerView>()).lastResult
                    ?.type,
        )
        .toBe("call_resolved");
    const resolved = await room.gameView<CockroachPokerPlayerView>();
    expect(resolved.lastResult).toMatchObject({
        type: "call_resolved",
        callerId: finalReceiverId,
        calledTrue: false,
        wasCorrect: true,
        actualCard,
        cardTakerId: receiverId,
    });
    expect(resolved.activePlayerId).toBe(receiverId);
    expect(
        resolved.players.find((player) => player.id === receiverId)!
            .faceUpCards,
    ).toContain(actualCard);
});
