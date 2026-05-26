import { Schema } from "effect";

import { decodeUnknownSync } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import {
    buildGameServerMessageSchema,
    createPlayerViewDecoder,
    encodeGameServerMessage,
    type GameErrorPayload,
} from "~/game/shared/game-wire";

export const rpsChoices = ["rock", "paper", "scissors"] as const;
export const rpsBestOfValues = [1, 3, 5] as const;
export const rpsPhases = ["throwing", "round_results", "tournament_over"] as const;

const rpsChoiceSchema = Schema.Literals(rpsChoices);
const rpsBestOfSchema = Schema.Literals(rpsBestOfValues);
const rpsPhaseSchema = Schema.Literals(rpsPhases);
const matchStatusSchema = Schema.Literals(["active", "complete"] as const);

const rpsPlayerStateSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    eliminated: Schema.mutableKey(Schema.Boolean),
});

const rpsThrowStateSchema = Schema.Struct({
    player1Choice: Schema.mutableKey(rpsChoiceSchema),
    player2Choice: Schema.mutableKey(rpsChoiceSchema),
    winnerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
});

const rpsMatchStateSchema = Schema.Struct({
    player1Id: Schema.mutableKey(Schema.String),
    player2Id: Schema.mutableKey(Schema.String),
    throws: Schema.mutableKey(Schema.mutable(Schema.Array(rpsThrowStateSchema))),
    player1Wins: Schema.mutableKey(Schema.Number),
    player2Wins: Schema.mutableKey(Schema.Number),
    player1Choice: Schema.mutableKey(Schema.NullOr(rpsChoiceSchema)),
    player2Choice: Schema.mutableKey(Schema.NullOr(rpsChoiceSchema)),
    winnerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    status: Schema.mutableKey(matchStatusSchema),
});

const rpsRoundStateSchema = Schema.Struct({
    roundNumber: Schema.mutableKey(Schema.Number),
    matches: Schema.mutableKey(Schema.mutable(Schema.Array(rpsMatchStateSchema))),
    byePlayerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
});

export const rpsStateSchema = Schema.Struct({
    players: Schema.mutableKey(
        Schema.mutable(Schema.Array(rpsPlayerStateSchema)),
    ),
    bestOf: Schema.mutableKey(rpsBestOfSchema),
    rounds: Schema.mutableKey(Schema.mutable(Schema.Array(rpsRoundStateSchema))),
    currentRound: Schema.mutableKey(Schema.Number),
    phase: Schema.mutableKey(rpsPhaseSchema),
    winnerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    totalRounds: Schema.mutableKey(Schema.Number),
});

const rpsPlayerInfoSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    eliminated: Schema.mutableKey(Schema.Boolean),
});

const rpsThrowViewSchema = Schema.Struct({
    player1Choice: Schema.mutableKey(rpsChoiceSchema),
    player2Choice: Schema.mutableKey(rpsChoiceSchema),
    winnerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
});

const rpsMatchViewSchema = Schema.Struct({
    player1: Schema.mutableKey(rpsPlayerInfoSchema),
    player2: Schema.mutableKey(rpsPlayerInfoSchema),
    player1Wins: Schema.mutableKey(Schema.Number),
    player2Wins: Schema.mutableKey(Schema.Number),
    throws: Schema.mutableKey(Schema.mutable(Schema.Array(rpsThrowViewSchema))),
    winnerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    status: Schema.mutableKey(matchStatusSchema),
    myChoice: Schema.mutableKey(Schema.NullOr(rpsChoiceSchema)),
    opponentHasThrown: Schema.mutableKey(Schema.Boolean),
    isMyMatch: Schema.mutableKey(Schema.Boolean),
});

const rpsRoundViewSchema = Schema.Struct({
    roundNumber: Schema.mutableKey(Schema.Number),
    label: Schema.mutableKey(Schema.String),
    matches: Schema.mutableKey(Schema.mutable(Schema.Array(rpsMatchViewSchema))),
    byePlayer: Schema.mutableKey(Schema.NullOr(rpsPlayerInfoSchema)),
});

export const rpsPlayerViewSchema = Schema.Struct({
    myId: Schema.mutableKey(Schema.String),
    phase: Schema.mutableKey(rpsPhaseSchema),
    bestOf: Schema.mutableKey(rpsBestOfSchema),
    currentRound: Schema.mutableKey(Schema.Number),
    totalRounds: Schema.mutableKey(Schema.Number),
    rounds: Schema.mutableKey(Schema.mutable(Schema.Array(rpsRoundViewSchema))),
    winnerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    players: Schema.mutableKey(Schema.mutable(Schema.Array(rpsPlayerInfoSchema))),
    myMatch: Schema.mutableKey(Schema.NullOr(rpsMatchViewSchema)),
    needsToThrow: Schema.mutableKey(Schema.Boolean),
});

const faceValueSchema = rpsChoiceSchema;

export const rpsResultSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("error")),
        message: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("throw_registered")),
        playerId: Schema.mutableKey(Schema.String),
        matchComplete: Schema.mutableKey(Schema.Boolean),
        bothThrown: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("round_advanced")),
        roundNumber: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("best_of_changed")),
        bestOf: Schema.mutableKey(rpsBestOfSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("tournament_over")),
        winnerId: Schema.mutableKey(Schema.String),
    }),
]);

export const rpsGameOverPayloadSchema = Schema.Struct({
    winnerId: Schema.mutableKey(Schema.String),
});

export const rpsServerMessageSchema = buildGameServerMessageSchema({
    prefix: "rps",
    playerViewSchema: rpsPlayerViewSchema,
    actionSchema: rpsResultSchema,
    gameOverSchema: rpsGameOverPayloadSchema,
});

export type RpsChoice = SchemaType<typeof rpsChoiceSchema>;
export type BestOf = SchemaType<typeof rpsBestOfSchema>;
export type RpsPhase = SchemaType<typeof rpsPhaseSchema>;
export type RpsPlayer = SchemaType<typeof rpsPlayerStateSchema>;
export type RpsThrow = SchemaType<typeof rpsThrowStateSchema>;
export type RpsMatch = SchemaType<typeof rpsMatchStateSchema>;
export type RpsRound = SchemaType<typeof rpsRoundStateSchema>;
export type RpsState = SchemaType<typeof rpsStateSchema>;
export type RpsPlayerInfo = SchemaType<typeof rpsPlayerInfoSchema>;
export type RpsThrowView = SchemaType<typeof rpsThrowViewSchema>;
export type RpsMatchView = SchemaType<typeof rpsMatchViewSchema>;
export type RpsRoundView = SchemaType<typeof rpsRoundViewSchema>;
export type RpsPlayerView = SchemaType<typeof rpsPlayerViewSchema>;
export type RpsResult = SchemaType<typeof rpsResultSchema>;
export type RpsGameOverPayload = SchemaType<typeof rpsGameOverPayloadSchema>;
export type RpsServerMessage = SchemaType<typeof rpsServerMessageSchema>;
export type RpsSideMessage =
    | { type: "rps:action"; data: RpsResult }
    | { type: "rps:error"; data: GameErrorPayload }
    | { type: "rps:game_over"; data: RpsGameOverPayload };

export const decodeRpsPlayerView = createPlayerViewDecoder(rpsPlayerViewSchema);
export function decodeRpsSideMessage(raw: unknown): RpsSideMessage | null {
    try {
        const message = decodeUnknownSync(
            rpsServerMessageSchema,
            raw,
        ) as RpsServerMessage;

        if (message.type === "rps:state") {
            return null;
        }

        if (message.type === "rps:action") {
            return { type: "rps:action", data: message.data as RpsResult };
        }

        if (message.type === "rps:error") {
            return { type: "rps:error", data: message.data as GameErrorPayload };
        }

        if (message.type === "rps:game_over") {
            return {
                type: "rps:game_over",
                data: message.data as RpsGameOverPayload,
            };
        }

        return null;
    } catch {
        return null;
    }
}
export const encodeRpsServerMessage = (message: RpsServerMessage) =>
    encodeGameServerMessage(rpsServerMessageSchema, message);
