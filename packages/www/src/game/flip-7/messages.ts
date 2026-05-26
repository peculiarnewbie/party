import { Schema } from "effect";

import { decodeGameClientMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import { emptyDataSchema } from "~/game/shared/wire-schemas";

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

export type Flip7ClientMessage = SchemaType<typeof flip7ClientMessageSchema>;

export {
    flip7ServerMessageSchema,
    encodeFlip7ServerMessage,
    type Flip7ServerMessage,
} from "./schemas";

export function decodeFlip7ClientMessage(raw: unknown) {
    return decodeGameClientMessage("flip_7", flip7ClientMessageSchema, raw);
}
