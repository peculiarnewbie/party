import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import {
    parsePlayerId,
    parseRoomId,
    nullablePlayerIdSchema,
    roomIdSchema,
} from "./branded-ids";

describe("branded identifiers", () => {
    it("parses URL-safe identifiers at both length boundaries", () => {
        expect(parsePlayerId("a")).toBe("a");
        expect(parseRoomId("x".repeat(64))).toBe("x".repeat(64));
    });

    it.each(["", "x".repeat(65), "has spaces", "slash/value", "plus+"])(
        "rejects invalid identifier %j",
        (identifier) => {
            expect(() => parsePlayerId(identifier)).toThrow();
            expect(() => parseRoomId(identifier)).toThrow();
        },
    );

    it("supports nullable player IDs without accepting undefined", () => {
        expect(
            Schema.decodeUnknownSync(nullablePlayerIdSchema)(null),
        ).toBeNull();
        expect(() =>
            Schema.decodeUnknownSync(nullablePlayerIdSchema)(undefined),
        ).toThrow();
        expect(Schema.decodeUnknownSync(roomIdSchema)("room_1")).toBe("room_1");
    });
});
