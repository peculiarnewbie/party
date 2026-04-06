import type { Card, Rank } from "~/assets/card-deck/types";

export type { Card, Rank };

export interface GoFishPlayer {
    id: string;
    name: string;
    hand: Card[];
    books: Rank[];
}

export type TurnPhase = "awaiting_ask" | "go_fish" | "turn_complete";

export interface GoFishState {
    players: GoFishPlayer[];
    drawPile: Card[];
    currentPlayerIndex: number;
    turnPhase: TurnPhase;
    lastAction: GoFishAction | null;
    lastResult: GoFishResult | null;
    lastAskedRank: Rank | null;
    gameOver: boolean;
    winner: string[] | null;
}

export type GoFishAction =
    | { type: "ask"; askerId: string; targetId: string; rank: Rank }
    | { type: "draw"; playerId: string };

export type GoFishResult =
    | {
          type: "cards_given";
          fromId: string;
          toId: string;
          rank: Rank;
          count: number;
          bookMade: boolean;
      }
    | {
          type: "go_fish";
          playerId: string;
          drewAskedRank: boolean;
          bookMade: boolean;
      }
    | { type: "game_over"; winners: string[] }
    | { type: "error"; message: string };
