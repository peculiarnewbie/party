import { Schema } from "effect";
import { yahtzeePlayerViewSchema } from "./schemas";
import { getPlayerView } from "./views";
import type { YahtzeeState } from "./types";

export const yahtzeeTableViewSchema = Schema.Struct({
    phase: yahtzeePlayerViewSchema.fields.phase,
    round: yahtzeePlayerViewSchema.fields.round,
    dice: yahtzeePlayerViewSchema.fields.dice,
    held: yahtzeePlayerViewSchema.fields.held,
    rollsLeft: yahtzeePlayerViewSchema.fields.rollsLeft,
    currentPlayerId: yahtzeePlayerViewSchema.fields.currentPlayerId,
    players: yahtzeePlayerViewSchema.fields.players,
    winners: yahtzeePlayerViewSchema.fields.winners,
});

export type YahtzeeTableView = typeof yahtzeeTableViewSchema.Type;

export function getYahtzeeTableView(
    state: YahtzeeState,
): YahtzeeTableView | null {
    if (state.mode !== "standard") return null;
    const view = getPlayerView(state, "");
    return {
        phase: view.phase,
        round: view.round,
        dice: view.dice,
        held: view.held,
        rollsLeft: view.rollsLeft,
        currentPlayerId: view.currentPlayerId,
        players: view.players,
        winners: view.winners,
    };
}
