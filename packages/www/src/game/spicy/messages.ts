import { Schema } from "effect";

import { decodeGameClientMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import { CHALLENGE_TRAITS, SPICE_TYPES } from "./types";
import {
    emptyDataSchema,
    serverMessageWithData,
    unknownRecordSchema,
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

export const spicyServerMessageSchema = Schema.Union([
    serverMessageWithData("spicy:state", unknownRecordSchema),
    serverMessageWithData("spicy:action", unknownRecordSchema),
    serverMessageWithData("spicy:error", unknownRecordSchema),
    serverMessageWithData("spicy:game_over", unknownRecordSchema),
]);

export type SpicyClientMessage = SchemaType<typeof spicyClientMessageSchema>;
export type SpicyServerMessage = SchemaType<typeof spicyServerMessageSchema>;

export function decodeSpicyClientMessage(raw: unknown) {
    return decodeGameClientMessage("spicy", spicyClientMessageSchema, raw);
}
