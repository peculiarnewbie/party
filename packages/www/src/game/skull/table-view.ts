import { Schema } from "effect";
import { skullPlayerViewSchema } from "./schemas";
import { getPlayerView } from "./views";
import type { SkullPlayerView, SkullState } from "./schemas";

export const skullTableViewSchema = Schema.Struct({
    phase: skullPlayerViewSchema.fields.phase,
    roundNumber: skullPlayerViewSchema.fields.roundNumber,
    currentPlayerId: skullPlayerViewSchema.fields.currentPlayerId,
    starterPlayerId: skullPlayerViewSchema.fields.starterPlayerId,
    highestBid: skullPlayerViewSchema.fields.highestBid,
    highestBidderId: skullPlayerViewSchema.fields.highestBidderId,
    passedBidderIds: skullPlayerViewSchema.fields.passedBidderIds,
    penaltyPlayerId: skullPlayerViewSchema.fields.penaltyPlayerId,
    penaltyChooserId: skullPlayerViewSchema.fields.penaltyChooserId,
    pendingNextStarterChooserId:
        skullPlayerViewSchema.fields.pendingNextStarterChooserId,
    winnerId: skullPlayerViewSchema.fields.winnerId,
    players: skullPlayerViewSchema.fields.players,
    attempt: skullPlayerViewSchema.fields.attempt,
    lastPublicResult: skullPlayerViewSchema.fields.lastPublicResult,
});

export type SkullTableView = typeof skullTableViewSchema.Type;

export function skullTableViewFromPlayer(
    view: SkullPlayerView,
): SkullTableView {
    return structuredClone({
        phase: view.phase,
        roundNumber: view.roundNumber,
        currentPlayerId: view.currentPlayerId,
        starterPlayerId: view.starterPlayerId,
        highestBid: view.highestBid,
        highestBidderId: view.highestBidderId,
        passedBidderIds: view.passedBidderIds,
        penaltyPlayerId: view.penaltyPlayerId,
        penaltyChooserId: view.penaltyChooserId,
        pendingNextStarterChooserId: view.pendingNextStarterChooserId,
        winnerId: view.winnerId,
        players: view.players,
        attempt: view.attempt,
        lastPublicResult: view.lastPublicResult,
    });
}

export function getSkullTableView(state: SkullState): SkullTableView {
    return skullTableViewFromPlayer(getPlayerView(state, ""));
}
