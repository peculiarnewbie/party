import type {
    FunFactsState,
    FunFactsPhase,
    FunFactsRoundResult,
} from "./types";

export interface FunFactsPlayerInfo {
    id: string;
    name: string;
}

export interface PlacedArrowView {
    playerId: string;
    playerName: string;
    answer: number | null;
}

export interface FunFactsPlayerView {
    myId: string;
    isHost: boolean;
    phase: FunFactsPhase;
    roundNumber: number;
    totalRounds: number;
    currentQuestion: string | null;
    players: FunFactsPlayerInfo[];
    myAnswer: number | null;
    hasAnswered: boolean;
    answeredCount: number;
    totalPlayers: number;
    placingOrder: FunFactsPlayerInfo[];
    currentPlacerId: string | null;
    isMyTurn: boolean;
    placedArrows: PlacedArrowView[];
    teamScore: number;
    roundScores: number[];
    lastRoundResult: FunFactsRoundResult | null;
    maxScore: number;
}

function getPlayerName(state: FunFactsState, playerId: string): string {
    return (
        state.players.find((p) => p.id === playerId)?.name ?? "Unknown"
    );
}

export function getPlayerView(
    state: FunFactsState,
    playerId: string,
): FunFactsPlayerView {
    const isHost = playerId === state.hostId;
    const answeredCount = Object.keys(state.answers).length;

    const myAnswer =
        state.answers[playerId] !== undefined
            ? state.answers[playerId]
            : null;
    const hasAnswered = state.answers[playerId] !== undefined;

    const currentPlacerId =
        state.phase === "placing" &&
        state.currentPlacerIndex < state.placingOrder.length
            ? state.placingOrder[state.currentPlacerIndex]
            : null;

    const isMyTurn = currentPlacerId === playerId;

    const showAnswers =
        state.phase === "reveal" ||
        state.phase === "game_over";

    const placedArrows: PlacedArrowView[] = state.placedArrows.map((id) => ({
        playerId: id,
        playerName: getPlayerName(state, id),
        answer: showAnswers ? (state.answers[id] ?? null) : null,
    }));

    const placingOrder: FunFactsPlayerInfo[] = state.placingOrder.map(
        (id) => ({
            id,
            name: getPlayerName(state, id),
        }),
    );

    return {
        myId: playerId,
        isHost,
        phase: state.phase,
        roundNumber: state.roundNumber,
        totalRounds: state.totalRounds,
        currentQuestion: state.currentQuestion,
        players: state.players.map((p) => ({ id: p.id, name: p.name })),
        myAnswer,
        hasAnswered,
        answeredCount,
        totalPlayers: state.players.length,
        placingOrder,
        currentPlacerId,
        isMyTurn,
        placedArrows,
        teamScore: state.teamScore,
        roundScores: state.roundScores,
        lastRoundResult: state.lastRoundResult,
        maxScore: state.totalRounds * state.players.length,
    };
}
