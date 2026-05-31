import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
    resolveThrow,
    winsNeeded,
    initGame,
    getCurrentRound,
    findActiveMatch,
    getPlayerMatchPosition,
} from "./mechanics";

const rpsChoiceArb = fc.constantFrom<"rock" | "paper" | "scissors">(
    "rock",
    "paper",
    "scissors",
);
const bestOfArb = fc.constantFrom<1 | 3 | 5>(1, 3, 5);
const idArb = fc.string({ minLength: 1, maxLength: 8 }).filter((s) => /^[a-z0-9]+$/i.test(s));

describe("resolveThrow properties", () => {
    it("same choice is always draw", () => {
        fc.assert(
            fc.property(rpsChoiceArb, (choice) => {
                expect(resolveThrow(choice, choice)).toBe("draw");
            }),
        );
    });

    it("different choices never draw", () => {
        fc.assert(
            fc.property(
                rpsChoiceArb,
                rpsChoiceArb,
                (a, b) => {
                    if (a === b) return true;
                    return resolveThrow(a, b) !== "draw";
                },
            ),
        );
    });

    it("swapping choices flips winner", () => {
        fc.assert(
            fc.property(
                rpsChoiceArb,
                rpsChoiceArb,
                (a, b) => {
                    if (a === b) return true;
                    const r1 = resolveThrow(a, b);
                    const r2 = resolveThrow(b, a);
                    if (r1 === "draw") return r2 === "draw";
                    return r1 !== r2;
                },
            ),
        );
    });

    it("rock-paper-scissors cycle: each beats the next", () => {
        expect(resolveThrow("rock", "scissors")).toBe("p1");
        expect(resolveThrow("scissors", "paper")).toBe("p1");
        expect(resolveThrow("paper", "rock")).toBe("p1");
    });
});

describe("winsNeeded properties", () => {
    it("is always ceil(bestOf / 2)", () => {
        fc.assert(
            fc.property(bestOfArb, (bo) => {
                expect(winsNeeded(bo)).toBe(Math.ceil(bo / 2));
            }),
        );
    });

    it("winsNeeded * 2 > bestOf for odd bestOf", () => {
        fc.assert(
            fc.property(bestOfArb, (bo) => {
                expect(winsNeeded(bo) * 2).toBeGreaterThan(bo);
            }),
        );
    });

    it("winsNeeded is at least 1", () => {
        fc.assert(
            fc.property(bestOfArb, (bo) => {
                expect(winsNeeded(bo)).toBeGreaterThanOrEqual(1);
            }),
        );
    });
});

describe("initGame properties", () => {
    const playerArb = fc
        .array(
            fc.record({
                id: idArb,
                name: fc.string({ minLength: 1, maxLength: 20 }),
            }),
            { minLength: 1, maxLength: 16 },
        )
        .filter(
            (players) => new Set(players.map((p) => p.id)).size === players.length,
        );

    it("preserves player count", () => {
        fc.assert(
            fc.property(playerArb, (players) => {
                const state = initGame(players);
                expect(state.players).toHaveLength(players.length);
            }),
        );
    });

    it("single player is immediately tournament_over", () => {
        fc.assert(
            fc.property(
                fc.record({
                    id: idArb,
                    name: fc.string({ minLength: 1, maxLength: 20 }),
                }),
                (player) => {
                    const state = initGame([player]);
                    expect(state.phase).toBe("tournament_over");
                    expect(state.winnerId).toBe(player.id);
                },
            ),
        );
    });

    it("always starts at round 1 (or 0 for single player)", () => {
        fc.assert(
            fc.property(playerArb, (players) => {
                const state = initGame(players);
                if (players.length <= 1) {
                    expect(state.currentRound).toBe(0);
                } else {
                    expect(state.currentRound).toBe(1);
                }
            }),
        );
    });

    it("all players present in state", () => {
        fc.assert(
            fc.property(playerArb, (players) => {
                const state = initGame(players);
                const stateIds = state.players.map((p) => p.id).sort();
                const inputIds = players.map((p) => p.id).sort();
                expect(stateIds).toEqual(inputIds);
            }),
        );
    });

    it("first round has floor(n/2) matches", () => {
        fc.assert(
            fc.property(playerArb, (players) => {
                if (players.length <= 1) return true;
                const state = initGame(players);
                const firstRound = state.rounds[0];
                expect(firstRound.matches.length).toBe(
                    Math.floor(players.length / 2),
                );
            }),
        );
    });
});

describe("getPlayerMatchPosition properties", () => {
    it("each player in a match has exactly one position", () => {
        fc.assert(
            fc.property(
                fc
                    .array(
                        fc.record({
                            id: idArb,
                            name: fc.string({ minLength: 1, maxLength: 20 }),
                        }),
                        { minLength: 2, maxLength: 8 },
                    )
                    .filter(
                        (ps) => new Set(ps.map((p) => p.id)).size === ps.length,
                    ),
                (players) => {
                    const state = initGame(players);
                    const round = getCurrentRound(state);
                    if (!round) return;

                    for (const match of round.matches) {
                        const pos1 = getPlayerMatchPosition(match, match.player1Id);
                        const pos2 = getPlayerMatchPosition(match, match.player2Id);
                        expect(pos1).toBe("p1");
                        expect(pos2).toBe("p2");
                    }
                },
            ),
        );
    });

    it("non-participants get null", () => {
        fc.assert(
            fc.property(
                fc
                    .array(
                        fc.record({
                            id: idArb,
                            name: fc.string({ minLength: 1, maxLength: 20 }),
                        }),
                        { minLength: 2, maxLength: 8 },
                    )
                    .filter(
                        (ps) => new Set(ps.map((p) => p.id)).size === ps.length,
                    ),
                (players) => {
                    const state = initGame(players);
                    const round = getCurrentRound(state);
                    if (!round) return;

                    for (const match of round.matches) {
                        expect(getPlayerMatchPosition(match, "nonexistent")).toBeNull();
                    }
                },
            ),
        );
    });
});
