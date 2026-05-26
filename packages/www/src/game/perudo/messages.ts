import { Schema } from "effect";

import { decodeGameClientMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import {
    emptyDataSchema,
    positiveIntSchema,
    serverMessageWithData,
    unknownRecordSchema,
} from "~/game/shared/wire-schemas";

export const perudoFaceValues = [1, 2, 3, 4, 5, 6] as const;
const faceValueSchema = Schema.Literals(perudoFaceValues);

export const perudoClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("perudo:bid")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                quantity: Schema.mutableKey(positiveIntSchema),
                faceValue: Schema.mutableKey(faceValueSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("perudo:challenge")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("perudo:start_round")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
]);

export const perudoServerMessageSchema = Schema.Union([
    serverMessageWithData("perudo:state", unknownRecordSchema),
    serverMessageWithData("perudo:action", unknownRecordSchema),
    serverMessageWithData("perudo:game_over", unknownRecordSchema),
    serverMessageWithData("perudo:error", unknownRecordSchema),
]);

export type PerudoClientMessage = SchemaType<typeof perudoClientMessageSchema>;
export type PerudoServerMessage = SchemaType<typeof perudoServerMessageSchema>;

export function decodePerudoClientMessage(raw: unknown) {
    return decodeGameClientMessage("perudo", perudoClientMessageSchema, raw);
}
