import { Schema } from "effect";

import { decodeGameClientMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import {
    emptyDataSchema,
    serverMessageWithData,
    shortTextSchema,
    unknownRecordSchema,
} from "~/game/shared/wire-schemas";

export const herdClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("herd:toggle_pink_cow")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                enabled: Schema.mutableKey(Schema.Boolean),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("herd:next_question")),
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
        type: Schema.mutableKey(Schema.Literal("herd:submit_answer")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                answer: Schema.mutableKey(shortTextSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("herd:close_answers")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("herd:merge_groups")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                groupId1: Schema.mutableKey(Schema.String),
                groupId2: Schema.mutableKey(Schema.String),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("herd:confirm_scoring")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("herd:next_round")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
]);

export const herdServerMessageSchema = Schema.Union([
    serverMessageWithData("herd:state", unknownRecordSchema),
    serverMessageWithData("herd:action", unknownRecordSchema),
    serverMessageWithData("herd:game_over", unknownRecordSchema),
    serverMessageWithData("herd:error", unknownRecordSchema),
]);

export type HerdClientMessage = SchemaType<typeof herdClientMessageSchema>;
export type HerdServerMessage = SchemaType<typeof herdServerMessageSchema>;

export function decodeHerdClientMessage(raw: unknown) {
    return decodeGameClientMessage("herd", herdClientMessageSchema, raw);
}
