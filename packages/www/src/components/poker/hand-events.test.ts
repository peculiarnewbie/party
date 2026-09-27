import { describe, expect, it } from "vitest";
import { makeSeat } from "~/game/poker/test-helpers";
import type { PokerEvent } from "~/game/poker";
import { lastSeatActions, potResults, winningsByPlayer } from "./hand-events";

const events: PokerEvent[] = [
    {
        id: 7,
        type: "player_action",
        street: "flop",
        playerId: "p2",
        message: "Bob bet 40",
    },
    { id: 6, type: "board_dealt", street: "flop", message: "Flop dealt" },
    {
        id: 5,
        type: "player_action",
        street: "preflop",
        playerId: "p1",
        message: "Alice raised to 60",
    },
    {
        id: 4,
        type: "player_action",
        street: "preflop",
        playerId: "p3",
        message: "Cara folded",
    },
    { id: 3, type: "hand_started", street: "preflop", message: "Hand 2 started" },
    {
        id: 2,
        type: "pot_awarded",
        street: "showdown",
        amount: 90,
        message: "Alice won 90 chips with Flush",
    },
];

describe("hand events", () => {
    it("only reports actions from the current street of the current hand", () => {
        expect(lastSeatActions(events)).toEqual({
            p2: { id: 7, label: "Bet 40", tone: "raise" },
        });
    });

    it("parses the latest action per player on a fresh street", () => {
        expect(lastSeatActions(events.slice(2))).toEqual({
            p1: { id: 5, label: "Raise 60", tone: "raise" },
            p3: { id: 4, label: "Fold", tone: "fold" },
        });
    });

    it("ignores pots awarded in earlier hands", () => {
        expect(potResults(events, [])).toEqual([]);
    });

    it("uses structured winner ids and falls back to names for older events", () => {
        const players = [
            makeSeat({ id: "p1", name: "Alice" }),
            makeSeat({ id: "p2", name: "Bob" }),
        ];
        const results = potResults(
            [
                {
                    id: 3,
                    type: "pot_awarded",
                    street: "showdown",
                    amount: 50,
                    message: "Alice & Bob won 50 chips with Straight",
                },
                {
                    id: 2,
                    type: "pot_awarded",
                    street: "showdown",
                    amount: 200,
                    message: "Bob won 200 chips with Two Pair",
                    winnerIds: ["p2"],
                    handLabel: "Two Pair",
                },
            ],
            players,
        );
        expect(results.map((result) => result.winnerIds)).toEqual([
            ["p2"],
            ["p1", "p2"],
        ]);
        expect(results[1].handLabel).toBe("Straight");
        expect(winningsByPlayer(results)).toEqual({ p1: 25, p2: 225 });
    });
});
