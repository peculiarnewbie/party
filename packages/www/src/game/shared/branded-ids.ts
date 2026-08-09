import { Schema } from "effect";

const identifierSchema = Schema.String.check(
    Schema.isLengthBetween(1, 64),
    Schema.isPattern(/^[A-Za-z0-9_-]+$/),
);

export const playerIdSchema = identifierSchema.pipe(Schema.brand("PlayerId"));
export type PlayerId = typeof playerIdSchema.Type;

export const nullablePlayerIdSchema = Schema.NullOr(playerIdSchema);
export type NullablePlayerId = typeof nullablePlayerIdSchema.Type;

export const roomIdSchema = identifierSchema.pipe(Schema.brand("RoomId"));
export type RoomId = typeof roomIdSchema.Type;

export function parsePlayerId(input: string): PlayerId {
    return Schema.decodeUnknownSync(playerIdSchema)(input) as PlayerId;
}

export function parseRoomId(input: string): RoomId {
    return Schema.decodeUnknownSync(roomIdSchema)(input) as RoomId;
}
