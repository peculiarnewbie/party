export type CheeseThiefPhase = "night" | "day" | "voting" | "reveal";

export type PlayerRole = "thief" | "sleepyhead";

export interface CheeseThiefPlayer {
    id: string;
    name: string;
    role: PlayerRole;
    dieValue: number;
    isFollower: boolean;
    score: number;
}

export interface VoteResult {
    votes: Record<string, string>;
    voteCounts: Record<string, number>;
    mostVotedIds: string[];
    thiefCaught: boolean;
    winningTeam: "thief" | "sleepyheads";
    thiefId: string;
    followerIds: string[];
}

export interface CheeseThiefState {
    players: CheeseThiefPlayer[];
    hostId: string;
    phase: CheeseThiefPhase;
    thiefId: string;
    followerIds: string[];
    observations: Record<string, string[]>;
    votes: Record<string, string>;
    voteResult: VoteResult | null;
    round: number;
}

export type CheeseThiefAction =
    | { type: "start_day"; hostId: string }
    | { type: "start_voting"; hostId: string }
    | { type: "cast_vote"; playerId: string; targetId: string }
    | { type: "reveal_votes"; hostId: string }
    | { type: "next_round"; hostId: string };

export type CheeseThiefResult =
    | { type: "error"; message: string }
    | { type: "day_started" }
    | { type: "voting_started" }
    | { type: "vote_cast"; playerId: string; votedCount: number; totalVoters: number }
    | { type: "votes_revealed"; result: VoteResult }
    | { type: "round_started"; round: number };
