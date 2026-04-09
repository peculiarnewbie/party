import type {
    RpsState,
    RpsPlayer,
    RpsAction,
    RpsResult,
    RpsChoice,
    RpsMatch,
    RpsRound,
    RpsThrow,
    BestOf,
} from "./types";

export function resolveThrow(
    p1: RpsChoice,
    p2: RpsChoice,
): "p1" | "p2" | "draw" {
    if (p1 === p2) return "draw";
    if (
        (p1 === "rock" && p2 === "scissors") ||
        (p1 === "scissors" && p2 === "paper") ||
        (p1 === "paper" && p2 === "rock")
    ) {
        return "p1";
    }
    return "p2";
}

export function winsNeeded(bestOf: BestOf): number {
    return Math.ceil(bestOf / 2);
}

function createRound(
    playerIds: string[],
    roundNumber: number,
): RpsRound {
    const matches: RpsMatch[] = [];
    let byePlayerId: string | null = null;

    const ids = [...playerIds];

    if (ids.length % 2 !== 0) {
        byePlayerId = ids.pop()!;
    }

    for (let i = 0; i < ids.length; i += 2) {
        matches.push({
            player1Id: ids[i],
            player2Id: ids[i + 1],
            throws: [],
            player1Wins: 0,
            player2Wins: 0,
            player1Choice: null,
            player2Choice: null,
            winnerId: null,
            status: "active",
        });
    }

    return { roundNumber, matches, byePlayerId };
}

function shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export function initGame(
    players: { id: string; name: string }[],
    bestOf: BestOf = 3,
): RpsState {
    const rpsPlayers: RpsPlayer[] = players.map((p) => ({
        id: p.id,
        name: p.name,
        eliminated: false,
    }));

    if (players.length <= 1) {
        return {
            players: rpsPlayers,
            bestOf,
            rounds: [],
            currentRound: 0,
            phase: "tournament_over",
            winnerId: players[0]?.id ?? null,
            totalRounds: 0,
        };
    }

    const shuffledIds = shuffle(rpsPlayers.map((p) => p.id));
    const round = createRound(shuffledIds, 1);
    const totalRounds = Math.ceil(Math.log2(players.length));

    return {
        players: rpsPlayers,
        bestOf,
        rounds: [round],
        currentRound: 1,
        phase: "throwing",
        winnerId: null,
        totalRounds,
    };
}

function getCurrentRound(state: RpsState): RpsRound | null {
    return (
        state.rounds.find((r) => r.roundNumber === state.currentRound) ?? null
    );
}

function checkRoundComplete(state: RpsState): boolean {
    const round = getCurrentRound(state);
    if (!round) return false;
    return round.matches.every((m) => m.status === "complete");
}

function collectRoundWinners(round: RpsRound): string[] {
    const winnerIds: string[] = [];
    for (const match of round.matches) {
        if (match.winnerId) winnerIds.push(match.winnerId);
    }
    if (round.byePlayerId) winnerIds.push(round.byePlayerId);
    return winnerIds;
}

function advanceToNextRound(state: RpsState): RpsResult {
    const round = getCurrentRound(state);
    if (!round) return { type: "error", message: "No current round" };

    const winnerIds = collectRoundWinners(round);

    for (const player of state.players) {
        if (!winnerIds.includes(player.id)) {
            player.eliminated = true;
        }
    }

    if (winnerIds.length <= 1) {
        state.phase = "tournament_over";
        state.winnerId = winnerIds[0] ?? null;
        return { type: "tournament_over", winnerId: state.winnerId ?? "" };
    }

    const shuffled = shuffle(winnerIds);
    const nextRound = createRound(shuffled, state.currentRound + 1);
    state.rounds.push(nextRound);
    state.currentRound++;
    state.phase = "throwing";

    return { type: "round_advanced", roundNumber: state.currentRound };
}

export function processAction(
    state: RpsState,
    action: RpsAction,
): RpsResult {
    if (action.type === "set_best_of") {
        state.bestOf = action.bestOf;
        return { type: "best_of_changed", bestOf: action.bestOf };
    }

    if (state.phase === "tournament_over") {
        return { type: "error", message: "Tournament is over" };
    }

    if (action.type === "throw") {
        if (state.phase !== "throwing") {
            return { type: "error", message: "Not in throwing phase" };
        }

        const round = getCurrentRound(state);
        if (!round) {
            return { type: "error", message: "No current round" };
        }

        const match = round.matches.find(
            (m) =>
                m.status === "active" &&
                (m.player1Id === action.playerId ||
                    m.player2Id === action.playerId),
        );

        if (!match) {
            return {
                type: "error",
                message: "No active match for this player",
            };
        }

        const isPlayer1 = match.player1Id === action.playerId;

        if (isPlayer1) {
            if (match.player1Choice) {
                return { type: "error", message: "Already thrown" };
            }
            match.player1Choice = action.choice;
        } else {
            if (match.player2Choice) {
                return { type: "error", message: "Already thrown" };
            }
            match.player2Choice = action.choice;
        }

        if (match.player1Choice && match.player2Choice) {
            const result = resolveThrow(
                match.player1Choice,
                match.player2Choice,
            );

            const throwRecord: RpsThrow = {
                player1Choice: match.player1Choice,
                player2Choice: match.player2Choice,
                winnerId:
                    result === "p1"
                        ? match.player1Id
                        : result === "p2"
                          ? match.player2Id
                          : null,
            };
            match.throws.push(throwRecord);

            if (result === "p1") match.player1Wins++;
            if (result === "p2") match.player2Wins++;

            match.player1Choice = null;
            match.player2Choice = null;

            const needed = winsNeeded(state.bestOf);
            if (match.player1Wins >= needed) {
                match.winnerId = match.player1Id;
                match.status = "complete";
            } else if (match.player2Wins >= needed) {
                match.winnerId = match.player2Id;
                match.status = "complete";
            }

            if (checkRoundComplete(state)) {
                const winnerIds = collectRoundWinners(round);

                if (winnerIds.length <= 1) {
                    state.phase = "tournament_over";
                    state.winnerId = winnerIds[0] ?? null;
                    for (const player of state.players) {
                        if (player.id !== state.winnerId)
                            player.eliminated = true;
                    }
                    return {
                        type: "tournament_over",
                        winnerId: state.winnerId ?? "",
                    };
                }

                state.phase = "round_results";
            }

            return {
                type: "throw_registered",
                playerId: action.playerId,
                matchComplete: match.status === "complete",
                bothThrown: true,
            };
        }

        return {
            type: "throw_registered",
            playerId: action.playerId,
            matchComplete: false,
            bothThrown: false,
        };
    }

    if (action.type === "next_round") {
        if (state.phase !== "round_results") {
            return { type: "error", message: "Not in round results phase" };
        }

        return advanceToNextRound(state);
    }

    return { type: "error", message: "Unknown action" };
}

export function removePlayer(
    state: RpsState,
    playerId: string,
): RpsResult | null {
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.eliminated) return null;

    player.eliminated = true;

    const round = getCurrentRound(state);
    if (round) {
        for (const match of round.matches) {
            if (match.status !== "active") continue;
            if (match.player1Id === playerId) {
                match.winnerId = match.player2Id;
                match.status = "complete";
            } else if (match.player2Id === playerId) {
                match.winnerId = match.player1Id;
                match.status = "complete";
            }
        }

        if (round.byePlayerId === playerId) {
            round.byePlayerId = null;
        }
    }

    const active = state.players.filter((p) => !p.eliminated);

    if (active.length <= 1) {
        state.phase = "tournament_over";
        state.winnerId = active[0]?.id ?? null;
        return {
            type: "tournament_over",
            winnerId: state.winnerId ?? "",
        };
    }

    if (
        state.phase === "throwing" &&
        round &&
        checkRoundComplete(state)
    ) {
        const winnerIds = collectRoundWinners(round);

        if (winnerIds.length <= 1) {
            state.phase = "tournament_over";
            state.winnerId = winnerIds[0] ?? null;
            return {
                type: "tournament_over",
                winnerId: state.winnerId ?? "",
            };
        }

        state.phase = "round_results";
    }

    return null;
}

export function endGameByHost(state: RpsState): RpsResult {
    state.phase = "tournament_over";
    const active = state.players.filter((p) => !p.eliminated);
    if (active.length === 1) {
        state.winnerId = active[0].id;
    }
    return { type: "tournament_over", winnerId: state.winnerId ?? "" };
}
