import { Schema } from "effect";

import {
    decodeUnknownSync,
    encodeJsonMessage,
} from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import { cardSchema } from "~/game/shared/card-schemas";

export const blackjackPhases = [
    "betting",
    "insurance",
    "playing",
    "dealer_turn",
    "settled",
] as const;

export const handOutcomes = [
    "blackjack",
    "win",
    "push",
    "lose",
    "bust",
] as const;

export const blackjackPhaseSchema = Schema.Literals(blackjackPhases);
export const handOutcomeSchema = Schema.Literals(handOutcomes);

const dealerCardSchema = Schema.Union([
    cardSchema,
    Schema.Literal("hidden"),
]);

const playerHandViewSchema = Schema.Struct({
    cards: Schema.mutableKey(Schema.mutable(Schema.Array(cardSchema))),
    bet: Schema.mutableKey(Schema.Number),
    doubled: Schema.mutableKey(Schema.Boolean),
    stood: Schema.mutableKey(Schema.Boolean),
    busted: Schema.mutableKey(Schema.Boolean),
    isBlackjack: Schema.mutableKey(Schema.Boolean),
    value: Schema.mutableKey(Schema.Number),
    soft: Schema.mutableKey(Schema.Boolean),
});

const playerInfoViewSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    chips: Schema.mutableKey(Schema.Number),
    hands: Schema.mutableKey(Schema.mutable(Schema.Array(playerHandViewSchema))),
    currentHandIndex: Schema.mutableKey(Schema.Number),
    done: Schema.mutableKey(Schema.Boolean),
    bet: Schema.mutableKey(Schema.Number),
    insuranceBet: Schema.mutableKey(Schema.Number),
    insuranceDecided: Schema.mutableKey(Schema.Boolean),
});

const dealerViewSchema = Schema.Struct({
    cards: Schema.mutableKey(Schema.mutable(Schema.Array(dealerCardSchema))),
    value: Schema.mutableKey(Schema.NullOr(Schema.Number)),
    upCardValue: Schema.mutableKey(Schema.NullOr(Schema.Number)),
    busted: Schema.mutableKey(Schema.Boolean),
});

export const handResultSchema = Schema.Struct({
    handIndex: Schema.mutableKey(Schema.Number),
    bet: Schema.mutableKey(Schema.Number),
    payout: Schema.mutableKey(Schema.Number),
    outcome: Schema.mutableKey(handOutcomeSchema),
});

export const roundResultSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    playerName: Schema.mutableKey(Schema.String),
    hands: Schema.mutableKey(Schema.mutable(Schema.Array(handResultSchema))),
    insurancePayout: Schema.mutableKey(Schema.Number),
    netChips: Schema.mutableKey(Schema.Number),
});

export const blackjackPlayerViewSchema = Schema.Struct({
    phase: Schema.mutableKey(blackjackPhaseSchema),
    roundNumber: Schema.mutableKey(Schema.Number),
    myId: Schema.mutableKey(Schema.String),
    dealer: Schema.mutableKey(dealerViewSchema),
    players: Schema.mutableKey(Schema.mutable(Schema.Array(playerInfoViewSchema))),
    currentPlayerIndex: Schema.mutableKey(Schema.Number),
    results: Schema.mutableKey(
        Schema.NullOr(Schema.mutable(Schema.Array(roundResultSchema))),
    ),
    shoeCount: Schema.mutableKey(Schema.Number),
    canHit: Schema.mutableKey(Schema.Boolean),
    canStand: Schema.mutableKey(Schema.Boolean),
    canDouble: Schema.mutableKey(Schema.Boolean),
    canSplit: Schema.mutableKey(Schema.Boolean),
    isMyTurn: Schema.mutableKey(Schema.Boolean),
    needsBet: Schema.mutableKey(Schema.Boolean),
    needsInsurance: Schema.mutableKey(Schema.Boolean),
});

export const blackjackErrorPayloadSchema = Schema.Struct({
    message: Schema.mutableKey(Schema.String),
});

export const blackjackActionPayloadSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("bet_placed")),
        playerId: Schema.mutableKey(Schema.String),
        amount: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("dealt")),
        insuranceOffered: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("insurance_resolved")),
        dealerBlackjack: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("player_hit")),
        playerId: Schema.mutableKey(Schema.String),
        handIndex: Schema.mutableKey(Schema.Number),
        busted: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("player_stood")),
        playerId: Schema.mutableKey(Schema.String),
        handIndex: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("player_doubled")),
        playerId: Schema.mutableKey(Schema.String),
        handIndex: Schema.mutableKey(Schema.Number),
        busted: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("player_split")),
        playerId: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("settled")),
        results: Schema.mutableKey(Schema.mutable(Schema.Array(roundResultSchema))),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("new_round")),
        roundNumber: Schema.mutableKey(Schema.Number),
    }),
]);

export const blackjackSettledPayloadSchema = Schema.Struct({
    results: Schema.mutableKey(Schema.mutable(Schema.Array(roundResultSchema))),
});

export const blackjackServerMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("blackjack:state")),
        data: Schema.mutableKey(blackjackPlayerViewSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("blackjack:action")),
        data: Schema.mutableKey(blackjackActionPayloadSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("blackjack:settled")),
        data: Schema.mutableKey(blackjackSettledPayloadSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("blackjack:error")),
        data: Schema.mutableKey(blackjackErrorPayloadSchema),
    }),
]);

export type BlackjackPhase = SchemaType<typeof blackjackPhaseSchema>;
export type HandResult = SchemaType<typeof handResultSchema>;
export type RoundResult = SchemaType<typeof roundResultSchema>;
export type PlayerHandView = SchemaType<typeof playerHandViewSchema>;
export type PlayerInfoView = SchemaType<typeof playerInfoViewSchema>;
export type DealerView = SchemaType<typeof dealerViewSchema>;
export type BlackjackPlayerView = SchemaType<typeof blackjackPlayerViewSchema>;
export type BlackjackServerMessage = SchemaType<
    typeof blackjackServerMessageSchema
>;

export function decodeBlackjackPlayerView(
    raw: unknown,
): BlackjackPlayerView | null {
    try {
        return decodeUnknownSync(blackjackPlayerViewSchema, raw);
    } catch {
        return null;
    }
}

export function encodeBlackjackServerMessage(
    message: BlackjackServerMessage,
): string {
    return encodeJsonMessage(blackjackServerMessageSchema, message);
}
