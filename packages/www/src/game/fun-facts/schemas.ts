import { Schema } from "effect";

import type { SchemaType } from "~/effect/schema-types";
import {
    buildGameServerMessageSchema,
    createPlayerViewDecoder,
    createServerMessageDecoder,
    encodeGameServerMessage,
} from "~/game/shared/game-wire";

export const funFactsPhases = [
    "waiting",
    "answering",
    "placing",
    "reveal",
    "game_over",
] as const;

const funFactsPhaseSchema = Schema.Literals(funFactsPhases);

const numericAnswersSchema = Schema.Record(Schema.String, Schema.Number);

const funFactsPlayerStateSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
});

const funFactsRoundResultSchema = Schema.Struct({
    question: Schema.mutableKey(Schema.String),
    placedOrder: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    answers: Schema.mutableKey(numericAnswersSchema),
    correctArrows: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    removedArrows: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    pointsEarned: Schema.mutableKey(Schema.Number),
});

export const funFactsStateSchema = Schema.Struct({
    players: Schema.mutableKey(
        Schema.mutable(Schema.Array(funFactsPlayerStateSchema)),
    ),
    hostId: Schema.mutableKey(Schema.String),
    phase: Schema.mutableKey(funFactsPhaseSchema),
    roundNumber: Schema.mutableKey(Schema.Number),
    totalRounds: Schema.mutableKey(Schema.Number),
    currentQuestion: Schema.mutableKey(Schema.NullOr(Schema.String)),
    questionIndex: Schema.mutableKey(Schema.Number),
    shuffledQuestions: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    answers: Schema.mutableKey(numericAnswersSchema),
    placingOrder: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    currentPlacerIndex: Schema.mutableKey(Schema.Number),
    placedArrows: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    teamScore: Schema.mutableKey(Schema.Number),
    roundScores: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.Number))),
    lastRoundResult: Schema.mutableKey(Schema.NullOr(funFactsRoundResultSchema)),
});

const funFactsPlayerInfoSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
});

const placedArrowViewSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    playerName: Schema.mutableKey(Schema.String),
    answer: Schema.mutableKey(Schema.NullOr(Schema.Number)),
});

export const funFactsPlayerViewSchema = Schema.Struct({
    myId: Schema.mutableKey(Schema.String),
    isHost: Schema.mutableKey(Schema.Boolean),
    phase: Schema.mutableKey(funFactsPhaseSchema),
    roundNumber: Schema.mutableKey(Schema.Number),
    totalRounds: Schema.mutableKey(Schema.Number),
    currentQuestion: Schema.mutableKey(Schema.NullOr(Schema.String)),
    players: Schema.mutableKey(Schema.mutable(Schema.Array(funFactsPlayerInfoSchema))),
    myAnswer: Schema.mutableKey(Schema.NullOr(Schema.Number)),
    hasAnswered: Schema.mutableKey(Schema.Boolean),
    answeredCount: Schema.mutableKey(Schema.Number),
    totalPlayers: Schema.mutableKey(Schema.Number),
    placingOrder: Schema.mutableKey(Schema.mutable(Schema.Array(funFactsPlayerInfoSchema))),
    currentPlacerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    isMyTurn: Schema.mutableKey(Schema.Boolean),
    placedArrows: Schema.mutableKey(Schema.mutable(Schema.Array(placedArrowViewSchema))),
    teamScore: Schema.mutableKey(Schema.Number),
    roundScores: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.Number))),
    lastRoundResult: Schema.mutableKey(Schema.NullOr(funFactsRoundResultSchema)),
    maxScore: Schema.mutableKey(Schema.Number),
});

export const funFactsResultSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("error")),
        message: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("question_started")),
        question: Schema.mutableKey(Schema.String),
        roundNumber: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("answer_submitted")),
        playerId: Schema.mutableKey(Schema.String),
        answeredCount: Schema.mutableKey(Schema.Number),
        totalPlayers: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("answers_closed")),
        placingOrder: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
        firstPlacerId: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("arrow_placed")),
        playerId: Schema.mutableKey(Schema.String),
        nextPlacerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
        placedCount: Schema.mutableKey(Schema.Number),
        totalPlacers: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("round_revealed")),
        result: Schema.mutableKey(funFactsRoundResultSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("round_advanced")),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("game_over")),
        teamScore: Schema.mutableKey(Schema.Number),
        maxScore: Schema.mutableKey(Schema.Number),
    }),
]);

export const funFactsGameOverPayloadSchema = Schema.Struct({
    teamScore: Schema.mutableKey(Schema.Number),
    maxScore: Schema.mutableKey(Schema.Number),
});

export const funFactsServerMessageSchema = buildGameServerMessageSchema({
    prefix: "fun_facts",
    playerViewSchema: funFactsPlayerViewSchema,
    actionSchema: funFactsResultSchema,
    gameOverSchema: funFactsGameOverPayloadSchema,
});

export type FunFactsPhase = SchemaType<typeof funFactsPhaseSchema>;
export type FunFactsPlayer = SchemaType<typeof funFactsPlayerStateSchema>;
export type FunFactsRoundResult = SchemaType<typeof funFactsRoundResultSchema>;
export type FunFactsState = SchemaType<typeof funFactsStateSchema>;
export type FunFactsPlayerInfo = SchemaType<typeof funFactsPlayerInfoSchema>;
export type PlacedArrowView = SchemaType<typeof placedArrowViewSchema>;
export type FunFactsPlayerView = SchemaType<typeof funFactsPlayerViewSchema>;
export type FunFactsResult = SchemaType<typeof funFactsResultSchema>;
export type FunFactsGameOverPayload = SchemaType<
    typeof funFactsGameOverPayloadSchema
>;
export type FunFactsServerMessage = SchemaType<typeof funFactsServerMessageSchema>;

export type FunFactsSideMessage = Exclude<
    FunFactsServerMessage,
    { type: "fun_facts:state" }
>;

export const decodeFunFactsPlayerView = createPlayerViewDecoder(
    funFactsPlayerViewSchema,
);
export const decodeFunFactsSideMessage = createServerMessageDecoder(
    "fun_facts:state",
    funFactsServerMessageSchema,
);
export const encodeFunFactsServerMessage = (message: FunFactsServerMessage) =>
    encodeGameServerMessage(funFactsServerMessageSchema, message);
