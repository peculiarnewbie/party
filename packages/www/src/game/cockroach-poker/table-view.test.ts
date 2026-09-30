import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { initGame, processAction, removePlayer } from "./engine";
import { getPlayerView } from "./views";
import {
    cockroachPokerTableViewSchema,
    getCockroachPokerTableView,
} from "./table-view";

const players = ["Alice", "Bob", "Carol"].map((name, index) => ({
    id: `p${index}`,
    name,
}));
const offeredGame = () => {
    const state = initGame(players, (cards) => cards);
    processAction(state, {
        type: "offer_card",
        playerId: "p0",
        targetId: "p1",
        cardIndex: 0,
        claim: "fly",
    });
    return state;
};

describe("Cockroach Poker private peeks and public table", () => {
    it("lets the receiver see the card before choosing a claim, commits them to passing, and exposes only the public reveal", () => {
        const state = offeredGame();
        expect(getPlayerView(state, "p1").offerChain?.peekedCard).toBeNull();
        expect(
            processAction(state, { type: "peek_card", playerId: "p1" }),
        ).toEqual({ type: "card_peeked", playerId: "p1" });
        expect(getPlayerView(state, "p1").offerChain?.peekedCard).toBe("bat");
        expect(getPlayerView(state, "p2").offerChain?.peekedCard).toBeNull();
        const table = getCockroachPokerTableView(state);
        Schema.decodeUnknownSync(cockroachPokerTableViewSchema)(table);
        expect(table.offerChain?.receiverPeeked).toBe(true);
        const wire = JSON.stringify(table);
        for (const key of ["myHand", "peekedCard", "cardValue", "actualCard"])
            expect(wire).not.toContain(key);
        for (const type of ["call_true", "call_false"] as const) {
            const before = structuredClone(state);
            expect(
                processAction(state, { type, playerId: "p1" }),
            ).toMatchObject({ type: "error" });
            expect(state).toEqual(before);
        }
        processAction(state, { type: "peek_card", playerId: "p1" });
        processAction(state, {
            type: "peek_and_pass",
            playerId: "p1",
            targetId: "p2",
            newClaim: "spider",
        });
        expect(state.offerChain?.seenByPlayerIds).toEqual(["p0", "p1"]);
        expect(getPlayerView(state, "p2").offerChain).toMatchObject({
            mustAccept: true,
            peekedCard: null,
            currentClaim: "spider",
        });
        expect(
            processAction(state, { type: "peek_card", playerId: "p2" }),
        ).toMatchObject({ type: "error" });
        processAction(state, { type: "call_false", playerId: "p2" });
        const revealed = getCockroachPokerTableView(state);
        expect(revealed.lastResult).toMatchObject({
            type: "call_resolved",
            actualCard: "bat",
            cardTakerId: "p1",
        });
        expect(revealed.players[1].faceUpCards).toEqual(["bat"]);
        expect(revealed.offerChain).toBeNull();
    });

    it("rejects peeks outside the receiver's turn without changing state", () => {
        const state = initGame(players);
        const initial = structuredClone(state);
        expect(
            processAction(state, { type: "peek_card", playerId: "p0" }),
        ).toMatchObject({ type: "error" });
        expect(state).toEqual(initial);
        const offered = offeredGame();
        const before = structuredClone(offered);
        expect(
            processAction(offered, { type: "peek_card", playerId: "p2" }),
        ).toMatchObject({ type: "error" });
        expect(offered).toEqual(before);
    });

    it("creates detached public snapshots", () => {
        const state = offeredGame();
        state.players[0].faceUpCards.push("rat");
        const before = getCockroachPokerTableView(state);
        state.players[0].faceUpCards.push("spider");
        processAction(state, { type: "peek_card", playerId: "p1" });
        expect(before.players[0].faceUpCards).toEqual(["rat"]);
        expect(before.offerChain?.seenByPlayerIds).toEqual(["p0"]);
        expect(before.offerChain?.receiverPeeked).toBe(false);
    });

    it("restarts an offer without revealing or losing the card if the last pass target leaves after a peek", () => {
        const state = initGame(
            [...players, { id: "p3", name: "Dana" }],
            (cards) => cards,
        );
        processAction(state, {
            type: "offer_card",
            playerId: "p0",
            targetId: "p1",
            cardIndex: 0,
            claim: "fly",
        });
        processAction(state, {
            type: "peek_and_pass",
            playerId: "p1",
            targetId: "p2",
            newClaim: "spider",
        });
        processAction(state, { type: "peek_card", playerId: "p2" });
        const originalHandCount = state.players[0].hand.length;
        removePlayer(state, "p3");
        expect(state).toMatchObject({
            phase: "offering",
            activePlayerId: "p0",
            offerChain: null,
            lastResult: null,
        });
        expect(state.players[0].hand).toHaveLength(originalHandCount + 1);
        expect(state.players[0].hand.at(-1)).toBe("bat");
        expect(state.players.flatMap((player) => player.faceUpCards)).toEqual(
            [],
        );
    });
});
