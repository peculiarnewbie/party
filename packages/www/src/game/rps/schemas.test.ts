import { describe, expect, it } from "vitest";

import { decodeRpsSideMessage } from "./schemas";

describe("RPS wire schema", () => {
    it("decodes plan-shaped ledger event messages", () => {
        const decoded = decodeRpsSideMessage({
            type: "rps:event",
            index: 1,
            data: {
                type: "throw_registered",
                playerId: "alice",
                matchIndex: 0,
            },
        });

        expect(decoded).toEqual({
            type: "rps:event",
            index: 1,
            data: {
                type: "throw_registered",
                playerId: "alice",
                matchIndex: 0,
            },
        });
    });

    it("rejects old nested ledger event messages", () => {
        const decoded = decodeRpsSideMessage({
            type: "rps:event",
            data: {
                index: 1,
                data: {
                    type: "throw_registered",
                    playerId: "alice",
                    matchIndex: 0,
                },
            },
        });

        expect(decoded).toBeNull();
    });
});
