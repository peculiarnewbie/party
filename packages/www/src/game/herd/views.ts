import type {
    HerdState,
    HerdPhase,
    AnswerGroup,
    RoundResult,
} from "./types";

export interface HerdPlayerInfo {
    id: string;
    name: string;
    score: number;
    hasPinkCow: boolean;
}

export interface AnswerGroupView {
    id: string;
    canonicalAnswer: string;
    count: number;
    playerNames: string[];
    playerIds: string[];
}

export interface HerdPlayerView {
    myId: string;
    isHost: boolean;
    phase: HerdPhase;
    roundNumber: number;
    currentQuestion: string | null;
    players: HerdPlayerInfo[];
    pinkCowEnabled: boolean;
    pinkCowHolderId: string | null;
    winnerId: string | null;
    winScore: number;
    myAnswer: string | null;
    hasAnswered: boolean;
    answeredCount: number;
    totalPlayers: number;
    answerGroups: AnswerGroupView[];
    lastRoundResult: RoundResult | null;
    leaderboard: HerdPlayerInfo[];
}

function toPlayerInfo(state: HerdState, playerId: string): HerdPlayerInfo {
    const p = state.players.find((player) => player.id === playerId);
    return p
        ? { id: p.id, name: p.name, score: p.score, hasPinkCow: p.hasPinkCow }
        : { id: playerId, name: "Unknown", score: 0, hasPinkCow: false };
}

function toGroupView(group: AnswerGroup, state: HerdState): AnswerGroupView {
    return {
        id: group.id,
        canonicalAnswer: group.canonicalAnswer,
        count: group.playerIds.length,
        playerNames: group.playerIds.map((id) => {
            const p = state.players.find((player) => player.id === id);
            return p?.name ?? "Unknown";
        }),
        playerIds: [...group.playerIds],
    };
}

export function getPlayerView(
    state: HerdState,
    playerId: string,
): HerdPlayerView {
    const isHost = playerId === state.hostId;
    const answeredCount = Object.keys(state.answers).length;

    let myAnswer: string | null = null;
    let hasAnswered = false;
    if (!isHost && state.answers[playerId] !== undefined) {
        myAnswer = state.answers[playerId];
        hasAnswered = true;
    }

    let answerGroups: AnswerGroupView[] = [];
    if (
        state.phase === "reveal" ||
        state.phase === "scored" ||
        state.phase === "game_over"
    ) {
        answerGroups = state.answerGroups.map((g) => toGroupView(g, state));
    }

    const leaderboard = state.players
        .map((p) => ({
            id: p.id,
            name: p.name,
            score: p.score,
            hasPinkCow: p.hasPinkCow,
        }))
        .sort((a, b) => b.score - a.score);

    return {
        myId: playerId,
        isHost,
        phase: state.phase,
        roundNumber: state.roundNumber,
        currentQuestion: state.currentQuestion,
        players: state.players.map((p) => ({
            id: p.id,
            name: p.name,
            score: p.score,
            hasPinkCow: p.hasPinkCow,
        })),
        pinkCowEnabled: state.pinkCowEnabled,
        pinkCowHolderId: state.pinkCowHolder,
        winnerId: state.winnerId,
        winScore: state.winScore,
        myAnswer,
        hasAnswered,
        answeredCount,
        totalPlayers: state.players.length,
        answerGroups,
        lastRoundResult: state.lastRoundResult,
        leaderboard,
    };
}
