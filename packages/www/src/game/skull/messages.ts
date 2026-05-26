import { Schema } from "effect";

import { decodeGameClientMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import { skullDiscTypes } from "./schemas";
import {
    emptyDataSchema,
    nonNegativeIntSchema,
    positiveIntSchema,
} from "~/game/shared/wire-schemas";

const discTypeSchema = Schema.Literals(skullDiscTypes);

export const skullClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("skull:play_disc")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                disc: Schema.mutableKey(discTypeSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("skull:start_challenge")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                bid: Schema.mutableKey(positiveIntSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("skull:raise_bid")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                bid: Schema.mutableKey(positiveIntSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("skull:pass_bid")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("skull:flip_disc")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                ownerId: Schema.mutableKey(Schema.String),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("skull:discard_lost_disc")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                discIndex: Schema.mutableKey(nonNegativeIntSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("skull:choose_next_starter")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                playerId: Schema.mutableKey(Schema.String),
            }),
        ),
    }),
]);

export type SkullClientMessage = SchemaType<typeof skullClientMessageSchema>;

export {
    decodeSkullPlayerView,
    decodeSkullSideMessage,
    encodeSkullServerMessage,
    skullServerMessageSchema,
    skullPlayerViewSchema,
    type SkullServerMessage,
} from "./schemas";

export function decodeSkullClientMessage(raw: unknown) {
    return decodeGameClientMessage("skull", skullClientMessageSchema, raw);
}
