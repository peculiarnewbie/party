import { customAlphabet } from "nanoid";

const ROOM_ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const ROOM_ID_LENGTH = 6;

const generateRoomId = customAlphabet(ROOM_ID_ALPHABET, ROOM_ID_LENGTH);

export function normalizeRoomId(roomId: string) {
    return roomId.trim().toLowerCase();
}

export function createRoomId() {
    return generateRoomId();
}
