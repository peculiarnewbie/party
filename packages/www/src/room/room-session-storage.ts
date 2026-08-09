const KEY_PREFIX = "party:room-session";

function key(roomId: string, playerId: string): string {
    return `${KEY_PREFIX}:${roomId}:${playerId}`;
}

export function loadRoomSessionToken(
    roomId: string,
    playerId: string,
): string | null {
    if (typeof window === "undefined") return null;
    try {
        return window.localStorage.getItem(key(roomId, playerId));
    } catch {
        return null;
    }
}

export function saveRoomSessionToken(
    roomId: string,
    playerId: string,
    token: string,
): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(key(roomId, playerId), token);
    } catch {}
}
