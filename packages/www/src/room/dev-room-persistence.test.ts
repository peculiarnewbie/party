import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
    clearPersistedDevRoom,
    defaultPersistedDevRoom,
    devRoomStorageKey,
    loadPersistedDevRoom,
    savePersistedDevRoom,
} from "./dev-room-persistence";

describe("dev-room-persistence", () => {
    const roomId = "test-room";

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        clearPersistedDevRoom(roomId);
    });

    it("round-trips persisted dev room state", () => {
        const state = {
            ...defaultPersistedDevRoom("browser-1"),
            players: [{ id: "dev-1", name: "Alice", autoConnect: true }],
            panelOpen: true,
            selectedTab: "events" as const,
        };

        savePersistedDevRoom(roomId, state);
        expect(localStorage.getItem(devRoomStorageKey(roomId))).toBeTruthy();
        expect(loadPersistedDevRoom(roomId)).toEqual(state);
    });

    it("clears persisted dev room state", () => {
        savePersistedDevRoom(roomId, defaultPersistedDevRoom("browser-1"));
        clearPersistedDevRoom(roomId);
        expect(loadPersistedDevRoom(roomId)).toBeNull();
    });
});
