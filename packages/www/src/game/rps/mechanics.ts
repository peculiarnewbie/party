import type {
    RpsState,
    RpsPlayer,
    RpsChoice,
    RpsMatch,
    RpsRound,
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

export function createRound(
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

export function shuffle<T>(arr: T[]): T[] {
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

export function getCurrentRound(state: RpsState): RpsRound | null {
    return (
        state.rounds.find((r) => r.roundNumber === state.currentRound) ?? null
    );
}

export function checkRoundComplete(state: RpsState): boolean {
    const round = getCurrentRound(state);
    if (!round) return false;
    return round.matches.every((m) => m.status === "complete");
}

export function collectRoundWinners(round: RpsRound): string[] {
    const winnerIds: string[] = [];
    for (const match of round.matches) {
        if (match.winnerId) winnerIds.push(match.winnerId);
    }
    if (round.byePlayerId) winnerIds.push(round.byePlayerId);
    return winnerIds;
}

export function findActiveMatch(
    round: RpsRound,
    playerId: string,
): RpsMatch | null {
    return (
        round.matches.find(
            (m) =>
                m.status === "active" &&
                (m.player1Id === playerId || m.player2Id === playerId),
        ) ?? null
    );
}

export function getPlayerMatchPosition(
    match: RpsMatch,
    playerId: string,
): "p1" | "p2" | null {
    if (match.player1Id === playerId) return "p1";
    if (match.player2Id === playerId) return "p2";
    return null;
}

export function getActivePlayers(state: RpsState): RpsPlayer[] {
    return state.players.filter((p) => !p.eliminated);
}

export type ThrowValidationError =
    | { type: "not_in_throwing_phase" }
    | { type: "no_current_round" }
    | { type: "no_active_match" }
    | { type: "already_thrown" };

export function validateThrow(
    state: RpsState,
    playerId: string,
): { ok: true; match: RpsMatch; position: "p1" | "p2" } | { ok: false; error: ThrowValidationError } {
    if (state.phase !== "throwing") {
        return { ok: false, error: { type: "not_in_throwing_phase" } };
    }

    const round = getCurrentRound(state);
    if (!round) {
        return { ok: false, error: { type: "no_current_round" } };
    }

    const match = findActiveMatch(round, playerId);
    if (!match) {
        return { ok: false, error: { type: "no_active_match" } };
    }

    const position = getPlayerMatchPosition(match, playerId)!;
    const alreadyThrown =
        position === "p1" ? match.player1Choice !== null : match.player2Choice !== null;
    if (alreadyThrown) {
        return { ok: false, error: { type: "already_thrown" } };
    }

    return { ok: true, match, position };
}

export type NextRoundValidationError =
    | { type: "not_in_round_results" };

export function validateNextRound(
    state: RpsState,
): { ok: true } | { ok: false; error: NextRoundValidationError } {
    if (state.phase !== "round_results") {
        return { ok: false, error: { type: "not_in_round_results" } };
    }
    return { ok: true };
}
