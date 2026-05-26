import { Schema } from "effect";

import type { SchemaType } from "~/effect/schema-types";
import {
    buildGameServerMessageSchema,
    createPlayerViewDecoder,
    createServerMessageDecoder,
    encodeGameServerMessage,
} from "~/game/shared/game-wire";

export const FLIP_7_ACTION_CARD_TYPES = [
    "freeze",
    "flip_three",
    "second_chance",
] as const;
export const FLIP_7_BONUS_MODIFIER_VALUES = [2, 4, 6, 8, 10] as const;

const flip7ActionCardTypeSchema = Schema.Literals(FLIP_7_ACTION_CARD_TYPES);
const flip7BonusModifierValueSchema = Schema.Literals(FLIP_7_BONUS_MODIFIER_VALUES);
const flip7DeferredActionSchema = Schema.Literals(["freeze", "flip_three"] as const);

export const flip7CardSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("number")),
        value: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("bonus")),
        value: Schema.mutableKey(flip7BonusModifierValueSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("multiplier")),
        value: Schema.mutableKey(Schema.Literal(2)),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("action")),
        action: Schema.mutableKey(flip7ActionCardTypeSchema),
    }),
]);

const flip7PlayerStatuses = ["active", "stayed", "busted", "frozen"] as const;
const flip7Phases = [
    "initial_deal",
    "turn",
    "awaiting_target",
    "round_over",
    "game_over",
] as const;
const flip7RoundEndReasons = [
    "all_players_inactive",
    "flip7",
    "host_ended",
    "too_few_players",
    "deck_exhausted",
] as const;
const flip7ShuffleModes = ["random", "none"] as const;
const flip7CardViewKinds = ["number", "bonus", "multiplier", "action"] as const;

const flip7PlayerStatusSchema = Schema.Literals(flip7PlayerStatuses);
const flip7PhaseSchema = Schema.Literals(flip7Phases);
const flip7RoundEndReasonSchema = Schema.Literals(flip7RoundEndReasons);
const flip7ShuffleModeSchema = Schema.Literals(flip7ShuffleModes);
const flip7CardViewKindSchema = Schema.Literals(flip7CardViewKinds);

const flip7PlayerStateSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    totalScore: Schema.mutableKey(Schema.Number),
    status: Schema.mutableKey(flip7PlayerStatusSchema),
    cards: Schema.mutableKey(Schema.mutable(Schema.Array(flip7CardSchema))),
});

const flip7RoundScoreSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    score: Schema.mutableKey(Schema.Number),
    totalScore: Schema.mutableKey(Schema.Number),
    status: Schema.mutableKey(flip7PlayerStatusSchema),
    numberTotal: Schema.mutableKey(Schema.Number),
    flatModifierTotal: Schema.mutableKey(Schema.Number),
    usedMultiplier: Schema.mutableKey(Schema.Boolean),
    flip7Bonus: Schema.mutableKey(Schema.Number),
});

export const flip7RoundResultSchema = Schema.Struct({
    roundNumber: Schema.mutableKey(Schema.Number),
    dealerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    endReason: Schema.mutableKey(flip7RoundEndReasonSchema),
    flip7WinnerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    scores: Schema.mutableKey(Schema.mutable(Schema.Array(flip7RoundScoreSchema))),
});

const flip7PendingChoiceSchema = Schema.Struct({
    chooserPlayerId: Schema.mutableKey(Schema.String),
    sourcePlayerId: Schema.mutableKey(Schema.String),
    card: Schema.mutableKey(flip7ActionCardTypeSchema),
    validTargetIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
});

const flip7ForcedDrawSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    remaining: Schema.mutableKey(Schema.Number),
    deferredActions: Schema.mutableKey(
        Schema.mutable(Schema.Array(flip7DeferredActionSchema)),
    ),
});

export const flip7ResultSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("error")),
        message: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("round_started")),
        roundNumber: Schema.mutableKey(Schema.Number),
        dealerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("player_hit")),
        playerId: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("player_stayed")),
        playerId: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("target_required")),
        chooserPlayerId: Schema.mutableKey(Schema.String),
        card: Schema.mutableKey(flip7ActionCardTypeSchema),
        validTargetIds: Schema.mutableKey(
            Schema.mutable(Schema.Array(Schema.String)),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("target_chosen")),
        chooserPlayerId: Schema.mutableKey(Schema.String),
        targetId: Schema.mutableKey(Schema.String),
        card: Schema.mutableKey(flip7ActionCardTypeSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("round_over")),
        roundNumber: Schema.mutableKey(Schema.Number),
        endReason: Schema.mutableKey(flip7RoundEndReasonSchema),
        flip7WinnerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("round_advanced")),
        roundNumber: Schema.mutableKey(Schema.Number),
        dealerId: Schema.optionalKey(Schema.mutableKey(Schema.NullOr(Schema.String))),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("game_over")),
        winners: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
        endedByHost: Schema.mutableKey(Schema.Boolean),
    }),
]);

export const flip7StateSchema = Schema.Struct({
    hostId: Schema.mutableKey(Schema.String),
    players: Schema.mutableKey(Schema.mutable(Schema.Array(flip7PlayerStateSchema))),
    phase: Schema.mutableKey(flip7PhaseSchema),
    roundNumber: Schema.mutableKey(Schema.Number),
    targetScore: Schema.mutableKey(Schema.Number),
    dealerIndex: Schema.mutableKey(Schema.Number),
    currentPlayerIndex: Schema.mutableKey(Schema.NullOr(Schema.Number)),
    deck: Schema.mutableKey(Schema.mutable(Schema.Array(flip7CardSchema))),
    discardPile: Schema.mutableKey(Schema.mutable(Schema.Array(flip7CardSchema))),
    initialDealOrder: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    initialDealCursor: Schema.mutableKey(Schema.Number),
    pendingChoice: Schema.mutableKey(Schema.NullOr(flip7PendingChoiceSchema)),
    forcedDraw: Schema.mutableKey(Schema.NullOr(flip7ForcedDrawSchema)),
    turnActionPlayerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    lastResult: Schema.mutableKey(Schema.NullOr(flip7ResultSchema)),
    lastRoundResult: Schema.mutableKey(Schema.NullOr(flip7RoundResultSchema)),
    winners: Schema.mutableKey(Schema.NullOr(Schema.mutable(Schema.Array(Schema.String)))),
    endedByHost: Schema.mutableKey(Schema.Boolean),
    shuffleMode: Schema.mutableKey(flip7ShuffleModeSchema),
});

const flip7CardViewSchema = Schema.Struct({
    kind: Schema.mutableKey(flip7CardViewKindSchema),
    label: Schema.mutableKey(Schema.String),
    value: Schema.mutableKey(Schema.NullOr(Schema.Number)),
});

const flip7PlayerInfoSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    totalScore: Schema.mutableKey(Schema.Number),
    status: Schema.mutableKey(flip7PlayerStatusSchema),
    roundScore: Schema.mutableKey(Schema.Number),
    uniqueNumberCount: Schema.mutableKey(Schema.Number),
    hasSecondChance: Schema.mutableKey(Schema.Boolean),
    cards: Schema.mutableKey(Schema.mutable(Schema.Array(flip7CardViewSchema))),
});

const flip7TargetChoiceViewSchema = Schema.Struct({
    chooserPlayerId: Schema.mutableKey(Schema.String),
    card: Schema.mutableKey(flip7ActionCardTypeSchema),
    validTargetIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
});

export const flip7PlayerViewSchema = Schema.Struct({
    myId: Schema.mutableKey(Schema.String),
    hostId: Schema.mutableKey(Schema.String),
    phase: Schema.mutableKey(flip7PhaseSchema),
    roundNumber: Schema.mutableKey(Schema.Number),
    targetScore: Schema.mutableKey(Schema.Number),
    dealerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    currentPlayerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    deckCount: Schema.mutableKey(Schema.Number),
    discardCount: Schema.mutableKey(Schema.Number),
    players: Schema.mutableKey(Schema.mutable(Schema.Array(flip7PlayerInfoSchema))),
    targetChoice: Schema.mutableKey(Schema.NullOr(flip7TargetChoiceViewSchema)),
    canHit: Schema.mutableKey(Schema.Boolean),
    canStay: Schema.mutableKey(Schema.Boolean),
    requiresMyTargetChoice: Schema.mutableKey(Schema.Boolean),
    validTargetIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    lastRoundResult: Schema.mutableKey(Schema.NullOr(flip7RoundResultSchema)),
    winners: Schema.mutableKey(Schema.NullOr(Schema.mutable(Schema.Array(Schema.String)))),
    endedByHost: Schema.mutableKey(Schema.Boolean),
});

export const flip7GameOverPayloadSchema = Schema.Struct({
    winners: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    endedByHost: Schema.mutableKey(Schema.Boolean),
});

export const flip7ServerMessageSchema = buildGameServerMessageSchema({
    prefix: "flip_7",
    playerViewSchema: flip7PlayerViewSchema,
    actionSchema: flip7ResultSchema,
    gameOverSchema: flip7GameOverPayloadSchema,
});

export type Flip7ActionCardType = SchemaType<typeof flip7ActionCardTypeSchema>;
export type Flip7BonusModifierValue = SchemaType<
    typeof flip7BonusModifierValueSchema
>;
export type Flip7Card = SchemaType<typeof flip7CardSchema>;
export type Flip7PlayerStatus = SchemaType<typeof flip7PlayerStatusSchema>;
export type Flip7Phase = SchemaType<typeof flip7PhaseSchema>;
export type Flip7RoundEndReason = SchemaType<typeof flip7RoundEndReasonSchema>;
export type Flip7ShuffleMode = SchemaType<typeof flip7ShuffleModeSchema>;
export type Flip7Player = SchemaType<typeof flip7PlayerStateSchema>;
export type Flip7RoundScore = SchemaType<typeof flip7RoundScoreSchema>;
export type Flip7RoundResult = SchemaType<typeof flip7RoundResultSchema>;
export type Flip7PendingChoice = SchemaType<typeof flip7PendingChoiceSchema>;
export type Flip7ForcedDraw = SchemaType<typeof flip7ForcedDrawSchema>;
export type Flip7State = SchemaType<typeof flip7StateSchema>;
export type Flip7CardView = SchemaType<typeof flip7CardViewSchema>;
export type Flip7PlayerInfo = SchemaType<typeof flip7PlayerInfoSchema>;
export type Flip7TargetChoiceView = SchemaType<typeof flip7TargetChoiceViewSchema>;
export type Flip7PlayerView = SchemaType<typeof flip7PlayerViewSchema>;
export type Flip7Result = SchemaType<typeof flip7ResultSchema>;
export type Flip7GameOverPayload = SchemaType<typeof flip7GameOverPayloadSchema>;
export type Flip7ServerMessage = SchemaType<typeof flip7ServerMessageSchema>;

export type Flip7SideMessage = Exclude<
    Flip7ServerMessage,
    { type: "flip_7:state" }
>;

export const decodeFlip7PlayerView = createPlayerViewDecoder(flip7PlayerViewSchema);
export const decodeFlip7SideMessage = createServerMessageDecoder(
    "flip_7:state",
    flip7ServerMessageSchema,
);
export const encodeFlip7ServerMessage = (message: Flip7ServerMessage) =>
    encodeGameServerMessage(flip7ServerMessageSchema, message);
