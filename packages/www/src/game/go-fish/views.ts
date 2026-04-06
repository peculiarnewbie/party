import type { Card, Rank } from "~/assets/card-deck/types";
import type {
    GoFishState,
    GoFishAction,
    GoFishResult,
    TurnPhase,
} from "./types";

export interface GoFishPlayerView {
    myHand: Card[];
    drawPileCount: number;
    currentPlayerId: string;
    turnPhase: TurnPhase;
    players: {
        id: string;
        name: string;
        cardCount: number;
        books: Rank[];
    }[];
    lastAction: GoFishAction | null;
    lastResult: GoFishResult | null;
    gameOver: boolean;
    winner: string[] | null;
}

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
