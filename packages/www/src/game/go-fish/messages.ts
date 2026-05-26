import { Effect, Schema } from "effect";

import {
    decodeWithSchema,
    extractMessageType,
    GoFishMessageDecodeError,
} from "~/effect/schema-helpers";

const rankSchema = Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(13),
);

export type GoFishClientMessage =
    | {
          type: "go_fish:ask";
          playerId: string;
          playerName: string;
          data: { targetId: string; rank: number };
      }
    | {
          type: "go_fish:draw";
          playerId: string;
          playerName: string;
          data: Record<string, never>;
      };

export type GoFishServerMessage =
    | { type: "go_fish:state"; data: Record<string, unknown> }
    | { type: "go_fish:ask_result"; data: Record<string, unknown> }
    | { type: "go_fish:draw_result"; data: Record<string, unknown> }
    | { type: "go_fish:book_made"; data: Record<string, unknown> }
    | { type: "go_fish:game_over"; data: Record<string, unknown> };

export const goFishClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("go_fish:ask")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                targetId: Schema.mutableKey(Schema.String),
                rank: Schema.mutableKey(rankSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("go_fish:draw")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(Schema.Struct({})),
    }),
]);

export function decodeGoFishClientMessage(
    raw: unknown,
): Effect.Effect<GoFishClientMessage, GoFishMessageDecodeError, never> {
    return decodeWithSchema(goFishClientMessageSchema, raw, (issue, value) => {
        return new GoFishMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    }) as Effect.Effect<GoFishClientMessage, GoFishMessageDecodeError, never>;
}
