import type {
    BestOf,
    RpsChoice,
    RpsPhase,
} from "./types";
import type {
    RpsMatchView,
    RpsPlayerInfo,
    RpsPlayerView,
    RpsRoundView,
    RpsThrowView,
} from "./views";

export function makePlayerInfo(
    overrides: Partial<RpsPlayerInfo> = {},
): RpsPlayerInfo {
    return {
        id: "p1",
        name: "Alice",
        eliminated: false,
        ...overrides,
    };
}

export function makeThrow(overrides: Partial<RpsThrowView> = {}): RpsThrowView {
    return {
        player1Choice: "rock" as RpsChoice,
        player2Choice: "scissors" as RpsChoice,
        winnerId: "p1",
        ...overrides,
    };
}

export function makeMatch(overrides: Partial<RpsMatchView> = {}): RpsMatchView {
    return {
        player1: makePlayerInfo({ id: "p1", name: "Alice" }),
        player2: makePlayerInfo({ id: "p2", name: "Bob" }),
        player1Wins: 0,
        player2Wins: 0,
        throws: [],
        winnerId: null,
        status: "active",
        myChoice: null,
        opponentHasThrown: false,
        isMyMatch: true,
        ...overrides,
    };
}

export function makeRound(overrides: Partial<RpsRoundView> = {}): RpsRoundView {
    return {
        roundNumber: 1,
        label: "FINAL",
        matches: [makeMatch()],
        byePlayer: null,
        ...overrides,
    };
}

export function makeView(overrides: Partial<RpsPlayerView> = {}): RpsPlayerView {
    const round = overrides.rounds?.[0] ?? makeRound();
    const myMatch = overrides.myMatch ?? round.matches[0] ?? null;
    return {
        myId: "p1",
        phase: "throwing" as RpsPhase,
        bestOf: 3 as BestOf,
        currentRound: 1,
        totalRounds: 1,
        rounds: [round],
        winnerId: null,
        players: [
            makePlayerInfo({ id: "p1", name: "Alice" }),
            makePlayerInfo({ id: "p2", name: "Bob" }),
        ],
        myMatch,
        needsToThrow: true,
        ...overrides,
    };
}
