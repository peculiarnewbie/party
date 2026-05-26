import { Effect, Schema } from "effect";

import {
    decodeWithSchema,
    extractMessageType,
    BlackjackMessageDecodeError,
} from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";

const positiveIntSchema = Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThan(0),
);

export const blackjackClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("blackjack:bet")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                amount: Schema.mutableKey(positiveIntSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("blackjack:hit")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(Schema.Struct({})),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("blackjack:stand")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(Schema.Struct({})),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("blackjack:double")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(Schema.Struct({})),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("blackjack:split")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(Schema.Struct({})),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("blackjack:insurance")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                accept: Schema.mutableKey(Schema.Boolean),
            }),
        ),
    }),
]);

export type BlackjackClientMessage = SchemaType<
    typeof blackjackClientMessageSchema
>;

export {
    blackjackServerMessageSchema,
    encodeBlackjackServerMessage,
    type BlackjackServerMessage,
} from "./schemas";

export function decodeBlackjackClientMessage(
    raw: unknown,
): Effect.Effect<BlackjackClientMessage, BlackjackMessageDecodeError, never> {
    return decodeWithSchema(blackjackClientMessageSchema, raw, (issue, value) => {
        return new BlackjackMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    });
}
