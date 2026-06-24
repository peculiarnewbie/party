const STORAGE_PREFIX = "party:devtools:room:";

import type { PersistedDevRoom } from "./types";

export function devRoomStorageKey(roomId: string) {
    return `${STORAGE_PREFIX}${roomId}`;
}

export function loadPersistedDevRoom(roomId: string): PersistedDevRoom | null {
    if (typeof localStorage === "undefined") return null;

    try {
        const raw = localStorage.getItem(devRoomStorageKey(roomId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PersistedDevRoom;
        if (parsed.version !== 1) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function savePersistedDevRoom(
    roomId: string,
    state: PersistedDevRoom,
): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(devRoomStorageKey(roomId), JSON.stringify(state));
}

export function clearPersistedDevRoom(roomId: string): void {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(devRoomStorageKey(roomId));
}

export function defaultPersistedDevRoom(
    activePlayerId: string,
): PersistedDevRoom {
    return {
        version: 1,
        activePlayerId,
        players: [],
        panelOpen: false,
        selectedTab: "players",
    };
}
