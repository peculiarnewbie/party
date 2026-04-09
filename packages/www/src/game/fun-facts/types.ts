export type FunFactsPhase =
    | "waiting"
    | "answering"
    | "placing"
    | "reveal"
    | "game_over";

export interface FunFactsPlayer {
    id: string;
    name: string;
}

export interface FunFactsRoundResult {
    question: string;
    placedOrder: string[];
    answers: Record<string, number>;
    correctArrows: string[];
    removedArrows: string[];
    pointsEarned: number;
}

export interface FunFactsState {
    players: FunFactsPlayer[];
    hostId: string;
    phase: FunFactsPhase;
    roundNumber: number;
    totalRounds: number;
    currentQuestion: string | null;
    questionIndex: number;
    shuffledQuestions: string[];
    answers: Record<string, number>;
    placingOrder: string[];
    currentPlacerIndex: number;
    placedArrows: string[];
    teamScore: number;
    roundScores: number[];
    lastRoundResult: FunFactsRoundResult | null;
}

export type FunFactsAction =
    | { type: "next_question"; hostId: string; customQuestion?: string }
    | { type: "submit_answer"; playerId: string; answer: number }
    | { type: "close_answers"; hostId: string }
    | { type: "place_arrow"; playerId: string; position: number }
    | { type: "next_round"; hostId: string };

export type FunFactsResult =
    | { type: "error"; message: string }
    | { type: "question_started"; question: string; roundNumber: number }
    | {
          type: "answer_submitted";
          playerId: string;
          answeredCount: number;
          totalPlayers: number;
      }
    | { type: "answers_closed"; placingOrder: string[]; firstPlacerId: string }
    | {
          type: "arrow_placed";
          playerId: string;
          nextPlacerId: string | null;
          placedCount: number;
          totalPlacers: number;
      }
    | { type: "round_revealed"; result: FunFactsRoundResult }
    | { type: "round_advanced" }
    | { type: "game_over"; teamScore: number; maxScore: number };
