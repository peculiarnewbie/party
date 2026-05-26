import { Schema } from "effect";

import type { SchemaType } from "~/effect/schema-types";
import {
    buildGameServerMessageSchema,
    createPlayerViewDecoder,
    createServerMessageDecoder,
    encodeGameServerMessage,
} from "~/game/shared/game-wire";

export const skullDiscTypes = ["flower", "skull"] as const;
export const skullPhases = [
    "turn_prep",
    "building",
    "auction",
    "attempt",
    "penalty",
    "next_starter",
    "game_over",
] as const;
export const skullGameOverReasons = [
    "two_challenges",
    "last_player_standing",
    "host_ended",
    "not_enough_players",
] as const;

const discTypeSchema = Schema.Literals(skullDiscTypes);
const skullPhaseSchema = Schema.Literals(skullPhases);
const skullGameOverReasonSchema = Schema.Literals(skullGameOverReasons);

const skullRevealStepSchema = Schema.Struct({
    ownerId: Schema.mutableKey(Schema.String),
    disc: Schema.mutableKey(discTypeSchema),
    automatic: Schema.mutableKey(Schema.Boolean),
});

const skullAttemptStateSchema = Schema.Struct({
    challengerId: Schema.mutableKey(Schema.String),
    target: Schema.mutableKey(Schema.Number),
    revealedCount: Schema.mutableKey(Schema.Number),
    autoRevealDone: Schema.mutableKey(Schema.Boolean),
    revealedSteps: Schema.mutableKey(
        Schema.mutable(Schema.Array(skullRevealStepSchema)),
    ),
});

export const skullPlayerStateSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    hand: Schema.mutableKey(Schema.mutable(Schema.Array(discTypeSchema))),
    mat: Schema.mutableKey(Schema.mutable(Schema.Array(discTypeSchema))),
    successfulChallenges: Schema.mutableKey(Schema.Number),
    eliminated: Schema.mutableKey(Schema.Boolean),
});

export const skullStateSchema = Schema.Struct({
    players: Schema.mutableKey(
        Schema.mutable(Schema.Array(skullPlayerStateSchema)),
    ),
    phase: Schema.mutableKey(skullPhaseSchema),
    roundNumber: Schema.mutableKey(Schema.Number),
    starterPlayerId: Schema.mutableKey(Schema.String),
    currentPlayerId: Schema.mutableKey(Schema.String),
    playersWhoPlacedOpeningDisc: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    highestBid: Schema.mutableKey(Schema.NullOr(Schema.Number)),
    highestBidderId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    passedBidderIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    attempt: Schema.mutableKey(Schema.NullOr(skullAttemptStateSchema)),
    penaltyPlayerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    penaltyChooserId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    pendingNextStarterChooserId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    winnerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
});

const skullPlayerInfoSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    handCount: Schema.mutableKey(Schema.Number),
    matCount: Schema.mutableKey(Schema.Number),
    faceDownCount: Schema.mutableKey(Schema.Number),
    successfulChallenges: Schema.mutableKey(Schema.Number),
    eliminated: Schema.mutableKey(Schema.Boolean),
    isCurrentPlayer: Schema.mutableKey(Schema.Boolean),
    isStarter: Schema.mutableKey(Schema.Boolean),
    isHighestBidder: Schema.mutableKey(Schema.Boolean),
    hasPassed: Schema.mutableKey(Schema.Boolean),
    revealedDiscs: Schema.mutableKey(Schema.mutable(Schema.Array(discTypeSchema))),
});

const skullAttemptViewSchema = Schema.Struct({
    challengerId: Schema.mutableKey(Schema.String),
    target: Schema.mutableKey(Schema.Number),
    revealedCount: Schema.mutableKey(Schema.Number),
    autoRevealDone: Schema.mutableKey(Schema.Boolean),
    revealedSteps: Schema.mutableKey(
        Schema.mutable(
            Schema.Array(
                Schema.Struct({
                    ownerId: Schema.mutableKey(Schema.String),
                    disc: Schema.mutableKey(discTypeSchema),
                    automatic: Schema.mutableKey(Schema.Boolean),
                }),
            ),
        ),
    ),
});

export const skullGameOverPayloadSchema = Schema.Struct({
    type: Schema.mutableKey(Schema.Literal("game_over")),
    winnerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    reason: Schema.mutableKey(skullGameOverReasonSchema),
});

export const skullResultSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("round_started")),
        roundNumber: Schema.mutableKey(Schema.Number),
        starterPlayerId: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("disc_played")),
        playerId: Schema.mutableKey(Schema.String),
        matCount: Schema.mutableKey(Schema.Number),
        handCount: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("challenge_started")),
        playerId: Schema.mutableKey(Schema.String),
        bid: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("bid_raised")),
        playerId: Schema.mutableKey(Schema.String),
        bid: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("bid_passed")),
        playerId: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("attempt_started")),
        challengerId: Schema.mutableKey(Schema.String),
        target: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("disc_revealed")),
        ownerId: Schema.mutableKey(Schema.String),
        disc: Schema.mutableKey(discTypeSchema),
        revealedCount: Schema.mutableKey(Schema.Number),
        target: Schema.mutableKey(Schema.Number),
        automatic: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("attempt_succeeded")),
        challengerId: Schema.mutableKey(Schema.String),
        successfulChallenges: Schema.mutableKey(Schema.Number),
        target: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("attempt_failed")),
        challengerId: Schema.mutableKey(Schema.String),
        ownerId: Schema.mutableKey(Schema.String),
        target: Schema.mutableKey(Schema.Number),
        revealedCount: Schema.mutableKey(Schema.Number),
        ownSkull: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("discard_required")),
        playerId: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("disc_lost")),
        playerId: Schema.mutableKey(Schema.String),
        remainingHandCount: Schema.mutableKey(Schema.Number),
        eliminated: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("next_starter_required")),
        chooserId: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("next_starter_chosen")),
        chooserId: Schema.mutableKey(Schema.String),
        starterPlayerId: Schema.mutableKey(Schema.String),
    }),
    skullGameOverPayloadSchema,
]);

export const skullPlayerViewSchema = Schema.Struct({
    myId: Schema.mutableKey(Schema.String),
    phase: Schema.mutableKey(skullPhaseSchema),
    roundNumber: Schema.mutableKey(Schema.Number),
    currentPlayerId: Schema.mutableKey(Schema.String),
    starterPlayerId: Schema.mutableKey(Schema.String),
    highestBid: Schema.mutableKey(Schema.NullOr(Schema.Number)),
    highestBidderId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    passedBidderIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    penaltyPlayerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    penaltyChooserId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    penaltyTargetHandCount: Schema.mutableKey(Schema.Number),
    pendingNextStarterChooserId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    winnerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    players: Schema.mutableKey(Schema.mutable(Schema.Array(skullPlayerInfoSchema))),
    myHand: Schema.mutableKey(Schema.mutable(Schema.Array(discTypeSchema))),
    myMat: Schema.mutableKey(Schema.mutable(Schema.Array(discTypeSchema))),
    isMyTurn: Schema.mutableKey(Schema.Boolean),
    canPlayDisc: Schema.mutableKey(Schema.Boolean),
    canStartChallenge: Schema.mutableKey(Schema.Boolean),
    canRaiseBid: Schema.mutableKey(Schema.Boolean),
    canPassBid: Schema.mutableKey(Schema.Boolean),
    minBid: Schema.mutableKey(Schema.Number),
    maxBid: Schema.mutableKey(Schema.Number),
    attempt: Schema.mutableKey(Schema.NullOr(skullAttemptViewSchema)),
    selectableFlipOwnerIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    needsDiscardChoice: Schema.mutableKey(Schema.Boolean),
    discardableDiscIndices: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.Number)),
    ),
    canChooseNextStarter: Schema.mutableKey(Schema.Boolean),
    nextStarterOptions: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    lastPublicResult: Schema.mutableKey(Schema.NullOr(skullResultSchema)),
});

export const skullServerMessageSchema = buildGameServerMessageSchema({
    prefix: "skull",
    playerViewSchema: skullPlayerViewSchema,
    actionSchema: skullResultSchema,
    gameOverSchema: skullGameOverPayloadSchema,
});

export type DiscType = SchemaType<typeof discTypeSchema>;
export type SkullPhase = SchemaType<typeof skullPhaseSchema>;
export type SkullGameOverReason = SchemaType<typeof skullGameOverReasonSchema>;
export type SkullRevealStep = SchemaType<typeof skullRevealStepSchema>;
export type SkullAttemptState = SchemaType<typeof skullAttemptStateSchema>;
export type SkullPlayer = SchemaType<typeof skullPlayerStateSchema>;
export type SkullState = SchemaType<typeof skullStateSchema>;
export type SkullPlayerInfo = SchemaType<typeof skullPlayerInfoSchema>;
export type SkullAttemptView = SchemaType<typeof skullAttemptViewSchema>;
export type SkullPlayerView = SchemaType<typeof skullPlayerViewSchema>;
export type SkullResult = SchemaType<typeof skullResultSchema>;
export type SkullGameOverPayload = SchemaType<typeof skullGameOverPayloadSchema>;
export type SkullServerMessage = SchemaType<typeof skullServerMessageSchema>;
export type SkullSideMessage = Exclude<
    SkullServerMessage,
    { type: "skull:state" }
>;

export const decodeSkullPlayerView = createPlayerViewDecoder(skullPlayerViewSchema);
export const decodeSkullSideMessage = createServerMessageDecoder(
    "skull:state",
    skullServerMessageSchema,
);
export const encodeSkullServerMessage = (message: SkullServerMessage) =>
    encodeGameServerMessage(skullServerMessageSchema, message);
