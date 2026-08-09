import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { initGame } from "./engine";

describe("skull engine properties", () => {
    it("gives every player one skull, three flowers, and a valid starter", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 3, max: 6 }),
                fc.nat(),
                (playerCount, selectedIndex) => {
                    const input = Array.from(
                        { length: playerCount },
                        (_, index) => ({
                            id: `p${index}`,
                            name: `Player ${index}`,
                        }),
                    );
                    const starter = input[selectedIndex % playerCount]!;
                    const state = initGame(input, () => starter.id);

                    expect(state.players).toHaveLength(playerCount);
                    expect(state.starterPlayerId).toBe(starter.id);
                    expect(state.currentPlayerId).toBe(starter.id);
                    for (const player of state.players) {
                        expect(player.hand).toHaveLength(4);
                        expect(
                            player.hand.filter((disc) => disc === "skull"),
                        ).toHaveLength(1);
                        expect(
                            player.hand.filter((disc) => disc === "flower"),
                        ).toHaveLength(3);
                        expect(player.mat).toEqual([]);
                    }
                },
            ),
        );
    });
});
