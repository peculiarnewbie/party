import type {
    SpiceType,
    SpicyCard,
    SpicyEndReason,
    SpicyFinalScore,
    SpicyResult,
    SpicyState,
} from "./types";
import { getAllowedDeclarations } from "./engine";

export interface SpicyPlayerInfo {
    id: string;
    name: string;
    handCount: number;
    wonCardCount: number;
    trophies: number;
    isCurrentPlayer: boolean;
    isPendingLastCard: boolean;
}

export interface SpicyStackTopView {
    ownerId: string;
    declaredNumber: number;
    declaredSpice: SpiceType;
    stackSize: number;
}

export interface SpicyPlayerView {
    myId: string;
    phase: SpicyState["phase"];
    currentPlayerId: string;
    pendingLastCardPlayerId: string | null;
    safePassPlayerIds: string[];
    trophiesRemaining: number;
    players: SpicyPlayerInfo[];
    myHand: SpicyCard[];
    stackTop: SpicyStackTopView | null;
    isMyTurn: boolean;
    canPlayCard: boolean;
    canPass: boolean;
    canChallenge: boolean;
    canConfirmLastCard: boolean;
    allowedDeclarationNumbers: number[];
    allowedDeclarationSpices: SpiceType[];
    winners: string[] | null;
    endReason: SpicyEndReason | null;
    finalScores: SpicyFinalScore[] | null;
    lastPublicResult: SpicyResult | null;
}

export function getPlayerView(
    state: SpicyState,
    playerId: string,
    lastPublicResult: SpicyResult | null = null,
): SpicyPlayerView {
    const me = state.players.find((player) => player.id === playerId);
    const stackTop = state.stack[state.stack.length - 1] ?? null;
    const allowed = getAllowedDeclarations(state);
    const isPendingLastCard =
        state.pendingLastCardPlayerId !== null &&
        state.pendingLastCardPlayerId !== playerId;

    return {
        myId: playerId,
        phase: state.phase,
        currentPlayerId: state.currentPlayerId,
        pendingLastCardPlayerId: state.pendingLastCardPlayerId,
        safePassPlayerIds: [...state.safePassPlayerIds],
        trophiesRemaining: state.trophiesRemaining,
        players: state.players.map((player) => ({
            id: player.id,
            name: player.name,
            handCount: player.hand.length,
            wonCardCount: player.wonCardCount,
            trophies: player.trophies,
            isCurrentPlayer: player.id === state.currentPlayerId,
            isPendingLastCard: player.id === state.pendingLastCardPlayerId,
        })),
        myHand: me ? [...me.hand] : [],
        stackTop: stackTop
            ? {
                  ownerId: stackTop.playerId,
                  declaredNumber: stackTop.declaredNumber,
                  declaredSpice: stackTop.declaredSpice,
                  stackSize: state.stack.length,
              }
            : null,
        isMyTurn: state.currentPlayerId === playerId && state.phase === "playing",
        canPlayCard: state.phase === "playing" && state.currentPlayerId === playerId,
        canPass: state.phase === "playing" && state.currentPlayerId === playerId,
        canChallenge:
            state.phase !== "game_over" &&
            stackTop !== null &&
            stackTop.playerId !== playerId &&
            (!state.pendingLastCardPlayerId || isPendingLastCard),
        canConfirmLastCard:
            state.phase === "last_card_window" &&
            state.pendingLastCardPlayerId !== null &&
            state.pendingLastCardPlayerId !== playerId &&
            !state.safePassPlayerIds.includes(playerId),
        allowedDeclarationNumbers: allowed.numbers,
        allowedDeclarationSpices: allowed.spices,
        winners: state.winners,
        endReason: state.endReason,
        finalScores: state.finalScores,
        lastPublicResult,
    };
}
