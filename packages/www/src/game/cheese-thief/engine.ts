import type {
    CheeseThiefState,
    CheeseThiefPlayer,
    CheeseThiefAction,
    CheeseThiefResult,
    VoteResult,
} from "./types";

const THIEF_WAKE_TIME = 3;

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function rollDie(): number {
    return Math.floor(Math.random() * 6) + 1;
}

function buildObservations(
    players: CheeseThiefPlayer[],
): Record<string, string[]> {
    const byTime: Record<number, string[]> = {};
    for (const p of players) {
        if (!byTime[p.dieValue]) byTime[p.dieValue] = [];
        byTime[p.dieValue].push(p.id);
    }

    const observations: Record<string, string[]> = {};
    for (const p of players) {
        const othersAtSameTime = (byTime[p.dieValue] ?? []).filter(
            (id) => id !== p.id,
        );
        observations[p.id] = othersAtSameTime;
    }

    return observations;
}

function assignRoles(
    inputPlayers: { id: string; name: string }[],
    existingScores?: Record<string, number>,
): {
    players: CheeseThiefPlayer[];
    thiefId: string;
    followerIds: string[];
    observations: Record<string, string[]>;
} {
    const shuffled = shuffle(inputPlayers);
    const thiefIndex = 0;
    const thiefId = shuffled[thiefIndex].id;

    const players: CheeseThiefPlayer[] = shuffled.map((p, i) => {
        const isThief = i === thiefIndex;
        const dieValue = isThief ? THIEF_WAKE_TIME : rollDie();
        return {
            id: p.id,
            name: p.name,
            role: isThief ? "thief" : "sleepyhead",
            dieValue,
            isFollower: false,
            score: existingScores?.[p.id] ?? 0,
        };
    });

    const followerIds: string[] = [];
    for (const p of players) {
        if (p.role === "sleepyhead" && p.dieValue === THIEF_WAKE_TIME) {
            p.isFollower = true;
            followerIds.push(p.id);
        }
    }

    const observations = buildObservations(players);

    return { players, thiefId, followerIds, observations };
}

export function initGame(
    inputPlayers: { id: string; name: string }[],
    hostId: string,
): CheeseThiefState {
    const { players, thiefId, followerIds, observations } =
        assignRoles(inputPlayers);

    return {
        players,
        hostId,
        phase: "night",
        thiefId,
        followerIds,
        observations,
        votes: {},
        voteResult: null,
        round: 1,
    };
}

function computeVoteResult(state: CheeseThiefState): VoteResult {
    const voteCounts: Record<string, number> = {};
    for (const p of state.players) {
        voteCounts[p.id] = 0;
    }
    for (const targetId of Object.values(state.votes)) {
        voteCounts[targetId] = (voteCounts[targetId] ?? 0) + 1;
    }

    let maxVotes = 0;
    for (const count of Object.values(voteCounts)) {
        if (count > maxVotes) maxVotes = count;
    }

    const mostVotedIds = Object.entries(voteCounts)
        .filter(([, count]) => count === maxVotes)
        .map(([id]) => id);

    const thiefCaught = mostVotedIds.includes(state.thiefId);
    const winningTeam = thiefCaught ? "sleepyheads" : "thief";

    return {
        votes: { ...state.votes },
        voteCounts,
        mostVotedIds,
        thiefCaught,
        winningTeam,
        thiefId: state.thiefId,
        followerIds: [...state.followerIds],
    };
}

export function processAction(
    state: CheeseThiefState,
    action: CheeseThiefAction,
): CheeseThiefResult {
    if (action.type === "start_day") {
        if (state.phase !== "night") {
            return { type: "error", message: "Can only start day from night phase" };
        }
        if (action.hostId !== state.hostId) {
            return { type: "error", message: "Only the host can advance phases" };
        }
        state.phase = "day";
        return { type: "day_started" };
    }

    if (action.type === "start_voting") {
        if (state.phase !== "day") {
            return {
                type: "error",
                message: "Can only start voting from day phase",
            };
        }
        if (action.hostId !== state.hostId) {
            return { type: "error", message: "Only the host can advance phases" };
        }
        state.phase = "voting";
        state.votes = {};
        return { type: "voting_started" };
    }

    if (action.type === "cast_vote") {
        if (state.phase !== "voting") {
            return { type: "error", message: "Voting is not open" };
        }
        const voter = state.players.find((p) => p.id === action.playerId);
        if (!voter) {
            return { type: "error", message: "Player not in game" };
        }
        if (action.targetId === action.playerId) {
            return { type: "error", message: "Cannot vote for yourself" };
        }
        const target = state.players.find((p) => p.id === action.targetId);
        if (!target) {
            return { type: "error", message: "Target not in game" };
        }

        state.votes[action.playerId] = action.targetId;

        const votedCount = Object.keys(state.votes).length;
        const totalVoters = state.players.length;

        return {
            type: "vote_cast",
            playerId: action.playerId,
            votedCount,
            totalVoters,
        };
    }

    if (action.type === "reveal_votes") {
        if (state.phase !== "voting") {
            return { type: "error", message: "Not in voting phase" };
        }
        if (action.hostId !== state.hostId) {
            return { type: "error", message: "Only the host can reveal votes" };
        }

        const result = computeVoteResult(state);
        state.voteResult = result;
        state.phase = "reveal";

        if (result.winningTeam === "sleepyheads") {
            for (const p of state.players) {
                if (p.role === "sleepyhead" && !p.isFollower) {
                    p.score += 1;
                }
            }
        } else {
            const thief = state.players.find((p) => p.id === state.thiefId);
            if (thief) thief.score += 2;
            for (const fId of state.followerIds) {
                const follower = state.players.find((p) => p.id === fId);
                if (follower) follower.score += 1;
            }
        }

        return { type: "votes_revealed", result };
    }

    if (action.type === "next_round") {
        if (state.phase !== "reveal") {
            return { type: "error", message: "Can only start next round from reveal" };
        }
        if (action.hostId !== state.hostId) {
            return { type: "error", message: "Only the host can start next round" };
        }

        const existingScores: Record<string, number> = {};
        for (const p of state.players) {
            existingScores[p.id] = p.score;
        }

        const inputPlayers = state.players.map((p) => ({
            id: p.id,
            name: p.name,
        }));
        const { players, thiefId, followerIds, observations } = assignRoles(
            inputPlayers,
            existingScores,
        );

        state.players = players;
        state.thiefId = thiefId;
        state.followerIds = followerIds;
        state.observations = observations;
        state.votes = {};
        state.voteResult = null;
        state.phase = "night";
        state.round += 1;

        return { type: "round_started", round: state.round };
    }

    return { type: "error", message: "Unknown action" };
}

export function removePlayer(
    state: CheeseThiefState,
    playerId: string,
): CheeseThiefResult | null {
    const idx = state.players.findIndex((p) => p.id === playerId);
    if (idx < 0) return null;

    state.players.splice(idx, 1);
    delete state.observations[playerId];
    delete state.votes[playerId];

    state.followerIds = state.followerIds.filter((id) => id !== playerId);

    if (state.players.length < 2) {
        state.phase = "reveal";
        if (!state.voteResult) {
            state.voteResult = computeVoteResult(state);
        }
    }

    return null;
}

export function endGameByHost(state: CheeseThiefState): CheeseThiefResult {
    if (!state.voteResult) {
        state.voteResult = computeVoteResult(state);
    }
    state.phase = "reveal";
    return { type: "votes_revealed", result: state.voteResult };
}
