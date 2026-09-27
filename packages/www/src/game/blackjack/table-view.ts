import { Schema } from "effect";
import { blackjackPlayerViewSchema } from "./schemas";
import { getPlayerView } from "./views";
import type { BlackjackState } from "./types";

export const blackjackTableViewSchema = Schema.Struct({
    phase: blackjackPlayerViewSchema.fields.phase,
    roundNumber: blackjackPlayerViewSchema.fields.roundNumber,
    dealer: blackjackPlayerViewSchema.fields.dealer,
    players: blackjackPlayerViewSchema.fields.players,
    currentPlayerIndex: blackjackPlayerViewSchema.fields.currentPlayerIndex,
    results: blackjackPlayerViewSchema.fields.results,
    shoeCount: blackjackPlayerViewSchema.fields.shoeCount,
});

export type BlackjackTableView = typeof blackjackTableViewSchema.Type;

export function getBlackjackTableView(
    state: BlackjackState,
): BlackjackTableView {
    const view = getPlayerView(state, null);
    return {
        phase: view.phase,
        roundNumber: view.roundNumber,
        dealer: view.dealer,
        players: view.players,
        currentPlayerIndex: view.currentPlayerIndex,
        results: view.results,
        shoeCount: view.shoeCount,
    };
}
