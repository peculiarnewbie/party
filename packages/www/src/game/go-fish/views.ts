import type { GoFishState } from "./types";
import type { GoFishPlayerView } from "./schemas";

export type { GoFishPlayerView };

export function getPlayerView(
    state: GoFishState,
    playerId: string,
): GoFishPlayerView {
    const me = state.players.find((p) => p.id === playerId);

    return {
        myHand: me ? [...me.hand] : [],
        drawPileCount: state.drawPile.length,
        currentPlayerId: state.players[state.currentPlayerIndex]?.id ?? "",
        turnPhase: state.turnPhase,
        players: state.players.map((p) => ({
            id: p.id,
            name: p.name,
            cardCount: p.hand.length,
            books: [...p.books],
        })),
        lastAction: state.lastAction,
        lastResult: state.lastResult,
        gameOver: state.gameOver,
        winner: state.winner,
    };
}
