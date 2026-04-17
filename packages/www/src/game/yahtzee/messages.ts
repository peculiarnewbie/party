import { Effect, Schema } from "effect";

import {
    decodeWithSchema,
    extractMessageType,
    YahtzeeMessageDecodeError,
} from "~/effect/schema-helpers";

import type { Dice, ScoringCategory } from "./types";

const scoringCategories = [
    "ones",
    "twos",
    "threes",
    "fours",
    "fives",
    "sixes",
    "three_of_a_kind",
    "four_of_a_kind",
    "full_house",
    "small_straight",
    "large_straight",
    "yahtzee",
    "chance",
] as const;

const scoringCategorySchema = Schema.Literals(scoringCategories);
const dieSchema = Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(6),
);
const diceSchema = Schema.mutable(
    Schema.Tuple([dieSchema, dieSchema, dieSchema, dieSchema, dieSchema]),
);

type BaseClientMessage = {
    playerId: string;
    playerName: string;
};

export type YahtzeeClientMessage =
    | ({
          type: "yahtzee:roll";
          data: Record<string, never>;
      } & BaseClientMessage)
    | ({
          type: "yahtzee:toggle_hold";
          data: { diceIndex: number };
      } & BaseClientMessage)
    | ({
          type: "yahtzee:score";
          data: { category: ScoringCategory };
      } & BaseClientMessage)
    | ({
          type: "yahtzee:claim";
          data: { category: ScoringCategory; claimedDice: Dice };
      } & BaseClientMessage)
    | ({
          type: "yahtzee:accept_claim";
          data: Record<string, never>;
      } & BaseClientMessage)
    | ({
          type: "yahtzee:challenge_claim";
          data: Record<string, never>;
      } & BaseClientMessage);

export type YahtzeeServerMessage =
    | { type: "yahtzee:state"; data: Record<string, unknown> }
    | { type: "yahtzee:action"; data: Record<string, unknown> }
    | { type: "yahtzee:game_over"; data: Record<string, unknown> }
    | { type: "yahtzee:error"; data: Record<string, unknown> };

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
                claimedDice: Schema.mutableKey(diceSchema),
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
        data: Schema.mutableKey(Schema.Record(Schema.String, Schema.Unknown)),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("yahtzee:action")),
        data: Schema.mutableKey(Schema.Record(Schema.String, Schema.Unknown)),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("yahtzee:game_over")),
        data: Schema.mutableKey(Schema.Record(Schema.String, Schema.Unknown)),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("yahtzee:error")),
        data: Schema.mutableKey(Schema.Record(Schema.String, Schema.Unknown)),
    }),
]);

export function decodeYahtzeeClientMessage(
    raw: unknown,
): Effect.Effect<YahtzeeClientMessage, YahtzeeMessageDecodeError, never> {
    return decodeWithSchema(yahtzeeClientMessageSchema, raw, (issue, value) => {
        return new YahtzeeMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    }) as Effect.Effect<YahtzeeClientMessage, YahtzeeMessageDecodeError, never>;
}

export function decodeYahtzeeServerMessage(
    raw: unknown,
): Effect.Effect<YahtzeeServerMessage, YahtzeeMessageDecodeError, never> {
    return decodeWithSchema(yahtzeeServerMessageSchema, raw, (issue, value) => {
        return new YahtzeeMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    }) as Effect.Effect<YahtzeeServerMessage, YahtzeeMessageDecodeError, never>;
}

export function encodeYahtzeeServerMessage(
    message: YahtzeeServerMessage,
): string {
    return JSON.stringify(
        Schema.encodeUnknownSync(yahtzeeServerMessageSchema)(message),
    );
}
