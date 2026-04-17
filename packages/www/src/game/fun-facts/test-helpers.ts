import type { FunFactsPhase, FunFactsRoundResult } from "./types";
import type {
    FunFactsPlayerInfo,
    FunFactsPlayerView,
    PlacedArrowView,
} from "./views";

export function makePlayerInfo(
    overrides: Partial<FunFactsPlayerInfo> = {},
): FunFactsPlayerInfo {
    return {
        id: "p1",
        name: "Alice",
        ...overrides,
    };
}

export function makePlacedArrow(
    overrides: Partial<PlacedArrowView> = {},
): PlacedArrowView {
    return {
        playerId: "p1",
        playerName: "Alice",
        answer: null,
        ...overrides,
    };
}

export function makeView(
    overrides: Partial<FunFactsPlayerView> = {},
): FunFactsPlayerView {
    const players = overrides.players ?? [
        makePlayerInfo({ id: "p1", name: "Alice" }),
        makePlayerInfo({ id: "p2", name: "Bob" }),
    ];
    const totalRounds = overrides.totalRounds ?? 3;
    return {
        myId: "p1",
        isHost: false,
        phase: "waiting" as FunFactsPhase,
        roundNumber: 0,
        totalRounds,
        currentQuestion: null,
        players,
        myAnswer: null,
        hasAnswered: false,
        answeredCount: 0,
        totalPlayers: players.length,
        placingOrder: [],
        currentPlacerId: null,
        isMyTurn: false,
        placedArrows: [],
        teamScore: 0,
        roundScores: [],
        lastRoundResult: null as FunFactsRoundResult | null,
        maxScore: totalRounds * players.length,
        ...overrides,
    };
}
