import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { createDeck } from "./engine";

describe("flip 7 engine properties", () => {
    it("scales every card family linearly with deck count", () => {
        fc.assert(
            fc.property(fc.integer({ min: 1, max: 8 }), (deckCount) => {
                const deck = createDeck(deckCount);

                expect(deck).toHaveLength(94 * deckCount);
                expect(
                    deck.filter((card) => card.type === "number").length,
                ).toBe(79 * deckCount);
                expect(
                    deck.filter((card) => card.type === "bonus").length,
                ).toBe(5 * deckCount);
                expect(
                    deck.filter((card) => card.type === "multiplier").length,
                ).toBe(deckCount);
                expect(
                    deck.filter((card) => card.type === "action").length,
                ).toBe(9 * deckCount);
                for (let value = 1; value <= 12; value += 1) {
                    expect(
                        deck.filter(
                            (card) =>
                                card.type === "number" && card.value === value,
                        ).length,
                    ).toBe(value * deckCount);
                }
            }),
        );
    });
});
