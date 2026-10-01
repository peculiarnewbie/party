import { Schema } from "effect";
import { goFishPlayerViewSchema } from "./schemas";
import { getPlayerView } from "./views";
import type { GoFishState } from "./types";

export const goFishTableViewSchema = Schema.Struct({
    drawPileCount: goFishPlayerViewSchema.fields.drawPileCount,
    currentPlayerId: goFishPlayerViewSchema.fields.currentPlayerId,
    turnPhase: goFishPlayerViewSchema.fields.turnPhase,
    players: goFishPlayerViewSchema.fields.players,
    lastAction: goFishPlayerViewSchema.fields.lastAction,
    lastResult: goFishPlayerViewSchema.fields.lastResult,
    gameOver: goFishPlayerViewSchema.fields.gameOver,
    winner: goFishPlayerViewSchema.fields.winner,
});

export type GoFishTableView = typeof goFishTableViewSchema.Type;

export function getGoFishTableView(state: GoFishState): GoFishTableView {
    const view = getPlayerView(state, "");
    return {
        drawPileCount: view.drawPileCount,
        currentPlayerId: view.currentPlayerId,
        turnPhase: view.turnPhase,
        players: view.players,
        lastAction: view.lastAction,
        lastResult: view.lastResult,
        gameOver: view.gameOver,
        winner: view.winner,
    };
}
