import { Schema } from "effect";

import { decodeGameClientMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import {
    emptyDataSchema,
    serverMessageWithData,
    unknownRecordSchema,
} from "~/game/shared/wire-schemas";

export const flip7ClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("flip_7:hit")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("flip_7:stay")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("flip_7:choose_target")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                targetId: Schema.mutableKey(Schema.String),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("flip_7:next_round")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
]);

export const flip7ServerMessageSchema = Schema.Union([
    serverMessageWithData("flip_7:state", unknownRecordSchema),
    serverMessageWithData("flip_7:action", unknownRecordSchema),
    serverMessageWithData("flip_7:error", unknownRecordSchema),
    serverMessageWithData("flip_7:game_over", unknownRecordSchema),
]);

export type Flip7ClientMessage = SchemaType<typeof flip7ClientMessageSchema>;
export type Flip7ServerMessage = SchemaType<typeof flip7ServerMessageSchema>;

export function decodeFlip7ClientMessage(raw: unknown) {
    return decodeGameClientMessage("flip_7", flip7ClientMessageSchema, raw);
}
