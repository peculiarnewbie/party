import { Schema } from "effect";
import { flip7PlayerViewSchema } from "./schemas";
import { getPlayerView } from "./views";
import type { Flip7State } from "./types";

export const flip7TableViewSchema = Schema.Struct({
    phase: flip7PlayerViewSchema.fields.phase,
    roundNumber: flip7PlayerViewSchema.fields.roundNumber,
    targetScore: flip7PlayerViewSchema.fields.targetScore,
    dealerId: flip7PlayerViewSchema.fields.dealerId,
    currentPlayerId: flip7PlayerViewSchema.fields.currentPlayerId,
    deckCount: flip7PlayerViewSchema.fields.deckCount,
    discardCount: flip7PlayerViewSchema.fields.discardCount,
    players: flip7PlayerViewSchema.fields.players,
    targetChoice: flip7PlayerViewSchema.fields.targetChoice,
    lastRoundResult: flip7PlayerViewSchema.fields.lastRoundResult,
    winners: flip7PlayerViewSchema.fields.winners,
    endedByHost: flip7PlayerViewSchema.fields.endedByHost,
});

export type Flip7TableView = typeof flip7TableViewSchema.Type;

export function getFlip7TableView(state: Flip7State): Flip7TableView {
    const view = getPlayerView(state, null);
    return {
        phase: view.phase,
        roundNumber: view.roundNumber,
        targetScore: view.targetScore,
        dealerId: view.dealerId,
        currentPlayerId: view.currentPlayerId,
        deckCount: view.deckCount,
        discardCount: view.discardCount,
        players: view.players,
        targetChoice: view.targetChoice,
        lastRoundResult: view.lastRoundResult,
        winners: view.winners,
        endedByHost: view.endedByHost,
    };
}
