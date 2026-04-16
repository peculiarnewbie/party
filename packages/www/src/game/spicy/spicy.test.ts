import { describe, expect, it } from "bun:test";
import { endGameByHost, getAllowedDeclarations, initGame, processAction } from "./engine";
import type { SpicyState } from "./types";

const noShuffle = <T>(items: T[]) => [...items];

const players = [
    { id: "p1", name: "A" },
    { id: "p2", name: "B" },
    { id: "p3", name: "C" },
];

function getState(overrides?: Partial<SpicyState>) {
    return {
        ...initGame(players, { shuffleFn: noShuffle, worldEndIndex: 100 }),
        ...overrides,
    };
}

describe("spicy initGame", () => {
    it("deals 6 cards to each player and inserts World’s End into the draw pile", () => {
        const state = initGame(players, { shuffleFn: noShuffle, worldEndIndex: 5 });

        expect(state.players).toHaveLength(3);
        expect(state.players.every((player) => player.hand.length === 6)).toBe(true);
        expect(state.drawPile.some((card) => card.kind === "worlds_end")).toBe(true);
        expect(state.currentPlayerId).toBe("p1");
    });
});

describe("declaration rules", () => {
    it("starts each stack at 1 to 3 in any spice", () => {
        const state = getState({ stack: [] });
        expect(getAllowedDeclarations(state)).toEqual({
            numbers: [1, 2, 3],
            spices: ["chili", "wasabi", "pepper"],
        });
    });

    it("forces the same spice and a higher number after the first card", () => {
        const state = getState();
        const firstCardId = state.players[0].hand[0]!.id;
        processAction(state, {
            type: "play_card",
            playerId: "p1",
            cardId: firstCardId,
            declaredNumber: 3,
            declaredSpice: "pepper",
        });

        expect(getAllowedDeclarations(state)).toEqual({
            numbers: [4, 5, 6, 7, 8, 9, 10],
            spices: ["pepper"],
        });
    });
});

describe("turn resolution", () => {
    it("treats an invalid declaration as a pass and draws a card", () => {
        const state = getState();
        const startingHand = state.players[0].hand.length;
        const firstCardId = state.players[0].hand[0]!.id;

        const result = processAction(state, {
            type: "play_card",
            playerId: "p1",
            cardId: firstCardId,
            declaredNumber: 8,
            declaredSpice: "pepper",
        });

        expect(result.type).toBe("ok");
        if (result.type === "ok") {
            expect(result.events[result.events.length - 1]).toMatchObject({
                type: "invalid_declaration",
                playerId: "p1",
                drewCount: 1,
            });
        }
        expect(state.players[0].hand.length).toBe(startingHand + 1);
        expect(state.stack).toHaveLength(0);
        expect(state.currentPlayerId).toBe("p2");
    });

    it("lets any other player challenge the top card", () => {
        const state = getState();
        state.players[0].hand = [{ id: "wild-number", kind: "wild_number" }];
        state.players[1].hand = [{ id: "standard", kind: "standard", number: 6, spice: "chili" }];

        processAction(state, {
            type: "play_card",
            playerId: "p1",
            cardId: "wild-number",
            declaredNumber: 1,
            declaredSpice: "wasabi",
        });

        const result = processAction(state, {
            type: "challenge",
            playerId: "p3",
            trait: "spice",
        });

        expect(result.type).toBe("ok");
        if (result.type === "ok") {
            expect(result.events.some((event) => event.type === "challenge_resolved")).toBe(
                true,
            );
        }
        expect(state.players.find((player) => player.id === "p3")?.wonCardCount).toBe(1);
        expect(state.currentPlayerId).toBe("p1");
    });
});

describe("trophies and ending", () => {
    it("awards a trophy after everyone declines to challenge a last card", () => {
        const state = getState();
        state.players[0].hand = [{ id: "last", kind: "standard", number: 2, spice: "chili" }];

        processAction(state, {
            type: "play_card",
            playerId: "p1",
            cardId: "last",
            declaredNumber: 2,
            declaredSpice: "pepper",
        });

        processAction(state, {
            type: "confirm_last_card",
            playerId: "p2",
        });
        const result = processAction(state, {
            type: "confirm_last_card",
            playerId: "p3",
        });

        expect(result.type).toBe("ok");
        expect(state.players[0].trophies).toBe(1);
        expect(state.phase).toBe("playing");
        expect(state.pendingLastCardPlayerId).toBeNull();
    });

    it("ends immediately when a player takes a second trophy", () => {
        const state = getState();
        state.players[0].trophies = 1;
        state.trophiesRemaining = 2;
        state.players[0].hand = [{ id: "last", kind: "standard", number: 2, spice: "chili" }];

        processAction(state, {
            type: "play_card",
            playerId: "p1",
            cardId: "last",
            declaredNumber: 2,
            declaredSpice: "chili",
        });
        processAction(state, {
            type: "confirm_last_card",
            playerId: "p2",
        });
        processAction(state, {
            type: "confirm_last_card",
            playerId: "p3",
        });

        expect(state.phase).toBe("game_over");
        expect(state.winners).toEqual(["p1"]);
        expect(state.endReason).toBe("two_trophies");
    });

    it("reveals World’s End when a draw would hit it", () => {
        const state = getState();
        state.drawPile = [{ id: "worlds_end", kind: "worlds_end" }];

        const result = processAction(state, {
            type: "pass",
            playerId: "p1",
        });

        expect(result.type).toBe("ok");
        expect(state.phase).toBe("game_over");
        expect(state.endReason).toBe("worlds_end");
    });

    it("can be ended by the host and still calculates scores", () => {
        const state = getState();
        state.players[0].wonCardCount = 8;
        state.players[1].wonCardCount = 3;
        state.players[2].wonCardCount = 1;

        const result = endGameByHost(state);

        expect(result.type).toBe("game_over");
        expect(state.phase).toBe("game_over");
        expect(state.finalScores?.[0]?.points).toBeGreaterThan(
            state.finalScores?.[1]?.points ?? 0,
        );
    });
});
