export type RpsChoice = "rock" | "paper" | "scissors";
export type BestOf = 1 | 3 | 5;
export type RpsPhase = "throwing" | "round_results" | "tournament_over";

export interface RpsPlayer {
    id: string;
    name: string;
    eliminated: boolean;
}

export interface RpsThrow {
    player1Choice: RpsChoice;
    player2Choice: RpsChoice;
    winnerId: string | null;
}

export interface RpsMatch {
    player1Id: string;
    player2Id: string;
    throws: RpsThrow[];
    player1Wins: number;
    player2Wins: number;
    player1Choice: RpsChoice | null;
    player2Choice: RpsChoice | null;
    winnerId: string | null;
    status: "active" | "complete";
}

export interface RpsRound {
    roundNumber: number;
    matches: RpsMatch[];
    byePlayerId: string | null;
}

export interface RpsState {
    players: RpsPlayer[];
    bestOf: BestOf;
    rounds: RpsRound[];
    currentRound: number;
    phase: RpsPhase;
    winnerId: string | null;
    totalRounds: number;
}

export type RpsAction =
    | { type: "throw"; playerId: string; choice: RpsChoice }
    | { type: "next_round"; playerId: string }
    | { type: "set_best_of"; bestOf: BestOf };

export type RpsResult =
    | { type: "error"; message: string }
    | {
          type: "throw_registered";
          playerId: string;
          matchComplete: boolean;
          bothThrown: boolean;
      }
    | { type: "round_advanced"; roundNumber: number }
    | { type: "best_of_changed"; bestOf: BestOf }
    | { type: "tournament_over"; winnerId: string };
