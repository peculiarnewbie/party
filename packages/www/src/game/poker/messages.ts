import { Effect, Schema } from "effect";

import {
    decodeWithSchema,
    extractMessageType,
    PokerMessageDecodeError,
} from "~/effect/schema-helpers";

type BaseClientMessage = {
    playerId: string;
    playerName: string;
};

export type PokerClientMessage =
    | ({
          type: "poker:act";
          data:
              | { type: "fold" }
              | { type: "check" }
              | { type: "call" }
              | { type: "bet"; amount: number }
              | { type: "raise"; amount: number }
              | { type: "all_in" };
      } & BaseClientMessage);

export type PokerServerMessage =
    | { type: "poker:state"; data: Record<string, unknown> }
    | { type: "poker:event"; data: Record<string, unknown> }
    | { type: "poker:action_result"; data: Record<string, unknown> }
    | { type: "poker:game_over"; data: Record<string, unknown> };

const positiveIntSchema = Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThan(0),
);

const pokerActionSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("fold")),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("check")),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("call")),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("bet")),
        amount: Schema.mutableKey(positiveIntSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("raise")),
        amount: Schema.mutableKey(positiveIntSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("all_in")),
    }),
]);

export const pokerClientMessageSchema = Schema.Struct({
    type: Schema.mutableKey(Schema.Literal("poker:act")),
    playerId: Schema.mutableKey(Schema.String),
    playerName: Schema.mutableKey(Schema.String),
    data: Schema.mutableKey(pokerActionSchema),
});

export const pokerServerMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("poker:state")),
        data: Schema.mutableKey(Schema.Record(Schema.String, Schema.Unknown)),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("poker:event")),
        data: Schema.mutableKey(Schema.Record(Schema.String, Schema.Unknown)),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("poker:action_result")),
        data: Schema.mutableKey(Schema.Record(Schema.String, Schema.Unknown)),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("poker:game_over")),
        data: Schema.mutableKey(Schema.Record(Schema.String, Schema.Unknown)),
    }),
]);

export function decodePokerClientMessage(
    raw: unknown,
): Effect.Effect<PokerClientMessage, PokerMessageDecodeError, never> {
    return decodeWithSchema(pokerClientMessageSchema, raw, (issue, value) => {
        return new PokerMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    }) as Effect.Effect<PokerClientMessage, PokerMessageDecodeError, never>;
}

export function decodePokerServerMessage(
    raw: unknown,
): Effect.Effect<PokerServerMessage, PokerMessageDecodeError, never> {
    return decodeWithSchema(pokerServerMessageSchema, raw, (issue, value) => {
        return new PokerMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    }) as Effect.Effect<PokerServerMessage, PokerMessageDecodeError, never>;
}

export function encodePokerServerMessage(message: PokerServerMessage): string {
    return JSON.stringify(
        Schema.encodeUnknownSync(pokerServerMessageSchema)(message),
    );
}
