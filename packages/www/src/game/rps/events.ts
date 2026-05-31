import { Schema } from "effect";

import type { SchemaType } from "~/effect/schema-types";

import { rpsBestOfSchema, rpsChoiceSchema } from "./constants";

const rpsBestOfChangedEventSchema = Schema.Struct({
    type: Schema.Literal("best_of_changed"),
    bestOf: rpsBestOfSchema,
});

const rpsThrowRegisteredEventSchema = Schema.Struct({
    type: Schema.Literal("throw_registered"),
    playerId: Schema.String,
    matchIndex: Schema.Number,
});

const rpsThrowRevealedEventSchema = Schema.Struct({
    type: Schema.Literal("throw_revealed"),
    matchIndex: Schema.Number,
    player1Choice: rpsChoiceSchema,
    player2Choice: rpsChoiceSchema,
    winnerId: Schema.NullOr(Schema.String),
});

const rpsMatchCompletedEventSchema = Schema.Struct({
    type: Schema.Literal("match_completed"),
    matchIndex: Schema.Number,
    winnerId: Schema.String,
});

const rpsRoundAdvancedEventSchema = Schema.Struct({
    type: Schema.Literal("round_advanced"),
    roundNumber: Schema.Number,
});

const rpsTournamentOverEventSchema = Schema.Struct({
    type: Schema.Literal("tournament_over"),
    winnerId: Schema.NullOr(Schema.String),
});

export const rpsEventSchema = Schema.Union([
    rpsBestOfChangedEventSchema,
    rpsThrowRegisteredEventSchema,
    rpsThrowRevealedEventSchema,
    rpsMatchCompletedEventSchema,
    rpsRoundAdvancedEventSchema,
    rpsTournamentOverEventSchema,
]);

export type RpsEvent = SchemaType<typeof rpsEventSchema>;
export type RpsBestOfChangedEvent = SchemaType<typeof rpsBestOfChangedEventSchema>;
export type RpsThrowRegisteredEvent = SchemaType<typeof rpsThrowRegisteredEventSchema>;
export type RpsThrowRevealedEvent = SchemaType<typeof rpsThrowRevealedEventSchema>;
export type RpsMatchCompletedEvent = SchemaType<typeof rpsMatchCompletedEventSchema>;
export type RpsRoundAdvancedEvent = SchemaType<typeof rpsRoundAdvancedEventSchema>;
export type RpsTournamentOverEvent = SchemaType<typeof rpsTournamentOverEventSchema>;

const rpsHiddenDataSchema = Schema.Struct({
    type: Schema.Literal("throw_choice"),
    choice: rpsChoiceSchema,
});

export type RpsHiddenData = SchemaType<typeof rpsHiddenDataSchema>;
