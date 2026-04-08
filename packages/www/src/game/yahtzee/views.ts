import type {
    YahtzeeState,
    YahtzeePhase,
    ScoringCategory,
    Dice,
    HeldDice,
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
    upperTotal: number;
    upperBonus: number;
    totalScore: number;
}

export interface YahtzeePlayerView {
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
    canRoll: boolean;
    canScore: boolean;
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
        upperTotal: getUpperSectionTotal(p.scorecard),
        upperBonus: getUpperBonus(p.scorecard),
        totalScore: getTotalScore(p),
    }));

    let potentialScores: Partial<Record<ScoringCategory, number>> | null = null;
    if (isMyTurn && state.phase === "mid_turn") {
        potentialScores = {};
        const me = state.players.find((p) => p.id === playerId);
        if (me) {
            for (const cat of SCORING_CATEGORIES) {
                if (me.scorecard[cat] === undefined) {
                    potentialScores[cat] = calculateScore(state.dice, cat);
                }
            }
        }
    }

    const canRoll =
        isMyTurn &&
        state.phase !== "game_over" &&
        (state.phase === "pre_roll" ||
            (state.phase === "mid_turn" && state.rollsLeft > 0));

    const canScore = isMyTurn && state.phase === "mid_turn";

    return {
        myId: playerId,
        phase: state.phase,
        round: state.round,
        dice: [...state.dice] as Dice,
        held: [...state.held] as HeldDice,
        rollsLeft: state.rollsLeft,
        currentPlayerId: currentPlayer?.id ?? "",
        isMyTurn,
        players,
        potentialScores,
        canRoll,
        canScore,
        winners: state.winners,
    };
}
