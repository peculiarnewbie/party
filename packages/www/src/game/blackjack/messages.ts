import { Effect, Schema } from "effect";

import {
    decodeWithSchema,
    extractMessageType,
    BlackjackMessageDecodeError,
} from "~/effect/schema-helpers";

const positiveIntSchema = Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThan(0),
);

export type BlackjackClientMessage =
    | {
          type: "blackjack:bet";
          playerId: string;
          playerName: string;
          data: { amount: number };
      }
    | {
          type: "blackjack:hit";
          playerId: string;
          playerName: string;
          data: Record<string, never>;
      }
    | {
          type: "blackjack:stand";
          playerId: string;
          playerName: string;
          data: Record<string, never>;
      }
    | {
          type: "blackjack:double";
          playerId: string;
          playerName: string;
          data: Record<string, never>;
      }
    | {
          type: "blackjack:split";
          playerId: string;
          playerName: string;
          data: Record<string, never>;
      }
    | {
          type: "blackjack:insurance";
          playerId: string;
          playerName: string;
          data: { accept: boolean };
      };

export type BlackjackServerMessage =
    | { type: "blackjack:state"; data: Record<string, unknown> }
    | { type: "blackjack:action"; data: Record<string, unknown> }
    | { type: "blackjack:settled"; data: Record<string, unknown> }
    | { type: "blackjack:error"; data: Record<string, unknown> };

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

export function decodeBlackjackClientMessage(
    raw: unknown,
): Effect.Effect<BlackjackClientMessage, BlackjackMessageDecodeError, never> {
    return decodeWithSchema(blackjackClientMessageSchema, raw, (issue, value) => {
        return new BlackjackMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    }) as Effect.Effect<
        BlackjackClientMessage,
        BlackjackMessageDecodeError,
        never
    >;
}
