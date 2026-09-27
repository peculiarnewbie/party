import { Schema } from "effect";
import { perudoPlayerViewSchema } from "./schemas";
import { getPlayerView } from "./views";
import type { PerudoState } from "./types";

export const perudoTableViewSchema = Schema.Struct({
    phase: perudoPlayerViewSchema.fields.phase,
    roundNumber: perudoPlayerViewSchema.fields.roundNumber,
    currentBid: perudoPlayerViewSchema.fields.currentBid,
    bidHistory: perudoPlayerViewSchema.fields.bidHistory,
    palificoRound: perudoPlayerViewSchema.fields.palificoRound,
    lastChallengeResult: perudoPlayerViewSchema.fields.lastChallengeResult,
    winners: perudoPlayerViewSchema.fields.winners,
    totalDiceInPlay: perudoPlayerViewSchema.fields.totalDiceInPlay,
    revealTimerActive: perudoPlayerViewSchema.fields.revealTimerActive,
    currentPlayerId: perudoPlayerViewSchema.fields.currentPlayerId,
    players: perudoPlayerViewSchema.fields.players,
});

export type PerudoTableView = typeof perudoTableViewSchema.Type;

export function getPerudoTableView(state: PerudoState): PerudoTableView {
    const view = getPlayerView(state, null);
    return {
        phase: view.phase,
        roundNumber: view.roundNumber,
        currentBid: view.currentBid,
        bidHistory: view.bidHistory,
        palificoRound: view.palificoRound,
        lastChallengeResult: view.lastChallengeResult,
        winners: view.winners,
        totalDiceInPlay: view.totalDiceInPlay,
        revealTimerActive: view.revealTimerActive,
        currentPlayerId: view.currentPlayerId,
        players: view.players,
    };
}
