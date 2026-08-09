import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { buildAnswerGroups, normalizeAnswer } from "./engine";

describe("herd mechanics properties", () => {
    it("normalization is idempotent", () => {
        fc.assert(
            fc.property(fc.string(), (answer) => {
                expect(normalizeAnswer(normalizeAnswer(answer))).toBe(
                    normalizeAnswer(answer),
                );
            }),
        );
    });

    it("partitions every answer into exactly one normalized group", () => {
        fc.assert(
            fc.property(
                fc.array(fc.string(), { minLength: 1, maxLength: 40 }),
                fc.integer({ min: 0, max: 1000 }),
                (values, startGroupId) => {
                    const answers = Object.fromEntries(
                        values.map((answer, index) => [`p${index}`, answer]),
                    );
                    const result = buildAnswerGroups(answers, startGroupId);
                    const groupedIds = result.groups
                        .flatMap((group) => group.playerIds)
                        .sort();

                    expect(groupedIds).toEqual(Object.keys(answers).sort());
                    expect(new Set(groupedIds).size).toBe(groupedIds.length);
                    expect(result.nextGroupId).toBe(
                        startGroupId + result.groups.length,
                    );
                    for (const group of result.groups) {
                        const normalized = new Set(
                            group.playerIds.map((id) =>
                                normalizeAnswer(answers[id]!),
                            ),
                        );
                        expect(normalized.size).toBe(1);
                    }
                },
            ),
        );
    });
});
