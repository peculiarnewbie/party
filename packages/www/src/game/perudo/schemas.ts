import { Schema } from "effect";

import type { SchemaType } from "~/effect/schema-types";
import {
    buildGameServerMessageSchema,
    createPlayerViewDecoder,
    createServerMessageDecoder,
    encodeGameServerMessage,
} from "~/game/shared/game-wire";
import { positiveIntSchema } from "~/game/shared/wire-schemas";

export const perudoFaceValues = [1, 2, 3, 4, 5, 6] as const;
export const perudoPhases = [
    "round_start",
    "bidding",
    "revealing",
    "game_over",
] as const;

const faceValueSchema = Schema.Literals(perudoFaceValues);
const perudoPhaseSchema = Schema.Literals(perudoPhases);

const bidSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    quantity: Schema.mutableKey(positiveIntSchema),
    faceValue: Schema.mutableKey(faceValueSchema),
});

const challengeResultSchema = Schema.Struct({
    challengerId: Schema.mutableKey(Schema.String),
    bidderId: Schema.mutableKey(Schema.String),
    bid: Schema.mutableKey(bidSchema),
    wasCorrect: Schema.mutableKey(Schema.Boolean),
    actualCount: Schema.mutableKey(Schema.Number),
    loserId: Schema.mutableKey(Schema.String),
    loserNewCount: Schema.mutableKey(Schema.Number),
});

const perudoPlayerStateSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    dice: Schema.mutableKey(Schema.mutable(Schema.Array(faceValueSchema))),
    eliminated: Schema.mutableKey(Schema.Boolean),
});

export const perudoStateSchema = Schema.Struct({
    players: Schema.mutableKey(
        Schema.mutable(Schema.Array(perudoPlayerStateSchema)),
    ),
    currentPlayerIndex: Schema.mutableKey(Schema.Number),
    startingPlayerIndex: Schema.mutableKey(Schema.Number),
    phase: Schema.mutableKey(perudoPhaseSchema),
    currentBid: Schema.mutableKey(Schema.NullOr(bidSchema)),
    bidHistory: Schema.mutableKey(Schema.mutable(Schema.Array(bidSchema))),
    roundNumber: Schema.mutableKey(Schema.Number),
    palificoRound: Schema.mutableKey(Schema.Boolean),
    lastChallengeResult: Schema.mutableKey(Schema.NullOr(challengeResultSchema)),
    winners: Schema.mutableKey(Schema.NullOr(Schema.mutable(Schema.Array(Schema.String)))),
    totalDiceInPlay: Schema.mutableKey(Schema.Number),
    revealTimerActive: Schema.mutableKey(Schema.Boolean),
});

const perudoPlayerInfoSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    diceCount: Schema.mutableKey(Schema.Number),
    eliminated: Schema.mutableKey(Schema.Boolean),
    isCurrentPlayer: Schema.mutableKey(Schema.Boolean),
    isStartingPlayer: Schema.mutableKey(Schema.Boolean),
    dice: Schema.mutableKey(Schema.NullOr(Schema.mutable(Schema.Array(faceValueSchema)))),
});

const nextHigherBidSchema = Schema.Struct({
    quantity: Schema.mutableKey(positiveIntSchema),
    faceValue: Schema.mutableKey(faceValueSchema),
});

export const perudoPlayerViewSchema = Schema.Struct({
    myId: Schema.mutableKey(Schema.String),
    phase: Schema.mutableKey(perudoPhaseSchema),
    roundNumber: Schema.mutableKey(Schema.Number),
    currentBid: Schema.mutableKey(Schema.NullOr(bidSchema)),
    bidHistory: Schema.mutableKey(Schema.mutable(Schema.Array(bidSchema))),
    palificoRound: Schema.mutableKey(Schema.Boolean),
    lastChallengeResult: Schema.mutableKey(Schema.NullOr(challengeResultSchema)),
    winners: Schema.mutableKey(Schema.NullOr(Schema.mutable(Schema.Array(Schema.String)))),
    totalDiceInPlay: Schema.mutableKey(Schema.Number),
    revealTimerActive: Schema.mutableKey(Schema.Boolean),
    isMyTurn: Schema.mutableKey(Schema.Boolean),
    currentPlayerId: Schema.mutableKey(Schema.String),
    players: Schema.mutableKey(Schema.mutable(Schema.Array(perudoPlayerInfoSchema))),
    canBid: Schema.mutableKey(Schema.Boolean),
    canChallenge: Schema.mutableKey(Schema.Boolean),
    mustBet: Schema.mutableKey(Schema.Boolean),
    nextHigherBid: Schema.mutableKey(Schema.NullOr(nextHigherBidSchema)),
});

const diceRollsSchema = Schema.Record(
    Schema.String,
    Schema.mutable(Schema.Array(faceValueSchema)),
);

export const perudoResultSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("error")),
        message: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("round_started")),
        roundNumber: Schema.mutableKey(Schema.Number),
        palificoRound: Schema.mutableKey(Schema.Boolean),
        diceRolls: Schema.mutableKey(diceRollsSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("bid_placed")),
        bid: Schema.mutableKey(bidSchema),
        totalDiceInPlay: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("challenge_made")),
        challengerId: Schema.mutableKey(Schema.String),
        bid: Schema.mutableKey(bidSchema),
        actualCount: Schema.mutableKey(Schema.Number),
        palificoRound: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("player_eliminated")),
        playerId: Schema.mutableKey(Schema.String),
        loserId: Schema.mutableKey(Schema.String),
        loserNewCount: Schema.mutableKey(Schema.Number),
        nextPlayerIndex: Schema.mutableKey(Schema.Number),
        nextStartingPlayerIndex: Schema.mutableKey(Schema.Number),
        palificoRound: Schema.mutableKey(Schema.Boolean),
        wasCorrect: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("round_ended")),
        nextPlayerIndex: Schema.mutableKey(Schema.Number),
        nextStartingPlayerIndex: Schema.mutableKey(Schema.Number),
        palificoRound: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("game_over")),
        winners: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    }),
]);

export const perudoGameOverPayloadSchema = Schema.Struct({
    winners: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
});

export const perudoServerMessageSchema = buildGameServerMessageSchema({
    prefix: "perudo",
    playerViewSchema: perudoPlayerViewSchema,
    actionSchema: perudoResultSchema,
    gameOverSchema: perudoGameOverPayloadSchema,
});

export type FaceValue = SchemaType<typeof faceValueSchema>;
export type PerudoPhase = SchemaType<typeof perudoPhaseSchema>;
export type Bid = SchemaType<typeof bidSchema>;
export type ChallengeResult = SchemaType<typeof challengeResultSchema>;
export type PerudoPlayer = SchemaType<typeof perudoPlayerStateSchema>;
export type PerudoState = SchemaType<typeof perudoStateSchema>;
export type PerudoPlayerInfo = SchemaType<typeof perudoPlayerInfoSchema>;
export type PerudoPlayerView = SchemaType<typeof perudoPlayerViewSchema>;
export type PerudoResult = SchemaType<typeof perudoResultSchema>;
export type PerudoGameOverPayload = SchemaType<typeof perudoGameOverPayloadSchema>;
export type PerudoServerMessage = SchemaType<typeof perudoServerMessageSchema>;

export type PerudoSideMessage = Exclude<
    PerudoServerMessage,
    { type: "perudo:state" }
>;

export const decodePerudoPlayerView = createPlayerViewDecoder(perudoPlayerViewSchema);
export const decodePerudoSideMessage = createServerMessageDecoder(
    "perudo:state",
    perudoServerMessageSchema,
);
export const encodePerudoServerMessage = (message: PerudoServerMessage) =>
    encodeGameServerMessage(perudoServerMessageSchema, message);
