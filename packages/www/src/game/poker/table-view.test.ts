import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { initGame, processAction, startNextHand } from "./engine";
import { getPokerTableView, pokerTableViewSchema } from "./table-view";
import { pokerStateSchema } from "./schemas";
import type { PokerState } from "./types";

function playAllIn(state: PokerState) {
    for (let turn = 0; turn < 10 && state.actingPlayerIndex !== null; turn++) {
        const player = state.players[state.actingPlayerIndex];
        expect(processAction(state, player.id, { type: "all_in" }).type).toBe(
            "ok",
        );
    }
}

describe("public poker table", () => {
    it("sends only public fields while a hand is in progress", () => {
        const state = initGame([
            { id: "p1", name: "Alice" },
            { id: "p2", name: "Bob" },
        ]);
        const view = getPokerTableView(state);
        expect(view.players).toHaveLength(2);
        expect(
            view.players.every(
                (player) => player.visibleHoleCards.length === 0,
            ),
        ).toBe(true);
        expect(view).not.toHaveProperty("myHoleCards");
        expect(view).not.toHaveProperty("legalActions");
        expect(view).not.toHaveProperty("deck");
        expect(Schema.is(pokerTableViewSchema)(view)).toBe(true);
    });

    it("reveals showdown contenders, keeps folded cards private, and survives persistence", () => {
        const state = initGame([
            { id: "p1", name: "Alice" },
            { id: "p2", name: "Bob" },
            { id: "p3", name: "Cara" },
        ]);
        const folded = state.players[state.actingPlayerIndex ?? 0];
        processAction(state, folded.id, { type: "fold" });
        playAllIn(state);
        const restored = Schema.decodeUnknownSync(pokerStateSchema)(
            JSON.parse(JSON.stringify(state)),
        );
        const view = getPokerTableView(restored);
        for (const player of view.players) {
            expect(player.visibleHoleCards).toHaveLength(
                player.id === folded.id ? 0 : 2,
            );
        }
        const revealed = view.eventLog.find(
            (event) => event.type === "showdown",
        );
        expect(
            revealed?.revealedHands?.map((hand) => hand.playerId),
        ).not.toContain(folded.id);
    });

    it("does not reveal an uncontested hand or carry seat reveals into a new hand", () => {
        const state = initGame([
            { id: "p1", name: "Alice" },
            { id: "p2", name: "Bob" },
        ]);
        processAction(state, state.players[state.actingPlayerIndex ?? 0].id, {
            type: "fold",
        });
        expect(
            getPokerTableView(state).players.every(
                (player) => player.visibleHoleCards.length === 0,
            ),
        ).toBe(true);
        state.eventLog.unshift({
            id: 999,
            type: "showdown",
            message: "Old showdown",
            street: "showdown",
            revealedHands: [
                { playerId: "p1", cards: [...state.players[0].holeCards] },
            ],
        });
        startNextHand(state);
        expect(
            getPokerTableView(state).players.every(
                (player) => player.visibleHoleCards.length === 0,
            ),
        ).toBe(true);
        expect(
            getPokerTableView(state).eventLog.some(
                (event) =>
                    event.type === "pot_awarded" || event.type === "showdown",
            ),
        ).toBe(false);
    });

    it("retains new showdown events after a long session fills the event log", () => {
        const state = initGame([
            { id: "p1", name: "Alice" },
            { id: "p2", name: "Bob" },
        ]);
        for (let hand = 0; hand < 40; hand++) {
            processAction(
                state,
                state.players[state.actingPlayerIndex ?? 0].id,
                { type: "fold" },
            );
            startNextHand(state);
        }
        playAllIn(state);
        expect(
            getPokerTableView(state).players.every(
                (player) => player.visibleHoleCards.length === 2,
            ),
        ).toBe(true);
    });
});
