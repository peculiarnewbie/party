import { Schema } from "effect";

import type { YahtzeePlayerView } from "./views";

export const scoringCategories = [
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

export const yahtzeeModes = ["standard", "lying"] as const;
export const yahtzeePhases = [
    "pre_roll",
    "mid_turn",
    "awaiting_response",
    "game_over",
] as const;
export const lyingOutcomes = [
    "accepted",
    "truthful_challenge",
    "caught_lying",
] as const;

export const scoringCategorySchema = Schema.Literals(scoringCategories);
export const yahtzeeModeSchema = Schema.Literals(yahtzeeModes);
export const yahtzeePhaseSchema = Schema.Literals(yahtzeePhases);
export const lyingOutcomeSchema = Schema.Literals(lyingOutcomes);

const persistedDieSchema = Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(6),
);
const rolledDieSchema = Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(6),
);

export const diceSchema = Schema.mutable(
    Schema.Tuple([
        persistedDieSchema,
        persistedDieSchema,
        persistedDieSchema,
        persistedDieSchema,
        persistedDieSchema,
    ]),
);
export const rolledDiceSchema = Schema.mutable(
    Schema.Tuple([
        rolledDieSchema,
        rolledDieSchema,
        rolledDieSchema,
        rolledDieSchema,
        rolledDieSchema,
    ]),
);
export const heldDiceSchema = Schema.mutable(
    Schema.Tuple([
        Schema.Boolean,
        Schema.Boolean,
        Schema.Boolean,
        Schema.Boolean,
        Schema.Boolean,
    ]),
);

const partialScorecardSchema = Schema.Record(
    scoringCategorySchema,
    Schema.optionalKey(Schema.mutableKey(Schema.Number)),
);

export const lyingClaimSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    category: Schema.mutableKey(scoringCategorySchema),
    claimedDice: Schema.mutableKey(rolledDiceSchema),
    claimedPoints: Schema.mutableKey(Schema.Number),
});

export const lyingTurnRevealSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    category: Schema.mutableKey(scoringCategorySchema),
    actualDice: Schema.mutableKey(rolledDiceSchema),
    claimedDice: Schema.mutableKey(rolledDiceSchema),
    claimedPoints: Schema.mutableKey(Schema.Number),
    outcome: Schema.mutableKey(lyingOutcomeSchema),
    penaltyPlayerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    penaltyPoints: Schema.mutableKey(Schema.Number),
});

const yahtzeePlayerSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    scorecard: Schema.mutableKey(partialScorecardSchema),
    yahtzeeBonus: Schema.mutableKey(Schema.Number),
    penaltyPoints: Schema.mutableKey(Schema.Number),
});

export const yahtzeeStateSchema = Schema.Struct({
    mode: Schema.mutableKey(yahtzeeModeSchema),
    players: Schema.mutableKey(
        Schema.mutable(Schema.Array(yahtzeePlayerSchema)),
    ),
    currentPlayerIndex: Schema.mutableKey(Schema.Number),
    dice: Schema.mutableKey(diceSchema),
    held: Schema.mutableKey(heldDiceSchema),
    rollsLeft: Schema.mutableKey(Schema.Number),
    phase: Schema.mutableKey(yahtzeePhaseSchema),
    round: Schema.mutableKey(Schema.Number),
    winners: Schema.mutableKey(
        Schema.NullOr(Schema.mutable(Schema.Array(Schema.String))),
    ),
    pendingClaim: Schema.mutableKey(Schema.NullOr(lyingClaimSchema)),
    lastTurnReveal: Schema.mutableKey(Schema.NullOr(lyingTurnRevealSchema)),
});

const yahtzeePlayerInfoSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    scorecard: Schema.mutableKey(partialScorecardSchema),
    yahtzeeBonus: Schema.mutableKey(Schema.Number),
    penaltyPoints: Schema.mutableKey(Schema.Number),
    upperTotal: Schema.mutableKey(Schema.Number),
    upperBonus: Schema.mutableKey(Schema.Number),
    totalScore: Schema.mutableKey(Schema.Number),
});

export const yahtzeePlayerViewSchema = Schema.Struct({
    mode: Schema.mutableKey(yahtzeeModeSchema),
    myId: Schema.mutableKey(Schema.String),
    phase: Schema.mutableKey(yahtzeePhaseSchema),
    round: Schema.mutableKey(Schema.Number),
    dice: Schema.mutableKey(diceSchema),
    held: Schema.mutableKey(heldDiceSchema),
    rollsLeft: Schema.mutableKey(Schema.Number),
    currentPlayerId: Schema.mutableKey(Schema.String),
    isMyTurn: Schema.mutableKey(Schema.Boolean),
    players: Schema.mutableKey(
        Schema.mutable(Schema.Array(yahtzeePlayerInfoSchema)),
    ),
    potentialScores: Schema.mutableKey(
        Schema.NullOr(partialScorecardSchema),
    ),
    suggestedCategories: Schema.mutableKey(
        Schema.mutable(Schema.Array(scoringCategorySchema)),
    ),
    canRoll: Schema.mutableKey(Schema.Boolean),
    canScore: Schema.mutableKey(Schema.Boolean),
    canClaim: Schema.mutableKey(Schema.Boolean),
    canAcceptClaim: Schema.mutableKey(Schema.Boolean),
    canChallengeClaim: Schema.mutableKey(Schema.Boolean),
    pendingClaim: Schema.mutableKey(Schema.NullOr(lyingClaimSchema)),
    lastTurnReveal: Schema.mutableKey(Schema.NullOr(lyingTurnRevealSchema)),
    winners: Schema.mutableKey(
        Schema.NullOr(Schema.mutable(Schema.Array(Schema.String))),
    ),
});

export const yahtzeeErrorPayloadSchema = Schema.Struct({
    message: Schema.mutableKey(Schema.String),
});

const finalScoreSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    playerName: Schema.mutableKey(Schema.String),
    total: Schema.mutableKey(Schema.Number),
});

export const yahtzeeGameOverPayloadSchema = Schema.Struct({
    winners: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    finalScores: Schema.mutableKey(
        Schema.mutable(Schema.Array(finalScoreSchema)),
    ),
});

export const yahtzeeActionPayloadSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("rolled")),
        playerId: Schema.mutableKey(Schema.String),
        dice: Schema.mutableKey(rolledDiceSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("held_toggled")),
        playerId: Schema.mutableKey(Schema.String),
        diceIndex: Schema.mutableKey(Schema.Number),
        held: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("scored")),
        playerId: Schema.mutableKey(Schema.String),
        category: Schema.mutableKey(scoringCategorySchema),
        points: Schema.mutableKey(Schema.Number),
        yahtzeeBonus: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("claim_submitted")),
        playerId: Schema.mutableKey(Schema.String),
        category: Schema.mutableKey(scoringCategorySchema),
        claimedDice: Schema.mutableKey(rolledDiceSchema),
        claimedPoints: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("claim_resolved")),
        playerId: Schema.mutableKey(Schema.String),
        category: Schema.mutableKey(scoringCategorySchema),
        points: Schema.mutableKey(Schema.Number),
        yahtzeeBonus: Schema.mutableKey(Schema.Boolean),
        actualDice: Schema.mutableKey(rolledDiceSchema),
        claimedDice: Schema.mutableKey(rolledDiceSchema),
        claimedPoints: Schema.mutableKey(Schema.Number),
        outcome: Schema.mutableKey(lyingOutcomeSchema),
        penaltyPlayerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
        penaltyPoints: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("game_over")),
        winners: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
        finalScores: Schema.mutableKey(
            Schema.mutable(Schema.Array(finalScoreSchema)),
        ),
    }),
]);

export function decodeYahtzeePlayerView(raw: unknown): YahtzeePlayerView | null {
    try {
        return Schema.decodeUnknownSync(yahtzeePlayerViewSchema)(
            raw,
        ) as YahtzeePlayerView;
    } catch {
        return null;
    }
}
