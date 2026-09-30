import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { CREATURE_TYPES } from "./types";
import { initGame } from "./engine";

describe("cockroach poker engine properties", () => {
    it("deals balanced hands without inventing creature cards", () => {
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
                    const state = initGame(input, (cards) =>
                        reverse ? [...cards].reverse() : [...cards],
                    );
                    const allCards = state.players.flatMap(
                        (player) => player.hand,
                    );
                    const expectedHandSize = Math.floor(64 / playerCount);

                    expect(
                        state.players.every(
                            (player) =>
                                player.hand.length >= expectedHandSize &&
                                player.hand.length <= expectedHandSize + 1,
                        ),
                    ).toBe(true);
                    expect(allCards).toHaveLength(64);
                    for (const creature of CREATURE_TYPES) {
                        expect(
                            allCards.filter((card) => card === creature).length,
                        ).toBe(8);
                    }
                    expect(state.activePlayerId).toBe(input[0]!.id);
                    expect(state.phase).toBe("offering");
                },
            ),
        );
    });
});
