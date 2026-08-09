import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { initGame } from "./engine";

describe("cheese thief engine properties", () => {
    it("assigns one valid thief and symmetric night observations", () => {
        fc.assert(
            fc.property(fc.integer({ min: 4, max: 8 }), (playerCount) => {
                const input = Array.from(
                    { length: playerCount },
                    (_, index) => ({
                        id: `p${index}`,
                        name: `Player ${index}`,
                    }),
                );
                const state = initGame(input, input[0]!.id);
                const thieves = state.players.filter(
                    (player) => player.role === "thief",
                );

                expect(state.players.map((player) => player.id).sort()).toEqual(
                    input.map((player) => player.id).sort(),
                );
                expect(thieves).toHaveLength(1);
                expect(thieves[0]!.id).toBe(state.thiefId);
                expect(thieves[0]!.dieValue).toBe(3);
                expect(state.followerIds.sort()).toEqual(
                    state.players
                        .filter((player) => player.isFollower)
                        .map((player) => player.id)
                        .sort(),
                );

                for (const player of state.players) {
                    expect(player.dieValue).toBeGreaterThanOrEqual(1);
                    expect(player.dieValue).toBeLessThanOrEqual(6);
                    expect(state.observations[player.id]).not.toContain(
                        player.id,
                    );
                    for (const observedId of state.observations[player.id] ??
                        []) {
                        expect(state.observations[observedId]).toContain(
                            player.id,
                        );
                    }
                }
            }),
        );
    });
});
