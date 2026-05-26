import type { RpsChoice, RpsPlayerView } from "./schemas";
import type { RpsState } from "./types";

export type {
    RpsPlayerInfo,
    RpsThrowView,
    RpsMatchView,
    RpsRoundView,
    RpsPlayerView,
} from "./schemas";

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

function getPlayerInfo(
    state: RpsState,
    playerId: string,
): RpsPlayerView["players"][number] {
    const player = state.players.find((item) => item.id === playerId);
    return player
        ? { id: player.id, name: player.name, eliminated: player.eliminated }
        : { id: playerId, name: "Unknown", eliminated: true };
}

export function getPlayerView(
    state: RpsState,
    playerId: string,
): RpsPlayerView {
    const rounds: RpsPlayerView["rounds"] = state.rounds.map((round) => {
        const matches: RpsPlayerView["rounds"][number]["matches"] =
            round.matches.map((match) => {
                const isMyMatch =
                    match.player1Id === playerId ||
                    match.player2Id === playerId;
                const isP1 = match.player1Id === playerId;

                let myChoice: RpsChoice | null = null;
                let opponentHasThrown = false;

                if (isMyMatch && match.status === "active") {
                    myChoice = isP1 ? match.player1Choice : match.player2Choice;
                    opponentHasThrown = isP1
                        ? match.player2Choice !== null
                        : match.player1Choice !== null;
                }

                return {
                    player1: getPlayerInfo(state, match.player1Id),
                    player2: getPlayerInfo(state, match.player2Id),
                    player1Wins: match.player1Wins,
                    player2Wins: match.player2Wins,
                    throws: match.throws.map((item) => ({
                        player1Choice: item.player1Choice,
                        player2Choice: item.player2Choice,
                        winnerId: item.winnerId,
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
        (round) => round.roundNumber === state.currentRound,
    );

    const myMatch = currentRoundView?.matches.find((match) => match.isMyMatch) ?? null;

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
        players: state.players.map((player) => ({
            id: player.id,
            name: player.name,
            eliminated: player.eliminated,
        })),
        myMatch,
        needsToThrow,
    };
}
