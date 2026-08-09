import { describe, expect, it } from "vitest";
import { createRoomId, isValidRoomId, normalizeRoomId } from "~/utils/room-id";

describe("room id utils", () => {
    it("normalizes room ids to trimmed lowercase values", () => {
        expect(normalizeRoomId("  AbC-123  ")).toBe("abc-123");
    });

    it("creates lowercase room ids", () => {
        expect(createRoomId()).toMatch(/^[a-z0-9]{6}$/);
    });

    it.each(["a", "party-room_1", "x".repeat(64)])(
        "accepts valid room id %j",
        (roomId) => {
            expect(isValidRoomId(roomId)).toBe(true);
        },
    );

    it.each(["", "has spaces", "../escape", "UPPER", "x".repeat(65)])(
        "rejects invalid room id %j",
        (roomId) => {
            expect(isValidRoomId(roomId)).toBe(false);
        },
    );
});
