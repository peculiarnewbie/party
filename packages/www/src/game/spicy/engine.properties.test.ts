import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { SPICE_TYPES, type SpiceType } from "./types";
import { getAllowedDeclarations, initGame, isValidDeclaration } from "./engine";

describe("spicy engine properties", () => {
    it("deals six unique cards per player and conserves the deck", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 3, max: 6 }),
                fc.boolean(),
                (playerCount, reverse) => {
                    const input = Array.from(
                        { length: playerCount },
                        (_, index) => ({
                            id: `p${index}`,
                            name: `Player ${index}`,
                        }),
                    );
                    const state = initGame(input, {
                        shuffleFn: (cards) =>
                            reverse ? [...cards].reverse() : [...cards],
                        worldEndIndex: 0,
                    });
                    const dealt = state.players.flatMap(
                        (player) => player.hand,
                    );
                    const allIds = [
                        ...dealt.map((card) => card.id),
                        ...state.drawPile.map((card) => card.id),
                    ];

                    expect(
                        state.players.every(
                            (player) => player.hand.length === 6,
                        ),
                    ).toBe(true);
                    expect(dealt.length + state.drawPile.length).toBe(101);
                    expect(new Set(allIds).size).toBe(allIds.length);
                    expect(state.currentPlayerId).toBe(input[0]!.id);
                },
            ),
        );
    });

    it("keeps declaration validation equivalent to advertised choices", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10 }),
                fc.constantFrom(...SPICE_TYPES),
                fc.integer({ min: 1, max: 10 }),
                fc.constantFrom(...SPICE_TYPES),
                (topNumber, topSpice, candidateNumber, candidateSpice) => {
                    const state = {
                        stack: [
                            {
                                playerId: "p0",
                                card: {
                                    id: "card",
                                    kind: "standard" as const,
                                    number: topNumber,
                                    spice: topSpice,
                                },
                                declaredNumber: topNumber,
                                declaredSpice: topSpice,
                            },
                        ],
                    };
                    const allowed = getAllowedDeclarations(state);
                    const expected =
                        allowed.numbers.includes(candidateNumber) &&
                        allowed.spices.includes(candidateSpice as SpiceType);

                    expect(
                        isValidDeclaration(
                            state,
                            candidateNumber,
                            candidateSpice,
                        ),
                    ).toBe(expected);
                },
            ),
        );
    });
});
