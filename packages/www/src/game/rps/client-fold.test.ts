import { describe, expect, it } from "vitest";

import { initGame } from "./mechanics";
import { createRpsFold } from "./client-fold";

describe("RPS client fold ordering", () => {
    it("ignores duplicate events and stale sync responses", () => {
        const initialState = initGame([
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ]);
        const fold = createRpsFold("a");

        fold.applySnapshot(0, initialState);
        fold.processEvent(1, { type: "best_of_changed", bestOf: 1 });
        fold.processEvent(1, { type: "best_of_changed", bestOf: 5 });
        expect(fold.state()?.bestOf).toBe(1);

        fold.applySync({
            snapshot: { index: 0, data: initialState },
            events: [],
            hidden: [],
        });
        expect(fold.state()?.bestOf).toBe(1);
        expect(fold.syncInfo().lastEventIndex).toBe(1);
    });

    it("restores a pending private throw from a snapshot-only sync", () => {
        const state = initGame([
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ]);
        const fold = createRpsFold("a");

        fold.applySync({
            snapshot: { index: 7, data: state },
            events: [],
            hidden: [
                {
                    index: 7,
                    data: { type: "throw_choice", choice: "paper" },
                },
            ],
        });

        expect(fold.myChoice()).toBe("paper");
        expect(fold.view()?.needsToThrow).toBe(false);
        expect(fold.syncInfo()).toEqual({
            lastSnapshotIndex: 7,
            lastEventIndex: 7,
        });
    });

    it("sorts sync entries before folding and clears a revealed throw", () => {
        const state = initGame([
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ]);
        const round = state.rounds[0];
        const match = round.matches[0];
        const fold = createRpsFold(match.player1Id);

        fold.applySync({
            snapshot: { index: 10, data: state },
            hidden: [
                {
                    index: 11,
                    data: { type: "throw_choice", choice: "rock" },
                },
            ],
            events: [
                {
                    index: 12,
                    type: "throw_revealed",
                    data: {
                        type: "throw_revealed",
                        matchIndex: 0,
                        player1Choice: "rock",
                        player2Choice: "scissors",
                        winnerId: match.player1Id,
                    },
                },
                {
                    index: 11,
                    type: "throw_registered",
                    data: {
                        type: "throw_registered",
                        playerId: match.player1Id,
                        matchIndex: 0,
                    },
                },
            ],
        });

        expect(fold.myChoice()).toBeNull();
        expect(fold.syncInfo().lastEventIndex).toBe(12);
        expect(fold.state()?.rounds[0].matches[0].throws).toHaveLength(1);
    });

    it("reset removes state, private data, and sequence positions", () => {
        const state = initGame([
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ]);
        const fold = createRpsFold("a");
        fold.applySnapshot(4, state);
        fold.processHidden(5, { type: "throw_choice", choice: "scissors" });

        fold.reset();

        expect(fold.state()).toBeNull();
        expect(fold.view()).toBeNull();
        expect(fold.myChoice()).toBeNull();
        expect(fold.syncInfo()).toEqual({
            lastSnapshotIndex: 0,
            lastEventIndex: 0,
        });
    });
});
