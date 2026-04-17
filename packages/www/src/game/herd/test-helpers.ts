import type { HerdPhase, RoundResult } from "./types";
import type {
    AnswerGroupView,
    HerdPlayerInfo,
    HerdPlayerView,
} from "./views";

export function makePlayerInfo(
    overrides: Partial<HerdPlayerInfo> = {},
): HerdPlayerInfo {
    return {
        id: "p1",
        name: "Alice",
        score: 0,
        hasPinkCow: false,
        ...overrides,
    };
}

export function makeAnswerGroup(
    overrides: Partial<AnswerGroupView> = {},
): AnswerGroupView {
    return {
        id: "g1",
        canonicalAnswer: "cat",
        count: 1,
        playerNames: ["Alice"],
        playerIds: ["p1"],
        ...overrides,
    };
}

export function makeView(
    overrides: Partial<HerdPlayerView> = {},
): HerdPlayerView {
    const players = overrides.players ?? [
        makePlayerInfo({ id: "p1", name: "Alice" }),
        makePlayerInfo({ id: "p2", name: "Bob" }),
    ];
    return {
        myId: "p1",
        isHost: false,
        phase: "waiting" as HerdPhase,
        roundNumber: 0,
        currentQuestion: null,
        players,
        pinkCowEnabled: false,
        pinkCowHolderId: null,
        winnerId: null,
        winScore: 5,
        myAnswer: null,
        hasAnswered: false,
        answeredCount: 0,
        totalPlayers: players.length,
        answerGroups: [],
        lastRoundResult: null as RoundResult | null,
        leaderboard: [...players].sort((a, b) => b.score - a.score),
        ...overrides,
    };
}
