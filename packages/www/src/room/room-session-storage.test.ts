import { afterEach, describe, expect, it, vi } from "vitest";

import {
    loadRoomSessionToken,
    saveRoomSessionToken,
} from "./room-session-storage";

afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
});

describe("room session storage", () => {
    it("round-trips tokens independently by room and player", () => {
        saveRoomSessionToken("room-a", "player-1", "token-a");
        saveRoomSessionToken("room-b", "player-1", "token-b");
        saveRoomSessionToken("room-a", "player-2", "token-c");

        expect(loadRoomSessionToken("room-a", "player-1")).toBe("token-a");
        expect(loadRoomSessionToken("room-b", "player-1")).toBe("token-b");
        expect(loadRoomSessionToken("room-a", "player-2")).toBe("token-c");
        expect(loadRoomSessionToken("room-c", "player-1")).toBeNull();
    });

    it("fails safely when browser storage access is blocked", () => {
        vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
            throw new DOMException("Blocked", "SecurityError");
        });
        expect(() =>
            saveRoomSessionToken("room-a", "player-1", "token"),
        ).not.toThrow();

        vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
            throw new DOMException("Blocked", "SecurityError");
        });
        expect(loadRoomSessionToken("room-a", "player-1")).toBeNull();
    });
});
