export type {
    CheeseThiefPhase,
    CheeseThiefPlayer,
    CheeseThiefState,
    PlayerRole,
    VoteResult,
} from "./schemas";

export type CheeseThiefAction =
    | { type: "start_day"; hostId: string }
    | { type: "start_voting"; hostId: string }
    | { type: "cast_vote"; playerId: string; targetId: string }
    | { type: "reveal_votes"; hostId: string }
    | { type: "next_round"; hostId: string };

export type { CheeseThiefResult } from "./schemas";
