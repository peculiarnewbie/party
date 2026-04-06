import { describe, expect, it } from "bun:test";
import { createRoomId, normalizeRoomId } from "~/utils/room-id";

describe("room id utils", () => {
    it("normalizes room ids to trimmed lowercase values", () => {
        expect(normalizeRoomId("  AbC-123  ")).toBe("abc-123");
    });

    it("creates lowercase room ids", () => {
        expect(createRoomId()).toMatch(/^[a-z0-9]{6}$/);
    });
});
