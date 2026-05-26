import { Schema } from "effect";

import type { SchemaType } from "~/effect/schema-types";
import {
    buildGameServerMessageSchema,
    createPlayerViewDecoder,
    createServerMessageDecoder,
    encodeGameServerMessage,
} from "~/game/shared/game-wire";

export const SPICE_TYPES = ["chili", "wasabi", "pepper"] as const;
export const CHALLENGE_TRAITS = ["number", "spice"] as const;
export const spicyPhases = ["playing", "last_card_window", "game_over"] as const;
export const spicyEndReasons = [
    "two_trophies",
    "all_trophies",
    "worlds_end",
    "host_ended",
    "not_enough_players",
] as const;
export const spicyDrawContexts = [
    "pass",
    "invalid_declaration",
    "challenge_penalty",
    "trophy_refill",
] as const;

const spiceTypeSchema = Schema.Literals(SPICE_TYPES);
const challengeTraitSchema = Schema.Literals(CHALLENGE_TRAITS);
const spicyPhaseSchema = Schema.Literals(spicyPhases);
const spicyEndReasonSchema = Schema.Literals(spicyEndReasons);
const spicyDrawContextSchema = Schema.Literals(spicyDrawContexts);

const spicyCardNumberSchema = Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(10),
);

const standardSpicyCardSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    kind: Schema.mutableKey(Schema.Literal("standard")),
    number: Schema.mutableKey(spicyCardNumberSchema),
    spice: Schema.mutableKey(spiceTypeSchema),
});

const wildSpiceCardSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    kind: Schema.mutableKey(Schema.Literal("wild_spice")),
});

const wildNumberCardSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    kind: Schema.mutableKey(Schema.Literal("wild_number")),
});

export const spicyCardSchema = Schema.Union([
    standardSpicyCardSchema,
    wildSpiceCardSchema,
    wildNumberCardSchema,
]);

export const worldsEndCardSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.Literal("worlds_end")),
    kind: Schema.mutableKey(Schema.Literal("worlds_end")),
});

export const drawPileCardSchema = Schema.Union([
    spicyCardSchema,
    worldsEndCardSchema,
]);

const spicyStackEntrySchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    card: Schema.mutableKey(spicyCardSchema),
    declaredNumber: Schema.mutableKey(spicyCardNumberSchema),
    declaredSpice: Schema.mutableKey(spiceTypeSchema),
});

const spicyFinalScoreSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    points: Schema.mutableKey(Schema.Number),
    wonCardCount: Schema.mutableKey(Schema.Number),
    trophies: Schema.mutableKey(Schema.Number),
    handCount: Schema.mutableKey(Schema.Number),
});

export const spicyPlayerStateSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    hand: Schema.mutableKey(Schema.mutable(Schema.Array(spicyCardSchema))),
    wonCardCount: Schema.mutableKey(Schema.Number),
    trophies: Schema.mutableKey(Schema.Number),
});

export const spicyStateSchema = Schema.Struct({
    players: Schema.mutableKey(
        Schema.mutable(Schema.Array(spicyPlayerStateSchema)),
    ),
    phase: Schema.mutableKey(spicyPhaseSchema),
    currentPlayerId: Schema.mutableKey(Schema.String),
    stack: Schema.mutableKey(Schema.mutable(Schema.Array(spicyStackEntrySchema))),
    drawPile: Schema.mutableKey(Schema.mutable(Schema.Array(drawPileCardSchema))),
    pendingLastCardPlayerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    safePassPlayerIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    trophiesRemaining: Schema.mutableKey(Schema.Number),
    winners: Schema.mutableKey(Schema.NullOr(Schema.mutable(Schema.Array(Schema.String)))),
    endReason: Schema.mutableKey(Schema.NullOr(spicyEndReasonSchema)),
    finalScores: Schema.mutableKey(
        Schema.NullOr(Schema.mutable(Schema.Array(spicyFinalScoreSchema))),
    ),
});

const spicyPlayerInfoSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    handCount: Schema.mutableKey(Schema.Number),
    wonCardCount: Schema.mutableKey(Schema.Number),
    trophies: Schema.mutableKey(Schema.Number),
    isCurrentPlayer: Schema.mutableKey(Schema.Boolean),
    isPendingLastCard: Schema.mutableKey(Schema.Boolean),
});

const spicyStackTopViewSchema = Schema.Struct({
    ownerId: Schema.mutableKey(Schema.String),
    declaredNumber: Schema.mutableKey(spicyCardNumberSchema),
    declaredSpice: Schema.mutableKey(spiceTypeSchema),
    stackSize: Schema.mutableKey(Schema.Number),
});

export const spicyGameOverPayloadSchema = Schema.Struct({
    type: Schema.mutableKey(Schema.Literal("game_over")),
    winners: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    reason: Schema.mutableKey(spicyEndReasonSchema),
    finalScores: Schema.mutableKey(
        Schema.mutable(Schema.Array(spicyFinalScoreSchema)),
    ),
});

export const spicyResultSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("card_played")),
        playerId: Schema.mutableKey(Schema.String),
        declaredNumber: Schema.mutableKey(spicyCardNumberSchema),
        declaredSpice: Schema.mutableKey(spiceTypeSchema),
        stackSize: Schema.mutableKey(Schema.Number),
        handCount: Schema.mutableKey(Schema.Number),
        lastCard: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("player_passed")),
        playerId: Schema.mutableKey(Schema.String),
        drewCount: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("invalid_declaration")),
        playerId: Schema.mutableKey(Schema.String),
        declaredNumber: Schema.mutableKey(spicyCardNumberSchema),
        declaredSpice: Schema.mutableKey(spiceTypeSchema),
        drewCount: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("challenge_resolved")),
        challengerId: Schema.mutableKey(Schema.String),
        challengedPlayerId: Schema.mutableKey(Schema.String),
        challengedTrait: Schema.mutableKey(challengeTraitSchema),
        declaredNumber: Schema.mutableKey(spicyCardNumberSchema),
        declaredSpice: Schema.mutableKey(spiceTypeSchema),
        actualCard: Schema.mutableKey(spicyCardSchema),
        challengerWon: Schema.mutableKey(Schema.Boolean),
        winnerId: Schema.mutableKey(Schema.String),
        loserId: Schema.mutableKey(Schema.String),
        collectedCardCount: Schema.mutableKey(Schema.Number),
        loserDrewCount: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("last_card_confirmed")),
        playerId: Schema.mutableKey(Schema.String),
        pendingPlayerId: Schema.mutableKey(Schema.String),
        confirmations: Schema.mutableKey(Schema.Number),
        required: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("trophy_awarded")),
        playerId: Schema.mutableKey(Schema.String),
        trophies: Schema.mutableKey(Schema.Number),
        trophiesRemaining: Schema.mutableKey(Schema.Number),
        drewCount: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("worlds_end_revealed")),
        triggeringPlayerId: Schema.mutableKey(Schema.String),
        during: Schema.mutableKey(spicyDrawContextSchema),
    }),
    spicyGameOverPayloadSchema,
]);

export const spicyPlayerViewSchema = Schema.Struct({
    myId: Schema.mutableKey(Schema.String),
    phase: Schema.mutableKey(spicyPhaseSchema),
    currentPlayerId: Schema.mutableKey(Schema.String),
    pendingLastCardPlayerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    safePassPlayerIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    trophiesRemaining: Schema.mutableKey(Schema.Number),
    players: Schema.mutableKey(Schema.mutable(Schema.Array(spicyPlayerInfoSchema))),
    myHand: Schema.mutableKey(Schema.mutable(Schema.Array(spicyCardSchema))),
    stackTop: Schema.mutableKey(Schema.NullOr(spicyStackTopViewSchema)),
    isMyTurn: Schema.mutableKey(Schema.Boolean),
    canPlayCard: Schema.mutableKey(Schema.Boolean),
    canPass: Schema.mutableKey(Schema.Boolean),
    canChallenge: Schema.mutableKey(Schema.Boolean),
    canConfirmLastCard: Schema.mutableKey(Schema.Boolean),
    allowedDeclarationNumbers: Schema.mutableKey(
        Schema.mutable(Schema.Array(spicyCardNumberSchema)),
    ),
    allowedDeclarationSpices: Schema.mutableKey(
        Schema.mutable(Schema.Array(spiceTypeSchema)),
    ),
    winners: Schema.mutableKey(Schema.NullOr(Schema.mutable(Schema.Array(Schema.String)))),
    endReason: Schema.mutableKey(Schema.NullOr(spicyEndReasonSchema)),
    finalScores: Schema.mutableKey(
        Schema.NullOr(Schema.mutable(Schema.Array(spicyFinalScoreSchema))),
    ),
    lastPublicResult: Schema.mutableKey(Schema.NullOr(spicyResultSchema)),
});

export const spicyServerMessageSchema = buildGameServerMessageSchema({
    prefix: "spicy",
    playerViewSchema: spicyPlayerViewSchema,
    actionSchema: spicyResultSchema,
    gameOverSchema: spicyGameOverPayloadSchema,
});

export type SpiceType = SchemaType<typeof spiceTypeSchema>;
export type ChallengeTrait = SchemaType<typeof challengeTraitSchema>;
export type SpicyPhase = SchemaType<typeof spicyPhaseSchema>;
export type SpicyEndReason = SchemaType<typeof spicyEndReasonSchema>;
export type DrawContext = SchemaType<typeof spicyDrawContextSchema>;
export type StandardSpicyCard = SchemaType<typeof standardSpicyCardSchema>;
export type WildSpiceCard = SchemaType<typeof wildSpiceCardSchema>;
export type WildNumberCard = SchemaType<typeof wildNumberCardSchema>;
export type SpicyCard = SchemaType<typeof spicyCardSchema>;
export type WorldsEndCard = SchemaType<typeof worldsEndCardSchema>;
export type DrawPileCard = SchemaType<typeof drawPileCardSchema>;
export type SpicyStackEntry = SchemaType<typeof spicyStackEntrySchema>;
export type SpicyFinalScore = SchemaType<typeof spicyFinalScoreSchema>;
export type SpicyPlayer = SchemaType<typeof spicyPlayerStateSchema>;
export type SpicyState = SchemaType<typeof spicyStateSchema>;
export type SpicyPlayerInfo = SchemaType<typeof spicyPlayerInfoSchema>;
export type SpicyStackTopView = SchemaType<typeof spicyStackTopViewSchema>;
export type SpicyPlayerView = SchemaType<typeof spicyPlayerViewSchema>;
export type SpicyResult = SchemaType<typeof spicyResultSchema>;
export type SpicyGameOverPayload = SchemaType<typeof spicyGameOverPayloadSchema>;
export type SpicyServerMessage = SchemaType<typeof spicyServerMessageSchema>;
export type SpicySideMessage = Exclude<
    SpicyServerMessage,
    { type: "spicy:state" }
>;

export const decodeSpicyPlayerView = createPlayerViewDecoder(spicyPlayerViewSchema);
export const decodeSpicySideMessage = createServerMessageDecoder(
    "spicy:state",
    spicyServerMessageSchema,
);
export const encodeSpicyServerMessage = (message: SpicyServerMessage) =>
    encodeGameServerMessage(spicyServerMessageSchema, message);
