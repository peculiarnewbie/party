import { Schema } from "effect";

import { decodeUnknownSync } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import {
    createPlayerViewDecoder,
    encodeGameServerMessage,
    gameErrorPayloadSchema,
    type GameErrorPayload,
} from "~/game/shared/game-wire";
import { nonNegativeIntSchema, serverMessageWithData } from "~/game/shared/wire-schemas";
import { rpsEventSchema, type RpsEvent, type RpsHiddenData } from "./events";
import { rpsChoices, rpsBestOfValues, rpsPhases, rpsChoiceSchema, rpsBestOfSchema } from "./constants";

export { rpsChoices, rpsBestOfValues, rpsChoiceSchema, rpsBestOfSchema } from "./constants";

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

const rpsHiddenDataWireSchema = Schema.Struct({
    type: Schema.mutableKey(Schema.Literal("throw_choice")),
    choice: Schema.mutableKey(rpsChoiceSchema),
});

const rpsSnapshotMessageSchema = Schema.Struct({
    type: Schema.mutableKey(Schema.Literal("rps:snapshot")),
    index: Schema.mutableKey(nonNegativeIntSchema),
    data: Schema.mutableKey(rpsStateSchema),
});

const rpsEventMessageSchema = Schema.Struct({
    type: Schema.mutableKey(Schema.Literal("rps:event")),
    index: Schema.mutableKey(nonNegativeIntSchema),
    data: Schema.mutableKey(rpsEventSchema),
});

const rpsHiddenMessageSchema = Schema.Struct({
    type: Schema.mutableKey(Schema.Literal("rps:hidden")),
    index: Schema.mutableKey(nonNegativeIntSchema),
    data: Schema.mutableKey(rpsHiddenDataWireSchema),
});

const rpsSyncResponseMessageSchema = Schema.Struct({
    type: Schema.mutableKey(Schema.Literal("rps:sync_response")),
    snapshot: Schema.mutableKey(Schema.Struct({
        index: Schema.mutableKey(nonNegativeIntSchema),
        data: Schema.mutableKey(rpsStateSchema),
    })),
    events: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.Struct({
        index: Schema.mutableKey(nonNegativeIntSchema),
        type: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(rpsEventSchema),
    })))),
    hidden: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.Struct({
        index: Schema.mutableKey(nonNegativeIntSchema),
        data: Schema.mutableKey(rpsHiddenDataWireSchema),
    })))),
});

export const rpsServerMessageSchema = Schema.Union([
    serverMessageWithData("rps:state", rpsPlayerViewSchema),
    serverMessageWithData("rps:action", rpsResultSchema),
    serverMessageWithData("rps:error", gameErrorPayloadSchema),
    serverMessageWithData("rps:game_over", rpsGameOverPayloadSchema),
    rpsSnapshotMessageSchema,
    rpsEventMessageSchema,
    rpsHiddenMessageSchema,
    rpsSyncResponseMessageSchema,
]);

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
    | { type: "rps:game_over"; data: RpsGameOverPayload }
    | { type: "rps:snapshot"; index: number; data: RpsState }
    | { type: "rps:event"; index: number; data: RpsEvent }
    | { type: "rps:hidden"; index: number; data: RpsHiddenData }
    | { type: "rps:sync_response"; snapshot: { index: number; data: RpsState }; events: { index: number; type: string; data: RpsEvent }[]; hidden: { index: number; data: RpsHiddenData }[] };

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

        if (message.type === "rps:snapshot") {
            const ledgerMessage = message as unknown as { index: number; data: RpsState };
            return { type: "rps:snapshot", index: ledgerMessage.index, data: ledgerMessage.data };
        }

        if (message.type === "rps:event") {
            const ledgerMessage = message as unknown as { index: number; data: RpsEvent };
            return { type: "rps:event", index: ledgerMessage.index, data: ledgerMessage.data };
        }

        if (message.type === "rps:hidden") {
            const ledgerMessage = message as unknown as { index: number; data: RpsHiddenData };
            return { type: "rps:hidden", index: ledgerMessage.index, data: ledgerMessage.data };
        }

        if (message.type === "rps:sync_response") {
            return message as RpsSideMessage;
        }

        return null;
    } catch {
        return null;
    }
}
export const encodeRpsServerMessage = (message: RpsServerMessage) =>
    encodeGameServerMessage(rpsServerMessageSchema, message);
