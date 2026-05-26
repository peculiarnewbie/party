export type {
    HerdPhase,
    HerdPlayer,
    AnswerGroup,
    RoundResult,
    HerdState,
    HerdResult,
} from "./schemas";

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
