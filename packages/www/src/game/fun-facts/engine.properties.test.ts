import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { initGame } from "./engine";

describe("fun facts engine properties", () => {
    it("preserves every participant and configured round count", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 3, max: 100 }),
                fc.integer({ min: 1, max: 100 }),
                (playerCount, totalRounds) => {
                    const input = Array.from(
                        { length: playerCount },
                        (_, index) => ({
                            id: `p${index}`,
                            name: `Player ${index}`,
                        }),
                    );
                    const state = initGame(input, input[0]!.id, {
                        totalRounds,
                    });

                    expect(state.players).toHaveLength(playerCount);
                    expect(state.players.map((player) => player.id)).toEqual(
                        input.map((player) => player.id),
                    );
                    expect(state.hostId).toBe(input[0]!.id);
                    expect(state.totalRounds).toBe(totalRounds);
                    expect(state.phase).toBe("waiting");
                    expect(state.answers).toEqual({});
                },
            ),
        );
    });
});
