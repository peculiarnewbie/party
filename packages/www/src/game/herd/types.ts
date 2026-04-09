export type HerdPhase =
    | "waiting"
    | "answering"
    | "reveal"
    | "scored"
    | "game_over";

export interface HerdPlayer {
    id: string;
    name: string;
    score: number;
    hasPinkCow: boolean;
}

export interface AnswerGroup {
    id: string;
    canonicalAnswer: string;
    playerIds: string[];
    originalAnswers: Record<string, string>;
}

export interface RoundResult {
    question: string;
    groups: AnswerGroup[];
    majorityGroupId: string | null;
    majorityCount: number;
    scoringPlayerIds: string[];
    pinkCowPlayerId: string | null;
    pinkCowPreviousHolder: string | null;
}

export interface HerdState {
    players: HerdPlayer[];
    hostId: string;
    phase: HerdPhase;
    roundNumber: number;
    currentQuestion: string | null;
    questionIndex: number;
    shuffledQuestions: string[];
    answers: Record<string, string>;
    answerGroups: AnswerGroup[];
    nextGroupId: number;
    lastRoundResult: RoundResult | null;
    pinkCowEnabled: boolean;
    pinkCowHolder: string | null;
    winnerId: string | null;
    winScore: number;
}

export type HerdAction =
    | { type: "toggle_pink_cow"; hostId: string; enabled: boolean }
    | { type: "next_question"; hostId: string; customQuestion?: string }
    | { type: "submit_answer"; playerId: string; answer: string }
    | { type: "close_answers"; hostId: string }
    | {
          type: "merge_groups";
          hostId: string;
          groupId1: string;
          groupId2: string;
      }
    | { type: "confirm_scoring"; hostId: string }
    | { type: "next_round"; hostId: string };

export type HerdResult =
    | { type: "error"; message: string }
    | { type: "pink_cow_toggled"; enabled: boolean }
    | {
          type: "question_started";
          question: string;
          roundNumber: number;
      }
    | {
          type: "answer_submitted";
          playerId: string;
          answeredCount: number;
          totalPlayers: number;
      }
    | { type: "answers_closed"; groups: AnswerGroup[] }
    | { type: "groups_merged"; groups: AnswerGroup[] }
    | { type: "scoring_confirmed"; result: RoundResult }
    | { type: "round_advanced" }
    | { type: "game_over"; winnerId: string };
