import { describe, expect, it } from "vitest";
import { breakIntoChips, chipStyle } from "./chips";

describe("chips", () => {
    it("breaks an amount into the largest denominations first", () => {
        expect(breakIntoChips(185)).toEqual([10, 25, 25, 25, 100]);
    });

    it("caps the number of chips drawn", () => {
        expect(breakIntoChips(99, 4)).toHaveLength(4);
    });

    it("picks the chip colour for the largest denomination not above the value", () => {
        expect(chipStyle(25).value).toBe(25);
        expect(chipStyle(30).value).toBe(25);
        expect(chipStyle(0).value).toBe(1);
    });
});
