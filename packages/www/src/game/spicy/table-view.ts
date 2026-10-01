import { Schema } from "effect";
import { spicyPlayerViewSchema } from "./schemas";
import { getPlayerView } from "./views";
import type { SpicyPlayerView, SpicyState } from "./schemas";

export const spicyTableViewSchema = Schema.Struct({
    phase: spicyPlayerViewSchema.fields.phase,
    currentPlayerId: spicyPlayerViewSchema.fields.currentPlayerId,
    pendingLastCardPlayerId:
        spicyPlayerViewSchema.fields.pendingLastCardPlayerId,
    safePassPlayerIds: spicyPlayerViewSchema.fields.safePassPlayerIds,
    trophiesRemaining: spicyPlayerViewSchema.fields.trophiesRemaining,
    players: spicyPlayerViewSchema.fields.players,
    stackTop: spicyPlayerViewSchema.fields.stackTop,
    winners: spicyPlayerViewSchema.fields.winners,
    endReason: spicyPlayerViewSchema.fields.endReason,
    finalScores: spicyPlayerViewSchema.fields.finalScores,
    lastPublicResult: spicyPlayerViewSchema.fields.lastPublicResult,
});

export type SpicyTableView = typeof spicyTableViewSchema.Type;

export function spicyTableViewFromPlayer(
    view: SpicyPlayerView,
): SpicyTableView {
    return structuredClone({
        phase: view.phase,
        currentPlayerId: view.currentPlayerId,
        pendingLastCardPlayerId: view.pendingLastCardPlayerId,
        safePassPlayerIds: view.safePassPlayerIds,
        trophiesRemaining: view.trophiesRemaining,
        players: view.players,
        stackTop: view.stackTop,
        winners: view.winners,
        endReason: view.endReason,
        finalScores: view.finalScores,
        lastPublicResult: view.lastPublicResult,
    });
}

export function getSpicyTableView(state: SpicyState): SpicyTableView {
    return spicyTableViewFromPlayer(getPlayerView(state, ""));
}
