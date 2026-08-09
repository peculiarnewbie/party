import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { RANKS, SUITS, type Card } from "~/assets/card-deck/types";
import { getHandValue, isNaturalBlackjack } from "./engine";

const cardArb: fc.Arbitrary<Card> = fc.record({
    rank: fc.constantFrom(...RANKS),
    suit: fc.constantFrom(...SUITS),
});

describe("blackjack mechanics properties", () => {
    it("scores every hand between all-soft and all-hard ace totals", () => {
        fc.assert(
            fc.property(fc.array(cardArb, { maxLength: 20 }), (cards) => {
                const result = getHandValue(cards);
                const low = cards.reduce(
                    (total, card) => total + (card.rank >= 11 ? 10 : card.rank),
                    0,
                );
                const high =
                    low + cards.filter((card) => card.rank === 1).length * 10;

                expect(result.value).toBeGreaterThanOrEqual(low);
                expect(result.value).toBeLessThanOrEqual(high);
                expect((result.value - low) % 10).toBe(0);
                expect(result.soft).toBe(result.value > low);
            }),
        );
    });

    it("is invariant to card order and only calls two-card 21s natural", () => {
        fc.assert(
            fc.property(fc.array(cardArb, { maxLength: 20 }), (cards) => {
                expect(getHandValue([...cards].reverse())).toEqual(
                    getHandValue(cards),
                );
                expect(isNaturalBlackjack(cards)).toBe(
                    cards.length === 2 && getHandValue(cards).value === 21,
                );
            }),
        );
    });
});
