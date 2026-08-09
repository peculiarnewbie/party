import { describe, expect, it } from "vitest";
import fc from "fast-check";

import type { FaceValue } from "./types";
import { isValidBid } from "./engine";

const faceArb = fc
    .integer({ min: 1, max: 6 })
    .map((value) => value as FaceValue);

describe("perudo mechanics properties", () => {
    it("accepts strictly higher in-range quantities", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 2, max: 40 }),
                fc.integer({ min: 1, max: 39 }),
                faceArb,
                faceArb,
                (totalDice, quantity, currentFace, nextFace) => {
                    fc.pre(quantity < totalDice);
                    const result = isValidBid(
                        { quantity: quantity + 1, faceValue: nextFace },
                        {
                            playerId: "p0",
                            quantity,
                            faceValue: currentFace,
                        },
                        totalDice,
                    );
                    expect(result.valid).toBe(true);
                },
            ),
        );
    });

    it("rejects every quantity above the dice in play", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 40 }),
                fc.integer({ min: 1, max: 40 }),
                faceArb,
                (totalDice, excess, faceValue) => {
                    expect(
                        isValidBid(
                            { quantity: totalDice + excess, faceValue },
                            null,
                            totalDice,
                        ).valid,
                    ).toBe(false);
                },
            ),
        );
    });
});
