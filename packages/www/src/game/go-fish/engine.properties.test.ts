import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { initGame } from "./engine";

describe("go fish engine properties", () => {
    it("conserves all 52 cards across hands, books, and draw pile", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 2, max: 6 }),
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
                    const cardsInHands = state.players.reduce(
                        (total, player) => total + player.hand.length,
                        0,
                    );
                    const cardsInBooks = state.players.reduce(
                        (total, player) => total + player.books.length * 4,
                        0,
                    );

                    expect(
                        cardsInHands + cardsInBooks + state.drawPile.length,
                    ).toBe(52);
                    expect(state.players).toHaveLength(playerCount);
                    expect(state.currentPlayerIndex).toBe(0);
                    expect(state.gameOver).toBe(false);
                },
            ),
        );
    });
});
