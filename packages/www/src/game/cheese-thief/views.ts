import type { CheeseThiefState, CheeseThiefPhase, VoteResult } from "./types";

export interface CheeseThiefPlayerInfo {
    id: string;
    name: string;
    score: number;
}

export interface CheeseThiefPlayerView {
    myId: string;
    isHost: boolean;
    phase: CheeseThiefPhase;
    round: number;
    players: CheeseThiefPlayerInfo[];
    myRole: "thief" | "sleepyhead";
    myDieValue: number;
    isFollower: boolean;
    observedPlayerNames: string[];
    observedPlayerIds: string[];
    myVote: string | null;
    votedCount: number;
    totalVoters: number;
    hasVoted: boolean;
    voteResult: VoteResult | null;
    thiefName: string | null;
    followerNames: string[];
    leaderboard: CheeseThiefPlayerInfo[];
}

export function getPlayerView(
    state: CheeseThiefState,
    playerId: string,
): CheeseThiefPlayerView {
    const isHost = playerId === state.hostId;
    const me = state.players.find((p) => p.id === playerId);

    const myRole = me?.role ?? "sleepyhead";
    const myDieValue = me?.dieValue ?? 0;
    const isFollower = me?.isFollower ?? false;

    const observedIds = state.observations[playerId] ?? [];
    const observedPlayerNames = observedIds.map((id) => {
        const p = state.players.find((pl) => pl.id === id);
        return p?.name ?? "Unknown";
    });

    const myVote = state.votes[playerId] ?? null;
    const hasVoted = playerId in state.votes;
    const votedCount = Object.keys(state.votes).length;
    const totalVoters = state.players.length;

    const isReveal = state.phase === "reveal";

    const thief = state.players.find((p) => p.id === state.thiefId);
    const thiefName = isReveal ? (thief?.name ?? null) : null;
    const followerNames = isReveal
        ? state.followerIds.map((id) => {
              const p = state.players.find((pl) => pl.id === id);
              return p?.name ?? "Unknown";
          })
        : [];

    const leaderboard = state.players
        .map((p) => ({ id: p.id, name: p.name, score: p.score }))
        .sort((a, b) => b.score - a.score);

    return {
        myId: playerId,
        isHost,
        phase: state.phase,
        round: state.round,
        players: state.players.map((p) => ({
            id: p.id,
            name: p.name,
            score: p.score,
        })),
        myRole,
        myDieValue,
        isFollower,
        observedPlayerNames,
        observedPlayerIds: observedIds,
        myVote,
        votedCount,
        totalVoters,
        hasVoted,
        voteResult: isReveal ? state.voteResult : null,
        thiefName,
        followerNames,
        leaderboard,
    };
}
