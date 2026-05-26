import type { Card, Rank } from "~/assets/card-deck/types";

export type { Card, Rank };

export type {
    TurnPhase,
    GoFishAction,
    GoFishResult,
} from "./schemas";

export interface GoFishPlayer {
    id: string;
    name: string;
    hand: Card[];
    books: Rank[];
}

export interface GoFishState {
    players: GoFishPlayer[];
    drawPile: Card[];
    currentPlayerIndex: number;
    turnPhase: import("./schemas").TurnPhase;
    lastAction: import("./schemas").GoFishAction | null;
    lastResult: import("./schemas").GoFishResult | null;
    lastAskedRank: Rank | null;
    gameOver: boolean;
    winner: string[] | null;
}
