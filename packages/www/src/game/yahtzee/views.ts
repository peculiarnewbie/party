import type {
    YahtzeeState,
    YahtzeePhase,
    ScoringCategory,
    Dice,
    HeldDice,
    YahtzeeMode,
    LyingClaim,
    LyingTurnReveal,
} from "./types";
import { SCORING_CATEGORIES } from "./types";
import {
    calculateScore,
    getTotalScore,
    getUpperSectionTotal,
    getUpperBonus,
} from "./engine";

export interface YahtzeePlayerInfo {
    id: string;
    name: string;
    scorecard: Partial<Record<ScoringCategory, number>>;
    yahtzeeBonus: number;
    penaltyPoints: number;
    upperTotal: number;
    upperBonus: number;
    totalScore: number;
}

export interface YahtzeePlayerView {
    mode: YahtzeeMode;
    myId: string;
    phase: YahtzeePhase;
    round: number;
    dice: Dice;
    held: HeldDice;
    rollsLeft: number;
    currentPlayerId: string;
    isMyTurn: boolean;
    players: YahtzeePlayerInfo[];
    potentialScores: Partial<Record<ScoringCategory, number>> | null;
    suggestedCategories: ScoringCategory[];
    canRoll: boolean;
    canScore: boolean;
    canClaim: boolean;
    canAcceptClaim: boolean;
    canChallengeClaim: boolean;
    pendingClaim: LyingClaim | null;
    lastTurnReveal: LyingTurnReveal | null;
    winners: string[] | null;
}

export function getPlayerView(
    state: YahtzeeState,
    playerId: string,
): YahtzeePlayerView {
    const currentPlayer = state.players[state.currentPlayerIndex];
    const isMyTurn = currentPlayer?.id === playerId;

    const players: YahtzeePlayerInfo[] = state.players.map((p) => ({
        id: p.id,
        name: p.name,
        scorecard: { ...p.scorecard },
        yahtzeeBonus: p.yahtzeeBonus,
        penaltyPoints: p.penaltyPoints,
        upperTotal: getUpperSectionTotal(p.scorecard),
        upperBonus: getUpperBonus(p.scorecard),
        totalScore: getTotalScore(p),
    }));

    let potentialScores: Partial<Record<ScoringCategory, number>> | null = null;
    let suggestedCategories: ScoringCategory[] = [];
    if (
        isMyTurn &&
        state.phase === "mid_turn" &&
        state.mode === "standard"
    ) {
        potentialScores = {};
        const me = state.players.find((p) => p.id === playerId);
        if (me) {
            for (const cat of SCORING_CATEGORIES) {
                if (me.scorecard[cat] === undefined) {
                    potentialScores[cat] = calculateScore(state.dice, cat);
                }
            }

            const availableScores = Object.entries(potentialScores).filter(
                (
                    entry,
                ): entry is [ScoringCategory, number] => entry[1] !== undefined,
            );
            const bestScore = Math.max(
                0,
                ...availableScores.map(([, score]) => score),
            );
            suggestedCategories =
                bestScore > 0
                    ? availableScores
                          .filter(([, score]) => score === bestScore)
                          .map(([category]) => category)
                    : [];
        }
    }

    const canRoll =
        isMyTurn &&
        state.phase !== "game_over" &&
        (state.phase === "pre_roll" ||
            (state.phase === "mid_turn" && state.rollsLeft > 0));

    const canScore =
        state.mode === "standard" && isMyTurn && state.phase === "mid_turn";
    const canClaim =
        state.mode === "lying" && isMyTurn && state.phase === "mid_turn";
    const canAcceptClaim =
        state.mode === "lying" &&
        !isMyTurn &&
        state.phase === "awaiting_response" &&
        state.pendingClaim?.playerId !== playerId;
    const canChallengeClaim = canAcceptClaim;
    const hiddenDice =
        state.mode === "lying" && !isMyTurn && state.phase !== "game_over";
    const pendingClaim = state.pendingClaim
        ? {
              ...state.pendingClaim,
              claimedDice: [...state.pendingClaim.claimedDice] as Dice,
          }
        : null;
    const lastTurnReveal = state.lastTurnReveal
        ? {
              ...state.lastTurnReveal,
              actualDice: [...state.lastTurnReveal.actualDice] as Dice,
              claimedDice: [...state.lastTurnReveal.claimedDice] as Dice,
          }
        : null;

    return {
        mode: state.mode,
        myId: playerId,
        phase: state.phase,
        round: state.round,
        dice: hiddenDice
            ? [0, 0, 0, 0, 0]
            : ([...state.dice] as Dice),
        held: [...state.held] as HeldDice,
        rollsLeft: state.rollsLeft,
        currentPlayerId: currentPlayer?.id ?? "",
        isMyTurn,
        players,
        potentialScores,
        suggestedCategories,
        canRoll,
        canScore,
        canClaim,
        canAcceptClaim,
        canChallengeClaim,
        pendingClaim,
        lastTurnReveal,
        winners: state.winners,
    };
}
