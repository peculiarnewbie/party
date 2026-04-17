import type { CheeseThiefPhase, VoteResult } from "./types";
import type {
    CheeseThiefPlayerInfo,
    CheeseThiefPlayerView,
} from "./views";

export function makePlayerInfo(
    overrides: Partial<CheeseThiefPlayerInfo> = {},
): CheeseThiefPlayerInfo {
    return {
        id: "p1",
        name: "Alice",
        score: 0,
        ...overrides,
    };
}

export function makeVoteResult(
    overrides: Partial<VoteResult> = {},
): VoteResult {
    return {
        votes: { p1: "p2", p2: "p2", p3: "p1" },
        voteCounts: { p1: 1, p2: 2 },
        mostVotedIds: ["p2"],
        thiefCaught: true,
        winningTeam: "sleepyheads",
        thiefId: "p2",
        followerIds: [],
        ...overrides,
    };
}

export function makeView(
    overrides: Partial<CheeseThiefPlayerView> = {},
): CheeseThiefPlayerView {
    const players = overrides.players ?? [
        makePlayerInfo({ id: "p1", name: "Alice" }),
        makePlayerInfo({ id: "p2", name: "Bob" }),
        makePlayerInfo({ id: "p3", name: "Carol" }),
    ];
    return {
        myId: "p1",
        isHost: false,
        phase: "night" as CheeseThiefPhase,
        round: 1,
        players,
        myRole: "sleepyhead",
        myDieValue: 3,
        isFollower: false,
        observedPlayerNames: ["Bob"],
        observedPlayerIds: ["p2"],
        myVote: null,
        votedCount: 0,
        totalVoters: players.length,
        hasVoted: false,
        voteResult: null as VoteResult | null,
        thiefName: null,
        followerNames: [],
        leaderboard: [...players].sort((a, b) => b.score - a.score),
        ...overrides,
    };
}
