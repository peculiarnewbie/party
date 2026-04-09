import type {
    RpsState,
    RpsChoice,
    BestOf,
    RpsPhase,
} from "./types";

export interface RpsPlayerInfo {
    id: string;
    name: string;
    eliminated: boolean;
}

export interface RpsThrowView {
    player1Choice: RpsChoice;
    player2Choice: RpsChoice;
    winnerId: string | null;
}

export interface RpsMatchView {
    player1: RpsPlayerInfo;
    player2: RpsPlayerInfo;
    player1Wins: number;
    player2Wins: number;
    throws: RpsThrowView[];
    winnerId: string | null;
    status: "active" | "complete";
    myChoice: RpsChoice | null;
    opponentHasThrown: boolean;
    isMyMatch: boolean;
}

export interface RpsRoundView {
    roundNumber: number;
    label: string;
    matches: RpsMatchView[];
    byePlayer: RpsPlayerInfo | null;
}

export interface RpsPlayerView {
    myId: string;
    phase: RpsPhase;
    bestOf: BestOf;
    currentRound: number;
    totalRounds: number;
    rounds: RpsRoundView[];
    winnerId: string | null;
    players: RpsPlayerInfo[];
    myMatch: RpsMatchView | null;
    needsToThrow: boolean;
}

function getPlayerInfo(state: RpsState, playerId: string): RpsPlayerInfo {
    const p = state.players.find((player) => player.id === playerId);
    return p
        ? { id: p.id, name: p.name, eliminated: p.eliminated }
        : { id: playerId, name: "Unknown", eliminated: true };
}

export function getRoundLabel(
    roundNumber: number,
    totalRounds: number,
): string {
    const fromEnd = totalRounds - roundNumber;
    if (fromEnd === 0) return "FINAL";
    if (fromEnd === 1 && totalRounds >= 2) return "SEMIFINAL";
    if (fromEnd === 2 && totalRounds >= 3) return "QUARTERFINAL";
    return `ROUND ${roundNumber}`;
}

export function getPlayerView(
    state: RpsState,
    playerId: string,
): RpsPlayerView {
    const rounds: RpsRoundView[] = state.rounds.map((round) => {
        const matches: RpsMatchView[] = round.matches.map((match) => {
            const isMyMatch =
                match.player1Id === playerId ||
                match.player2Id === playerId;
            const isP1 = match.player1Id === playerId;

            let myChoice: RpsChoice | null = null;
            let opponentHasThrown = false;

            if (isMyMatch && match.status === "active") {
                myChoice = isP1
                    ? match.player1Choice
                    : match.player2Choice;
                opponentHasThrown = isP1
                    ? match.player2Choice !== null
                    : match.player1Choice !== null;
            }

            return {
                player1: getPlayerInfo(state, match.player1Id),
                player2: getPlayerInfo(state, match.player2Id),
                player1Wins: match.player1Wins,
                player2Wins: match.player2Wins,
                throws: match.throws.map((t) => ({
                    player1Choice: t.player1Choice,
                    player2Choice: t.player2Choice,
                    winnerId: t.winnerId,
                })),
                winnerId: match.winnerId,
                status: match.status,
                myChoice,
                opponentHasThrown,
                isMyMatch,
            };
        });

        return {
            roundNumber: round.roundNumber,
            label: getRoundLabel(round.roundNumber, state.totalRounds),
            matches,
            byePlayer: round.byePlayerId
                ? getPlayerInfo(state, round.byePlayerId)
                : null,
        };
    });

    const currentRoundView = rounds.find(
        (r) => r.roundNumber === state.currentRound,
    );

    let myMatch: RpsMatchView | null = null;
    if (currentRoundView) {
        myMatch =
            currentRoundView.matches.find((m) => m.isMyMatch) ?? null;
    }

    const needsToThrow =
        state.phase === "throwing" &&
        myMatch !== null &&
        myMatch.status === "active" &&
        myMatch.myChoice === null;

    return {
        myId: playerId,
        phase: state.phase,
        bestOf: state.bestOf,
        currentRound: state.currentRound,
        totalRounds: state.totalRounds,
        rounds,
        winnerId: state.winnerId,
        players: state.players.map((p) => ({
            id: p.id,
            name: p.name,
            eliminated: p.eliminated,
        })),
        myMatch,
        needsToThrow,
    };
}
