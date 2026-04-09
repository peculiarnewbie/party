import type {
    FunFactsState,
    FunFactsPlayer,
    FunFactsAction,
    FunFactsResult,
    FunFactsRoundResult,
} from "./types";
import { QUESTION_BANK } from "./questions";

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
    hostId: string,
    opts?: { totalRounds?: number },
): FunFactsState {
    const funFactsPlayers: FunFactsPlayer[] = players.map((p) => ({
        id: p.id,
        name: p.name,
    }));

    const shuffledQuestions = shuffle([...QUESTION_BANK]);

    return {
        players: funFactsPlayers,
        hostId,
        phase: "waiting",
        roundNumber: 0,
        totalRounds: opts?.totalRounds ?? 8,
        currentQuestion: null,
        questionIndex: 0,
        shuffledQuestions,
        answers: {},
        placingOrder: [],
        currentPlacerIndex: 0,
        placedArrows: [],
        teamScore: 0,
        roundScores: [],
        lastRoundResult: null,
    };
}

export function processAction(
    state: FunFactsState,
    action: FunFactsAction,
): FunFactsResult {
    if (action.type === "next_question") {
        if (action.hostId !== state.hostId) {
            return { type: "error", message: "Only the host can start questions" };
        }
        if (state.phase !== "waiting") {
            return { type: "error", message: "Not in waiting phase" };
        }

        let question: string;
        if (action.customQuestion && action.customQuestion.trim().length > 0) {
            question = action.customQuestion.trim();
        } else {
            if (state.shuffledQuestions.length === 0) {
                state.shuffledQuestions = shuffle([...QUESTION_BANK]);
                state.questionIndex = 0;
            }
            question =
                state.shuffledQuestions[
                    state.questionIndex % state.shuffledQuestions.length
                ];
            state.questionIndex++;
        }

        state.currentQuestion = question;
        state.roundNumber++;
        state.answers = {};
        state.placingOrder = [];
        state.currentPlacerIndex = 0;
        state.placedArrows = [];
        state.lastRoundResult = null;
        state.phase = "answering";

        return {
            type: "question_started",
            question,
            roundNumber: state.roundNumber,
        };
    }

    if (action.type === "submit_answer") {
        if (state.phase !== "answering") {
            return { type: "error", message: "Not in answering phase" };
        }
        const player = state.players.find((p) => p.id === action.playerId);
        if (!player) {
            return { type: "error", message: "Player not in game" };
        }

        state.answers[action.playerId] = action.answer;

        const answeredCount = Object.keys(state.answers).length;
        return {
            type: "answer_submitted",
            playerId: action.playerId,
            answeredCount,
            totalPlayers: state.players.length,
        };
    }

    if (action.type === "close_answers") {
        if (action.hostId !== state.hostId) {
            return { type: "error", message: "Only the host can close answers" };
        }
        if (state.phase !== "answering") {
            return { type: "error", message: "Not in answering phase" };
        }

        const answeredPlayerIds = Object.keys(state.answers);
        if (answeredPlayerIds.length < 2) {
            return {
                type: "error",
                message: "Need at least 2 answers to continue",
            };
        }

        const placingOrder = shuffle(answeredPlayerIds);
        state.placingOrder = placingOrder;
        state.currentPlacerIndex = 0;
        state.placedArrows = [placingOrder[0]];
        state.currentPlacerIndex = 1;
        state.phase = "placing";

        if (placingOrder.length === 1) {
            return transitionToReveal(state);
        }

        return {
            type: "answers_closed",
            placingOrder,
            firstPlacerId: placingOrder[0],
        };
    }

    if (action.type === "place_arrow") {
        if (state.phase !== "placing") {
            return { type: "error", message: "Not in placing phase" };
        }

        const currentPlacerId =
            state.placingOrder[state.currentPlacerIndex];
        if (action.playerId !== currentPlacerId) {
            return { type: "error", message: "Not your turn to place" };
        }

        if (
            action.position < 0 ||
            action.position > state.placedArrows.length
        ) {
            return { type: "error", message: "Invalid position" };
        }

        state.placedArrows.splice(action.position, 0, action.playerId);
        state.currentPlacerIndex++;

        if (state.currentPlacerIndex >= state.placingOrder.length) {
            return transitionToReveal(state);
        }

        const nextPlacerId =
            state.placingOrder[state.currentPlacerIndex];
        return {
            type: "arrow_placed",
            playerId: action.playerId,
            nextPlacerId,
            placedCount: state.currentPlacerIndex,
            totalPlacers: state.placingOrder.length,
        };
    }

    if (action.type === "next_round") {
        if (action.hostId !== state.hostId) {
            return { type: "error", message: "Only the host can advance rounds" };
        }
        if (state.phase !== "reveal") {
            return { type: "error", message: "Not in reveal phase" };
        }

        if (state.roundNumber >= state.totalRounds) {
            state.phase = "game_over";
            return {
                type: "game_over",
                teamScore: state.teamScore,
                maxScore: state.totalRounds * state.players.length,
            };
        }

        state.phase = "waiting";
        return { type: "round_advanced" };
    }

    return { type: "error", message: "Unknown action" };
}

function transitionToReveal(state: FunFactsState): FunFactsResult {
    const result = calculateRoundScore(state);
    state.lastRoundResult = result;
    state.teamScore += result.pointsEarned;
    state.roundScores.push(result.pointsEarned);
    state.phase = "reveal";

    return { type: "round_revealed", result };
}

function calculateRoundScore(state: FunFactsState): FunFactsRoundResult {
    const placedOrder = [...state.placedArrows];
    const answers = { ...state.answers };

    const correctArrows: string[] = [];
    const removedArrows: string[] = [];
    let lastValidValue = -Infinity;

    for (const playerId of placedOrder) {
        const value = answers[playerId];
        if (value !== undefined && value >= lastValidValue) {
            correctArrows.push(playerId);
            lastValidValue = value;
        } else {
            removedArrows.push(playerId);
        }
    }

    return {
        question: state.currentQuestion ?? "",
        placedOrder,
        answers,
        correctArrows,
        removedArrows,
        pointsEarned: correctArrows.length,
    };
}

export function removePlayer(
    state: FunFactsState,
    playerId: string,
): FunFactsResult | null {
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex < 0) return null;

    state.players.splice(playerIndex, 1);
    delete state.answers[playerId];

    state.placingOrder = state.placingOrder.filter((id) => id !== playerId);
    state.placedArrows = state.placedArrows.filter((id) => id !== playerId);

    if (
        state.phase === "placing" &&
        state.currentPlacerIndex < state.placingOrder.length
    ) {
        const currentPlacerId =
            state.placingOrder[state.currentPlacerIndex];
        if (currentPlacerId === playerId) {
            if (state.currentPlacerIndex >= state.placingOrder.length) {
                return transitionToReveal(state);
            }
        }
    }

    if (state.players.length < 2) {
        state.phase = "game_over";
        return {
            type: "game_over",
            teamScore: state.teamScore,
            maxScore: state.totalRounds * (state.players.length + 1),
        };
    }

    return null;
}

export function endGameByHost(state: FunFactsState): FunFactsResult {
    state.phase = "game_over";
    return {
        type: "game_over",
        teamScore: state.teamScore,
        maxScore: state.totalRounds * state.players.length,
    };
}
