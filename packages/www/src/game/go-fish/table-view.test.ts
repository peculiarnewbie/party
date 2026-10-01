import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { getGoFishTableView, goFishTableViewSchema } from "./table-view";
import type { GoFishState } from "./types";

describe("Go Fish public table", () => {
    it("publishes counts, requests, and completed books without private card faces", () => {
        const state: GoFishState = {
            players: [
                {
                    id: "p1",
                    name: "Alice",
                    hand: [{ rank: 7, suit: "heart" }],
                    books: [2],
                },
                {
                    id: "p2",
                    name: "Bob",
                    hand: [{ rank: 9, suit: "club" }],
                    books: [],
                },
            ],
            drawPile: [{ rank: 13, suit: "diamond" }],
            currentPlayerIndex: 0,
            turnPhase: "go_fish",
            lastAction: { type: "ask", askerId: "p1", targetId: "p2", rank: 7 },
            lastResult: {
                type: "go_fish",
                playerId: "p1",
                drewAskedRank: false,
                bookMade: false,
            },
            lastAskedRank: 7,
            gameOver: false,
            winner: null,
        };
        const view = getGoFishTableView(state);
        expect(Schema.decodeUnknownSync(goFishTableViewSchema)(view)).toEqual(
            view,
        );
        expect(view.players).toEqual([
            { id: "p1", name: "Alice", cardCount: 1, books: [2] },
            { id: "p2", name: "Bob", cardCount: 1, books: [] },
        ]);
        expect(view.drawPileCount).toBe(1);
        expect(view.lastAction).toEqual(state.lastAction);
        expect(JSON.stringify(view)).not.toMatch(
            /"(?:myHand|hand|drawPile|suit|lastAskedRank)"/,
        );
    });
});
