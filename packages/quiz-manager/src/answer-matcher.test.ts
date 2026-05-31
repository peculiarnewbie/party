import { describe, it, expect } from "vitest";
import { checkFillIn } from "./answer-matcher";
import type { AcceptedAnswer } from "./schemas";

function answer(
    overrides: Partial<AcceptedAnswer> & { pattern?: string; matchType?: string; caseInsensitive?: boolean } = {},
): AcceptedAnswer {
    return {
        id: "a1",
        questionId: "q1",
        pattern: overrides.pattern ?? "",
        matchType: (overrides.matchType ?? "exact") as AcceptedAnswer["matchType"],
        caseInsensitive: overrides.caseInsensitive ?? false,
        sortOrder: 0,
    };
}

describe("checkFillIn", () => {
    describe("exact match", () => {
        it("matches identical strings", () => {
            expect(checkFillIn("paris", [answer({ pattern: "paris", matchType: "exact" })])).toBe(true);
        });

        it("rejects different strings", () => {
            expect(checkFillIn("london", [answer({ pattern: "paris", matchType: "exact" })])).toBe(false);
        });

        it("is case sensitive by default", () => {
            expect(checkFillIn("Paris", [answer({ pattern: "paris", matchType: "exact" })])).toBe(false);
        });

        it("matches case insensitively when flag is set", () => {
            expect(
                checkFillIn("Paris", [answer({ pattern: "paris", matchType: "exact", caseInsensitive: true })]),
            ).toBe(true);
        });

        it("trims whitespace before comparing", () => {
            expect(checkFillIn("  paris  ", [answer({ pattern: "paris", matchType: "exact" })])).toBe(true);
        });
    });

    describe("contains match", () => {
        it("matches when input contains the pattern", () => {
            expect(checkFillIn("the answer is paris", [answer({ pattern: "paris", matchType: "contains" })])).toBe(
                true,
            );
        });

        it("rejects when input does not contain the pattern", () => {
            expect(checkFillIn("the answer is london", [answer({ pattern: "paris", matchType: "contains" })])).toBe(
                false,
            );
        });

        it("is case sensitive by default", () => {
            expect(
                checkFillIn("the answer is Paris", [answer({ pattern: "paris", matchType: "contains" })]),
            ).toBe(false);
        });

        it("matches case insensitively when flag is set", () => {
            expect(
                checkFillIn("the answer is Paris", [
                    answer({ pattern: "paris", matchType: "contains", caseInsensitive: true }),
                ]),
            ).toBe(true);
        });
    });

    describe("any match", () => {
        it("matches any non-empty input", () => {
            expect(checkFillIn("literally anything", [answer({ matchType: "any" })])).toBe(true);
        });

        it("rejects empty input", () => {
            expect(checkFillIn("", [answer({ matchType: "any" })])).toBe(false);
        });

        it("rejects whitespace-only input after trim", () => {
            expect(checkFillIn("   ", [answer({ matchType: "any" })])).toBe(false);
        });
    });

    describe("multiple rules (OR logic)", () => {
        it("passes if any rule matches", () => {
            const rules = [
                answer({ pattern: "paris", matchType: "exact" }),
                answer({ pattern: "london", matchType: "exact" }),
            ];
            expect(checkFillIn("london", rules)).toBe(true);
        });

        it("fails if no rules match", () => {
            const rules = [
                answer({ pattern: "paris", matchType: "exact" }),
                answer({ pattern: "london", matchType: "exact" }),
            ];
            expect(checkFillIn("tokyo", rules)).toBe(false);
        });
    });

    describe("empty rules", () => {
        it("returns false with no rules", () => {
            expect(checkFillIn("anything", [])).toBe(false);
        });
    });
});
