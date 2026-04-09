export type FaceValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface PerudoPlayer {
    id: string;
    name: string;
    dice: FaceValue[];
    eliminated: boolean;
}

export interface Bid {
    playerId: string;
    quantity: number;
    faceValue: FaceValue;
}

export interface ChallengeResult {
    challengerId: string;
    bidderId: string;
    bid: Bid;
    wasCorrect: boolean;
    actualCount: number;
    loserId: string;
    loserNewCount: number;
}

export type PerudoPhase = "round_start" | "bidding" | "revealing" | "game_over";

export interface PerudoState {
    players: PerudoPlayer[];
    currentPlayerIndex: number;
    startingPlayerIndex: number;
    phase: PerudoPhase;
    currentBid: Bid | null;
    bidHistory: Bid[];
    roundNumber: number;
    palificoRound: boolean;
    lastChallengeResult: ChallengeResult | null;
    winners: string[] | null;
    totalDiceInPlay: number;
    revealTimerActive: boolean;
}

export type PerudoAction =
    | { type: "bid"; playerId: string; quantity: number; faceValue: FaceValue }
    | { type: "challenge"; playerId: string };

export type PerudoResult =
    | { type: "error"; message: string }
    | {
          type: "round_started";
          roundNumber: number;
          palificoRound: boolean;
          diceRolls: Record<string, FaceValue[]>;
      }
    | { type: "bid_placed"; bid: Bid; totalDiceInPlay: number }
    | {
          type: "challenge_made";
          challengerId: string;
          bid: Bid;
          actualCount: number;
          palificoRound: boolean;
      }
    | {
          type: "player_eliminated";
          playerId: string;
          loserId: string;
          loserNewCount: number;
          nextPlayerIndex: number;
          nextStartingPlayerIndex: number;
          palificoRound: boolean;
          wasCorrect: boolean;
      }
    | {
          type: "round_ended";
          nextPlayerIndex: number;
          nextStartingPlayerIndex: number;
          palificoRound: boolean;
      }
    | { type: "game_over"; winners: string[] };
