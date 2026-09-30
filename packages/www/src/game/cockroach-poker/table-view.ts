import { Schema } from "effect";
import {
    CREATURE_TYPES,
    cockroachPokerPlayerViewSchema,
    cockroachPokerResultSchema,
} from "./schemas";
import type { CockroachPokerState } from "./types";

export const cockroachPokerTableViewSchema = Schema.Struct({
    phase: cockroachPokerPlayerViewSchema.fields.phase,
    activePlayerId: Schema.String,
    players: cockroachPokerPlayerViewSchema.fields.players,
    offerChain: Schema.NullOr(
        Schema.Struct({
            currentOffererId: Schema.String,
            currentReceiverId: Schema.String,
            currentClaim: Schema.Literals(CREATURE_TYPES),
            seenByPlayerIds: Schema.Array(Schema.String),
            receiverPeeked: Schema.Boolean,
        }),
    ),
    loserId: Schema.NullOr(Schema.String),
    loseReason: cockroachPokerPlayerViewSchema.fields.loseReason,
    lastResult: Schema.NullOr(cockroachPokerResultSchema),
});

export type CockroachPokerTableView = typeof cockroachPokerTableViewSchema.Type;

export function getCockroachPokerTableView(
    state: CockroachPokerState,
): CockroachPokerTableView {
    const chain = state.offerChain;
    return {
        phase: state.phase,
        activePlayerId: state.activePlayerId,
        players: state.players.map(({ id, name, hand, faceUpCards }) => ({
            id,
            name,
            handCount: hand.length,
            faceUpCards: [...faceUpCards],
        })),
        offerChain: chain
            ? {
                  currentOffererId: chain.currentOffererId,
                  currentReceiverId: chain.currentReceiverId,
                  currentClaim: chain.currentClaim,
                  seenByPlayerIds: [...chain.seenByPlayerIds],
                  receiverPeeked: chain.seenByPlayerIds.includes(
                      chain.currentReceiverId,
                  ),
              }
            : null,
        loserId: state.loserId,
        loseReason: state.loseReason,
        lastResult: state.lastResult ? { ...state.lastResult } : null,
    };
}
