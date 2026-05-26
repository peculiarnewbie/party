import { Schema } from "effect";

import { decodeGameClientMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import {
    emptyDataSchema,
    nonNegativeIntSchema,
    serverMessageWithData,
    unknownRecordSchema,
} from "~/game/shared/wire-schemas";

export const funFactsClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("fun_facts:next_question")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                customQuestion: Schema.optionalKey(
                    Schema.mutableKey(Schema.String),
                ),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("fun_facts:submit_answer")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                answer: Schema.mutableKey(Schema.Number),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("fun_facts:close_answers")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("fun_facts:place_arrow")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                position: Schema.mutableKey(nonNegativeIntSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("fun_facts:next_round")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
]);

export const funFactsServerMessageSchema = Schema.Union([
    serverMessageWithData("fun_facts:state", unknownRecordSchema),
    serverMessageWithData("fun_facts:action", unknownRecordSchema),
    serverMessageWithData("fun_facts:game_over", unknownRecordSchema),
    serverMessageWithData("fun_facts:error", unknownRecordSchema),
]);

export type FunFactsClientMessage = SchemaType<
    typeof funFactsClientMessageSchema
>;
export type FunFactsServerMessage = SchemaType<
    typeof funFactsServerMessageSchema
>;

export function decodeFunFactsClientMessage(raw: unknown) {
    return decodeGameClientMessage(
        "fun_facts",
        funFactsClientMessageSchema,
        raw,
    );
}
