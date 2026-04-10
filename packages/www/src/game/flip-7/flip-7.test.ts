import { describe, expect, it } from "bun:test";
import { createDeck, getRoundScore, initGame, processAction } from "./engine";
import type { Flip7ActionCardType, Flip7Card } from "./types";

const players = [
    { id: "p1", name: "Alice" },
    { id: "p2", name: "Bob" },
    { id: "p3", name: "Cara" },
];

function n(value: number): Flip7Card {
    return { type: "number", value };
}

function bonus(value: 2 | 4 | 6 | 8 | 10): Flip7Card {
    return { type: "bonus", value };
}

function action(card: Flip7ActionCardType): Flip7Card {
    return { type: "action", action: card };
}

function currentPlayerId(state: ReturnType<typeof initGame>) {
    if (state.currentPlayerIndex === null) return null;
    return state.players[state.currentPlayerIndex]?.id ?? null;
}

describe("createDeck", () => {
    it("builds the standard 94-card deck", () => {
        const deck = createDeck();
        expect(deck).toHaveLength(94);
        expect(
            deck.filter((card) => card.type === "number" && card.value === 12),
        ).toHaveLength(12);
        expect(
            deck.filter((card) => card.type === "action" && card.action === "freeze"),
        ).toHaveLength(3);
        expect(
            deck.filter((card) => card.type === "multiplier"),
        ).toHaveLength(1);
    });
});

describe("round setup", () => {
    it("deals one card to each player and starts with the player left of the dealer", () => {
        const state = initGame(players, "p1", {
            deck: [n(3), n(5), n(7)],
            shuffleMode: "none",
        });

        expect(state.roundNumber).toBe(1);
        expect(state.phase).toBe("turn");
        expect(currentPlayerId(state)).toBe("p2");
        expect(state.players.find((player) => player.id === "p2")?.cards).toEqual([
            n(3),
        ]);
        expect(state.players.find((player) => player.id === "p3")?.cards).toEqual([
            n(5),
        ]);
        expect(state.players.find((player) => player.id === "p1")?.cards).toEqual([
            n(7),
        ]);
    });
});

describe("second chance", () => {
    it("discards the duplicate and second chance instead of busting", () => {
        const state = initGame(players, "p1", {
            deck: [n(3), n(1), n(2), action("second_chance"), n(3)],
            shuffleMode: "none",
        });

        expect(processAction(state, { type: "hit", playerId: "p2" }).type).toBe(
            "player_hit",
        );
        expect(
            state.players.find((player) => player.id === "p2")?.cards,
        ).toEqual([n(3), action("second_chance")]);

        expect(processAction(state, { type: "stay", playerId: "p3" }).type).toBe(
            "player_stayed",
        );
        expect(processAction(state, { type: "stay", playerId: "p1" }).type).toBe(
            "player_stayed",
        );

        expect(processAction(state, { type: "hit", playerId: "p2" }).type).toBe(
            "player_hit",
        );
        const p2 = state.players.find((player) => player.id === "p2");
        expect(p2?.status).toBe("active");
        expect(p2?.cards).toEqual([n(3)]);
        expect(getRoundScore(p2!)).toBe(3);
    });
});

describe("flip three", () => {
    it("draws three cards and defers freeze until the forced draws finish", () => {
        const state = initGame(players, "p1", {
            deck: [
                n(5),
                n(6),
                n(7),
                action("flip_three"),
                bonus(2),
                action("freeze"),
                n(8),
            ],
            shuffleMode: "none",
        });

        expect(processAction(state, { type: "hit", playerId: "p2" }).type).toBe(
            "target_required",
        );
        expect(state.pendingChoice?.card).toBe("flip_three");

        const result = processAction(state, {
            type: "choose_target",
            playerId: "p2",
            targetId: "p2",
        });

        expect(result.type).toBe("target_required");
        expect(state.phase).toBe("awaiting_target");
        expect(state.pendingChoice?.card).toBe("freeze");

        const p2 = state.players.find((player) => player.id === "p2");
        expect(p2?.cards).toEqual([n(5), bonus(2), n(8)]);
        expect(p2?.status).toBe("active");
    });
});

describe("freeze", () => {
    it("forces the last active player to freeze themselves and ends the round", () => {
        const state = initGame(players, "p1", {
            deck: [n(3), n(4), n(5), bonus(2), action("freeze")],
            shuffleMode: "none",
        });

        expect(processAction(state, { type: "hit", playerId: "p2" }).type).toBe(
            "player_hit",
        );
        expect(processAction(state, { type: "stay", playerId: "p3" }).type).toBe(
            "player_stayed",
        );
        expect(processAction(state, { type: "stay", playerId: "p1" }).type).toBe(
            "player_stayed",
        );

        const result = processAction(state, { type: "hit", playerId: "p2" });
        expect(result.type).toBe("round_over");
        expect(state.phase).toBe("round_over");
        expect(state.players.find((player) => player.id === "p2")?.status).toBe(
            "frozen",
        );
        expect(state.lastRoundResult?.scores.find((score) => score.playerId === "p2")?.score).toBe(
            5,
        );
    });
});

describe("flip 7 finish", () => {
    it("ends the round immediately and awards the 15-point bonus", () => {
        const state = initGame(players, "p1", {
            deck: [n(1), n(9), n(8), n(2), n(3), n(4), n(5), n(6), n(0)],
            shuffleMode: "none",
        });

        expect(processAction(state, { type: "hit", playerId: "p2" }).type).toBe(
            "player_hit",
        );
        expect(processAction(state, { type: "stay", playerId: "p3" }).type).toBe(
            "player_stayed",
        );
        expect(processAction(state, { type: "stay", playerId: "p1" }).type).toBe(
            "player_stayed",
        );

        expect(processAction(state, { type: "hit", playerId: "p2" }).type).toBe(
            "player_hit",
        );
        expect(processAction(state, { type: "hit", playerId: "p2" }).type).toBe(
            "player_hit",
        );
        expect(processAction(state, { type: "hit", playerId: "p2" }).type).toBe(
            "player_hit",
        );
        expect(processAction(state, { type: "hit", playerId: "p2" }).type).toBe(
            "player_hit",
        );

        const result = processAction(state, { type: "hit", playerId: "p2" });
        expect(result.type).toBe("round_over");
        expect(state.phase).toBe("round_over");
        expect(state.lastRoundResult?.flip7WinnerId).toBe("p2");
        expect(
            state.lastRoundResult?.scores.find((score) => score.playerId === "p2")
                ?.score,
        ).toBe(36);
        expect(state.players.find((player) => player.id === "p2")?.totalScore).toBe(
            36,
        );
    });
});
