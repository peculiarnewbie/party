import { Effect, Schema } from "effect";

import {
    decodeUnknownSync,
    decodeWithSchema,
    encodeJsonMessage,
    extractMessageType,
    PokerMessageDecodeError,
} from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";

import {
    pokerActionResultPayloadSchema,
    pokerActionSchema,
    pokerEventSchema,
    pokerGameOverPayloadSchema,
    pokerPlayerViewSchema,
} from "./schemas";

export { pokerActionSchema, positiveIntSchema } from "./schemas";

export const pokerClientMessageSchema = Schema.Struct({
    type: Schema.mutableKey(Schema.Literal("poker:act")),
    playerId: Schema.mutableKey(Schema.String),
    playerName: Schema.mutableKey(Schema.String),
    data: Schema.mutableKey(pokerActionSchema),
});

export const pokerServerMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("poker:state")),
        data: Schema.mutableKey(pokerPlayerViewSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("poker:event")),
        data: Schema.mutableKey(pokerEventSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("poker:action_result")),
        data: Schema.mutableKey(pokerActionResultPayloadSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("poker:game_over")),
        data: Schema.mutableKey(pokerGameOverPayloadSchema),
    }),
]);

export type PokerClientMessage = SchemaType<typeof pokerClientMessageSchema>;
export type PokerServerMessage = SchemaType<typeof pokerServerMessageSchema>;

export function decodePokerClientMessage(
    raw: unknown,
): Effect.Effect<PokerClientMessage, PokerMessageDecodeError, never> {
    return decodeWithSchema(pokerClientMessageSchema, raw, (issue, value) => {
        return new PokerMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    });
}

export function decodePokerServerMessage(
    raw: unknown,
): Effect.Effect<PokerServerMessage, PokerMessageDecodeError, never> {
    return decodeWithSchema(pokerServerMessageSchema, raw, (issue, value) => {
        return new PokerMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    });
}

export function decodePokerServerMessageOrNull(
    raw: unknown,
): PokerServerMessage | null {
    try {
        return decodeUnknownSync(pokerServerMessageSchema, raw);
    } catch {
        return null;
    }
}

export type PokerSideMessage = Exclude<
    PokerServerMessage,
    { type: "poker:state" }
>;

export function decodePokerSideMessageOrNull(
    raw: unknown,
): PokerSideMessage | null {
    const message = decodePokerServerMessageOrNull(raw);
    if (!message || message.type === "poker:state") {
        return null;
    }

    return message;
}

export function encodePokerServerMessage(message: PokerServerMessage): string {
    return encodeJsonMessage(pokerServerMessageSchema, message);
}
