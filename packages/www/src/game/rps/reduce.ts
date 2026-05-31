import type { RpsState, RpsThrow } from "./types";
import type { RpsEvent } from "./events";
import { getCurrentRound, collectRoundWinners, shuffle, createRound, winsNeeded, checkRoundComplete } from "./mechanics";

export function reduce(state: RpsState, event: RpsEvent): RpsState {
    switch (event.type) {
        case "best_of_changed":
            return { ...state, bestOf: event.bestOf };

        case "throw_registered":
            return state;

        case "throw_revealed":
            return applyThrowRevealed(state, event);

        case "match_completed":
            return applyMatchCompleted(state, event);

        case "round_advanced":
            return applyRoundAdvanced(state, event);

        case "tournament_over":
            return { ...state, phase: "tournament_over", winnerId: event.winnerId };
    }
}

function applyThrowRevealed(
    state: RpsState,
    event: { matchIndex: number; player1Choice: string; player2Choice: string; winnerId: string | null },
): RpsState {
    const round = getCurrentRound(state);
    if (!round) return state;

    const match = round.matches[event.matchIndex];
    if (!match) return state;

    const throwRecord: RpsThrow = {
        player1Choice: event.player1Choice as RpsThrow["player1Choice"],
        player2Choice: event.player2Choice as RpsThrow["player2Choice"],
        winnerId: event.winnerId,
    };

    const newThrows = [...match.throws, throwRecord];
    let player1Wins = match.player1Wins;
    let player2Wins = match.player2Wins;

    if (event.winnerId === match.player1Id) player1Wins++;
    if (event.winnerId === match.player2Id) player2Wins++;

    const newMatch = {
        ...match,
        throws: newThrows,
        player1Wins,
        player2Wins,
        player1Choice: null,
        player2Choice: null,
    };

    const newMatches = [...round.matches];
    newMatches[event.matchIndex] = newMatch;

    const newRound = { ...round, matches: newMatches };
    const newRounds = state.rounds.map((r) =>
        r.roundNumber === state.currentRound ? newRound : r,
    );

    return { ...state, rounds: newRounds };
}

function applyMatchCompleted(
    state: RpsState,
    event: { matchIndex: number; winnerId: string },
): RpsState {
    const round = getCurrentRound(state);
    if (!round) return state;

    const match = round.matches[event.matchIndex];
    if (!match) return state;

    const newMatch = {
        ...match,
        winnerId: event.winnerId,
        status: "complete" as const,
    };

    const newMatches = [...round.matches];
    newMatches[event.matchIndex] = newMatch;

    const newRound = { ...round, matches: newMatches };
    const newRounds = state.rounds.map((r) =>
        r.roundNumber === state.currentRound ? newRound : r,
    );

    return { ...state, rounds: newRounds };
}

function applyRoundAdvanced(
    state: RpsState,
    event: { roundNumber: number },
): RpsState {
    const round = getCurrentRound(state);
    if (!round) return state;

    const winnerIds = collectRoundWinners(round);

    const newPlayers = state.players.map((p) => ({
        ...p,
        eliminated: !winnerIds.includes(p.id),
    }));

    const shuffled = shuffle(winnerIds);
    const nextRound = createRound(shuffled, event.roundNumber);
    const newRounds = [...state.rounds, nextRound];

    return {
        ...state,
        players: newPlayers,
        rounds: newRounds,
        currentRound: event.roundNumber,
        phase: "throwing",
    };
}
