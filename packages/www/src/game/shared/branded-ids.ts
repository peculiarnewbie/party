import { Schema } from "effect";

export const playerIdSchema = Schema.String.pipe(Schema.brand("PlayerId"));
export type PlayerId = typeof playerIdSchema.Type;

export const nullablePlayerIdSchema = Schema.NullOr(playerIdSchema);
export type NullablePlayerId = typeof nullablePlayerIdSchema.Type;

export const roomIdSchema = Schema.String.pipe(Schema.brand("RoomId"));
export type RoomId = typeof roomIdSchema.Type;

export function parsePlayerId(input: string): PlayerId {
    return Schema.decodeUnknownSync(playerIdSchema)(input) as PlayerId;
}

export function parseRoomId(input: string): RoomId {
    return Schema.decodeUnknownSync(roomIdSchema)(input) as RoomId;
}
