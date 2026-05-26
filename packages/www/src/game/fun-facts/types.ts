export type {
    FunFactsPhase,
    FunFactsPlayer,
    FunFactsRoundResult,
    FunFactsState,
    FunFactsResult,
} from "./schemas";

export type FunFactsAction =
    | { type: "next_question"; hostId: string; customQuestion?: string }
    | { type: "submit_answer"; playerId: string; answer: number }
    | { type: "close_answers"; hostId: string }
    | { type: "place_arrow"; playerId: string; position: number }
    | { type: "next_round"; hostId: string };
