import { Schema } from "effect";

import type { SchemaType } from "~/effect/schema-types";
import {
    buildGameServerMessageSchema,
    createPlayerViewDecoder,
    createServerMessageDecoder,
    encodeGameServerMessage,
} from "~/game/shared/game-wire";
import { shortTextSchema } from "~/game/shared/wire-schemas";

export const herdPhases = [
    "waiting",
    "answering",
    "reveal",
    "scored",
    "game_over",
] as const;

const herdPhaseSchema = Schema.Literals(herdPhases);

const stringAnswersSchema = Schema.Record(Schema.String, Schema.String);

const herdPlayerStateSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    score: Schema.mutableKey(Schema.Number),
    hasPinkCow: Schema.mutableKey(Schema.Boolean),
});

const answerGroupSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    canonicalAnswer: Schema.mutableKey(Schema.String),
    playerIds: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    originalAnswers: Schema.mutableKey(stringAnswersSchema),
});

const roundResultSchema = Schema.Struct({
    question: Schema.mutableKey(Schema.String),
    groups: Schema.mutableKey(Schema.mutable(Schema.Array(answerGroupSchema))),
    majorityGroupId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    majorityCount: Schema.mutableKey(Schema.Number),
    scoringPlayerIds: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    pinkCowPlayerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    pinkCowPreviousHolder: Schema.mutableKey(Schema.NullOr(Schema.String)),
});

export const herdStateSchema = Schema.Struct({
    players: Schema.mutableKey(Schema.mutable(Schema.Array(herdPlayerStateSchema))),
    hostId: Schema.mutableKey(Schema.String),
    phase: Schema.mutableKey(herdPhaseSchema),
    roundNumber: Schema.mutableKey(Schema.Number),
    currentQuestion: Schema.mutableKey(Schema.NullOr(Schema.String)),
    questionIndex: Schema.mutableKey(Schema.Number),
    shuffledQuestions: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    answers: Schema.mutableKey(stringAnswersSchema),
    answerGroups: Schema.mutableKey(Schema.mutable(Schema.Array(answerGroupSchema))),
    nextGroupId: Schema.mutableKey(Schema.Number),
    lastRoundResult: Schema.mutableKey(Schema.NullOr(roundResultSchema)),
    pinkCowEnabled: Schema.mutableKey(Schema.Boolean),
    pinkCowHolder: Schema.mutableKey(Schema.NullOr(Schema.String)),
    winnerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    winScore: Schema.mutableKey(Schema.Number),
});

const herdPlayerInfoSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    score: Schema.mutableKey(Schema.Number),
    hasPinkCow: Schema.mutableKey(Schema.Boolean),
});

const answerGroupViewSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    canonicalAnswer: Schema.mutableKey(Schema.String),
    count: Schema.mutableKey(Schema.Number),
    playerNames: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    playerIds: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
});

export const herdPlayerViewSchema = Schema.Struct({
    myId: Schema.mutableKey(Schema.String),
    isHost: Schema.mutableKey(Schema.Boolean),
    phase: Schema.mutableKey(herdPhaseSchema),
    roundNumber: Schema.mutableKey(Schema.Number),
    currentQuestion: Schema.mutableKey(Schema.NullOr(Schema.String)),
    players: Schema.mutableKey(Schema.mutable(Schema.Array(herdPlayerInfoSchema))),
    pinkCowEnabled: Schema.mutableKey(Schema.Boolean),
    pinkCowHolderId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    winnerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    winScore: Schema.mutableKey(Schema.Number),
    myAnswer: Schema.mutableKey(Schema.NullOr(shortTextSchema)),
    hasAnswered: Schema.mutableKey(Schema.Boolean),
    answeredCount: Schema.mutableKey(Schema.Number),
    totalPlayers: Schema.mutableKey(Schema.Number),
    answerGroups: Schema.mutableKey(Schema.mutable(Schema.Array(answerGroupViewSchema))),
    lastRoundResult: Schema.mutableKey(Schema.NullOr(roundResultSchema)),
    leaderboard: Schema.mutableKey(Schema.mutable(Schema.Array(herdPlayerInfoSchema))),
});

export const herdResultSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("error")),
        message: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("pink_cow_toggled")),
        enabled: Schema.mutableKey(Schema.Boolean),
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
        groups: Schema.mutableKey(Schema.mutable(Schema.Array(answerGroupSchema))),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("groups_merged")),
        groups: Schema.mutableKey(Schema.mutable(Schema.Array(answerGroupSchema))),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("scoring_confirmed")),
        result: Schema.mutableKey(roundResultSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("round_advanced")),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("game_over")),
        winnerId: Schema.mutableKey(Schema.String),
    }),
]);

export const herdGameOverPayloadSchema = Schema.Struct({
    winnerId: Schema.mutableKey(Schema.String),
});

export const herdServerMessageSchema = buildGameServerMessageSchema({
    prefix: "herd",
    playerViewSchema: herdPlayerViewSchema,
    actionSchema: herdResultSchema,
    gameOverSchema: herdGameOverPayloadSchema,
});

export type HerdPhase = SchemaType<typeof herdPhaseSchema>;
export type HerdPlayer = SchemaType<typeof herdPlayerStateSchema>;
export type AnswerGroup = SchemaType<typeof answerGroupSchema>;
export type RoundResult = SchemaType<typeof roundResultSchema>;
export type HerdState = SchemaType<typeof herdStateSchema>;
export type HerdPlayerInfo = SchemaType<typeof herdPlayerInfoSchema>;
export type AnswerGroupView = SchemaType<typeof answerGroupViewSchema>;
export type HerdPlayerView = SchemaType<typeof herdPlayerViewSchema>;
export type HerdResult = SchemaType<typeof herdResultSchema>;
export type HerdGameOverPayload = SchemaType<typeof herdGameOverPayloadSchema>;
export type HerdServerMessage = SchemaType<typeof herdServerMessageSchema>;

export type HerdSideMessage = Exclude<
    HerdServerMessage,
    { type: "herd:state" }
>;

export const decodeHerdPlayerView = createPlayerViewDecoder(herdPlayerViewSchema);
export const decodeHerdSideMessage = createServerMessageDecoder(
    "herd:state",
    herdServerMessageSchema,
);
export const encodeHerdServerMessage = (message: HerdServerMessage) =>
    encodeGameServerMessage(herdServerMessageSchema, message);
