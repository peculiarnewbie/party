import { Schema } from "effect";

import { decodeGameClientMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import { CHALLENGE_TRAITS, SPICE_TYPES } from "./schemas";
import {
    emptyDataSchema,
} from "~/game/shared/wire-schemas";

const spiceTypeSchema = Schema.Literals(SPICE_TYPES);
const challengeTraitSchema = Schema.Literals(CHALLENGE_TRAITS);

const declaredNumberSchema = Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(10),
);

export const spicyClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("spicy:play_card")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                cardId: Schema.mutableKey(Schema.String),
                declaredNumber: Schema.mutableKey(declaredNumberSchema),
                declaredSpice: Schema.mutableKey(spiceTypeSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("spicy:pass")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("spicy:challenge")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                trait: Schema.mutableKey(challengeTraitSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("spicy:confirm_last_card")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
]);

export type SpicyClientMessage = SchemaType<typeof spicyClientMessageSchema>;

export {
    decodeSpicyPlayerView,
    decodeSpicySideMessage,
    encodeSpicyServerMessage,
    spicyServerMessageSchema,
    spicyPlayerViewSchema,
    type SpicyServerMessage,
} from "./schemas";

export function decodeSpicyClientMessage(raw: unknown) {
    return decodeGameClientMessage("spicy", spicyClientMessageSchema, raw);
}
