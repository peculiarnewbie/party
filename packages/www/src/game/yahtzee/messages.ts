import { Effect, Schema } from "effect";

import {
    decodeWithSchema,
    encodeJsonMessage,
    extractMessageType,
    YahtzeeMessageDecodeError,
} from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";

import {
    rolledDiceSchema,
    scoringCategorySchema,
    yahtzeeActionPayloadSchema,
    yahtzeeErrorPayloadSchema,
    yahtzeeGameOverPayloadSchema,
    yahtzeePlayerViewSchema,
} from "./schemas";

export const yahtzeeClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("yahtzee:roll")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(Schema.Struct({})),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("yahtzee:toggle_hold")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                diceIndex: Schema.mutableKey(
                    Schema.Number.check(
                        Schema.isGreaterThanOrEqualTo(0),
                        Schema.isLessThanOrEqualTo(4),
                    ),
                ),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("yahtzee:score")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                category: Schema.mutableKey(scoringCategorySchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("yahtzee:claim")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                category: Schema.mutableKey(scoringCategorySchema),
                claimedDice: Schema.mutableKey(rolledDiceSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("yahtzee:accept_claim")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(Schema.Struct({})),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("yahtzee:challenge_claim")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(Schema.Struct({})),
    }),
]);

export const yahtzeeServerMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("yahtzee:state")),
        data: Schema.mutableKey(yahtzeePlayerViewSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("yahtzee:action")),
        data: Schema.mutableKey(yahtzeeActionPayloadSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("yahtzee:game_over")),
        data: Schema.mutableKey(yahtzeeGameOverPayloadSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("yahtzee:error")),
        data: Schema.mutableKey(yahtzeeErrorPayloadSchema),
    }),
]);

export type YahtzeeClientMessage = SchemaType<typeof yahtzeeClientMessageSchema>;
export type YahtzeeServerMessage = SchemaType<typeof yahtzeeServerMessageSchema>;
export type YahtzeeErrorPayload = SchemaType<typeof yahtzeeErrorPayloadSchema>;
export type YahtzeeGameOverPayload = SchemaType<
    typeof yahtzeeGameOverPayloadSchema
>;
export type YahtzeeActionPayload = SchemaType<typeof yahtzeeActionPayloadSchema>;

export function decodeYahtzeeClientMessage(
    raw: unknown,
): Effect.Effect<YahtzeeClientMessage, YahtzeeMessageDecodeError, never> {
    return decodeWithSchema(yahtzeeClientMessageSchema, raw, (issue, value) => {
        return new YahtzeeMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    });
}

export function decodeYahtzeeServerMessage(
    raw: unknown,
): Effect.Effect<YahtzeeServerMessage, YahtzeeMessageDecodeError, never> {
    return decodeWithSchema(yahtzeeServerMessageSchema, raw, (issue, value) => {
        return new YahtzeeMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    });
}

export function encodeYahtzeeServerMessage(
    message: YahtzeeServerMessage,
): string {
    return encodeJsonMessage(yahtzeeServerMessageSchema, message);
}
