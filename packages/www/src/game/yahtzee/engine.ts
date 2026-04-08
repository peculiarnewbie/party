import type {
    YahtzeeState,
    YahtzeePlayer,
    YahtzeeAction,
    YahtzeeResult,
    ScoringCategory,
    Dice,
    HeldDice,
    FinalScore,
    YahtzeeMode,
    LyingTurnReveal,
} from "./types";
import { SCORING_CATEGORIES, UPPER_CATEGORIES } from "./types";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const TOTAL_ROUNDS = 13;
export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS_POINTS = 35;
export const YAHTZEE_BONUS_POINTS = 100;
export const YAHTZEE_BASE_POINTS = 50;

export type RollFn = () => number;
export interface YahtzeeInitOptions {
    mode?: YahtzeeMode;
}

function defaultRoll(): number {
    return Math.floor(Math.random() * 6) + 1;
}

export function sumOfValue(dice: Dice, value: number): number {
    let total = 0;
    for (const d of dice) {
        if (d === value) total += d;
    }
    return total;
}

function counts(dice: Dice): number[] {
    const c = [0, 0, 0, 0, 0, 0, 0];
    for (const d of dice) c[d]++;
    return c;
}

export function nOfAKind(dice: Dice, n: number): number {
    const c = counts(dice);
    for (let v = 1; v <= 6; v++) {
        if (c[v] >= n) {
            let sum = 0;
            for (const d of dice) sum += d;
            return sum;
        }
    }
    return 0;
}

export function fullHouse(dice: Dice): number {
    const c = counts(dice);
    let hasThree = false;
    let hasTwo = false;
    for (let v = 1; v <= 6; v++) {
        if (c[v] === 3) hasThree = true;
        if (c[v] === 2) hasTwo = true;
    }
    return hasThree && hasTwo ? 25 : 0;
}

export function smallStraight(dice: Dice): number {
    const unique = new Set(dice);
    const sequences = [
        [1, 2, 3, 4],
        [2, 3, 4, 5],
        [3, 4, 5, 6],
    ];
    for (const seq of sequences) {
        if (seq.every((v) => unique.has(v))) return 30;
    }
    return 0;
}

export function largeStraight(dice: Dice): number {
    const sorted = [...dice].sort((a, b) => a - b);
    const isSequential =
        sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1) &&
        new Set(sorted).size === 5;
    return isSequential ? 40 : 0;
}

export function yahtzeeCheck(dice: Dice): number {
    return dice.every((d) => d === dice[0]) ? YAHTZEE_BASE_POINTS : 0;
}

export function isYahtzee(dice: Dice): boolean {
    return dice.every((d) => d === dice[0]);
}

export function chance(dice: Dice): number {
    let sum = 0;
    for (const d of dice) sum += d;
    return sum;
}

export function calculateScore(dice: Dice, category: ScoringCategory): number {
    switch (category) {
        case "ones":
            return sumOfValue(dice, 1);
        case "twos":
            return sumOfValue(dice, 2);
        case "threes":
            return sumOfValue(dice, 3);
        case "fours":
            return sumOfValue(dice, 4);
        case "fives":
            return sumOfValue(dice, 5);
        case "sixes":
            return sumOfValue(dice, 6);
        case "three_of_a_kind":
            return nOfAKind(dice, 3);
        case "four_of_a_kind":
            return nOfAKind(dice, 4);
        case "full_house":
            return fullHouse(dice);
        case "small_straight":
            return smallStraight(dice);
        case "large_straight":
            return largeStraight(dice);
        case "yahtzee":
            return yahtzeeCheck(dice);
        case "chance":
            return chance(dice);
    }
}

export function getUpperSectionTotal(
    scorecard: Partial<Record<ScoringCategory, number>>,
): number {
    let total = 0;
    for (const cat of UPPER_CATEGORIES) {
        if (scorecard[cat] !== undefined) total += scorecard[cat];
    }
    return total;
}

export function getUpperBonus(
    scorecard: Partial<Record<ScoringCategory, number>>,
): number {
    return getUpperSectionTotal(scorecard) >= UPPER_BONUS_THRESHOLD
        ? UPPER_BONUS_POINTS
        : 0;
}

export function getTotalScore(player: YahtzeePlayer): number {
    let total = 0;
    for (const cat of SCORING_CATEGORIES) {
        if (player.scorecard[cat] !== undefined) total += player.scorecard[cat];
    }
    total += getUpperBonus(player.scorecard);
    total += player.yahtzeeBonus * YAHTZEE_BONUS_POINTS;
    total -= player.penaltyPoints;
    return total;
}

export function getFilledCount(player: YahtzeePlayer): number {
    let count = 0;
    for (const cat of SCORING_CATEGORIES) {
        if (player.scorecard[cat] !== undefined) count++;
    }
    return count;
}

export function rollDice(
    dice: Dice,
    held: HeldDice,
    rollFn: RollFn = defaultRoll,
): Dice {
    return dice.map((d, i) => (held[i] ? d : rollFn())) as Dice;
}

export function initGame(
    players: { id: string; name: string }[],
    opts?: YahtzeeInitOptions,
): YahtzeeState {
    return {
        mode: opts?.mode ?? "standard",
        players: players.map((p) => ({
            id: p.id,
            name: p.name,
            scorecard: {},
            yahtzeeBonus: 0,
            penaltyPoints: 0,
        })),
        currentPlayerIndex: 0,
        dice: [0, 0, 0, 0, 0],
        held: [false, false, false, false, false],
        rollsLeft: 3,
        phase: "pre_roll",
        round: 1,
        winners: null,
        pendingClaim: null,
        lastTurnReveal: null,
    };
}

function diceMatch(a: Dice, b: Dice): boolean {
    const left = [...a].sort((x, y) => x - y);
    const right = [...b].sort((x, y) => x - y);
    return left.every((value, index) => value === right[index]);
}

function maybeAwardYahtzeeBonus(
    player: YahtzeePlayer,
    dice: Dice,
): boolean {
    if (
        isYahtzee(dice) &&
        player.scorecard.yahtzee !== undefined &&
        player.scorecard.yahtzee === YAHTZEE_BASE_POINTS
    ) {
        player.yahtzeeBonus++;
        return true;
    }

    return false;
}

function buildFinalScores(state: YahtzeeState): FinalScore[] {
    return state.players.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        total: getTotalScore(p),
    }));
}

function resetTurnState(state: YahtzeeState) {
    state.dice = [0, 0, 0, 0, 0];
    state.held = [false, false, false, false, false];
    state.rollsLeft = 3;
    state.phase = "pre_roll";
    state.pendingClaim = null;
}

function finishTurn(state: YahtzeeState): YahtzeeResult | null {
    const nextPlayerIndex =
        (state.currentPlayerIndex + 1) % state.players.length;
    const roundComplete = nextPlayerIndex === 0;

    if (roundComplete && state.round >= TOTAL_ROUNDS) {
        state.phase = "game_over";

        const scores = buildFinalScores(state);
        const maxScore = Math.max(...scores.map((s) => s.total));
        state.winners = scores
            .filter((s) => s.total === maxScore)
            .map((s) => s.playerId);

        return {
            type: "game_over",
            winners: state.winners,
            finalScores: scores,
        };
    }

    state.currentPlayerIndex = nextPlayerIndex;
    if (roundComplete) {
        state.round++;
    }

    resetTurnState(state);
    return null;
}

function resolveLyingClaim(
    state: YahtzeeState,
    responderId: string,
    challenge: boolean,
): YahtzeeResult {
    const currentPlayer = state.players[state.currentPlayerIndex];
    const responder = state.players.find((player) => player.id === responderId);
    const claim = state.pendingClaim;

    if (!currentPlayer || !responder || !claim) {
        return { type: "error", message: "Invalid state" };
    }

    if (responder.id === currentPlayer.id) {
        return { type: "error", message: "Waiting for opponent response" };
    }

    const truthful = diceMatch(state.dice, claim.claimedDice);
    let scoredPoints = claim.claimedPoints;
    let yahtzeeBonus = false;
    let reveal: LyingTurnReveal;

    if (!challenge) {
        yahtzeeBonus = maybeAwardYahtzeeBonus(currentPlayer, claim.claimedDice);
        currentPlayer.scorecard[claim.category] = claim.claimedPoints;
        reveal = {
            playerId: currentPlayer.id,
            category: claim.category,
            actualDice: [...state.dice] as Dice,
            claimedDice: [...claim.claimedDice] as Dice,
            claimedPoints: claim.claimedPoints,
            outcome: "accepted",
            penaltyPlayerId: null,
            penaltyPoints: 0,
        };
    } else if (truthful) {
        yahtzeeBonus = maybeAwardYahtzeeBonus(currentPlayer, claim.claimedDice);
        currentPlayer.scorecard[claim.category] = claim.claimedPoints;
        responder.penaltyPoints += claim.claimedPoints;
        reveal = {
            playerId: currentPlayer.id,
            category: claim.category,
            actualDice: [...state.dice] as Dice,
            claimedDice: [...claim.claimedDice] as Dice,
            claimedPoints: claim.claimedPoints,
            outcome: "truthful_challenge",
            penaltyPlayerId: responder.id,
            penaltyPoints: claim.claimedPoints,
        };
    } else {
        scoredPoints = -claim.claimedPoints;
        currentPlayer.scorecard[claim.category] = scoredPoints;
        reveal = {
            playerId: currentPlayer.id,
            category: claim.category,
            actualDice: [...state.dice] as Dice,
            claimedDice: [...claim.claimedDice] as Dice,
            claimedPoints: claim.claimedPoints,
            outcome: "caught_lying",
            penaltyPlayerId: currentPlayer.id,
            penaltyPoints: claim.claimedPoints,
        };
    }

    state.lastTurnReveal = reveal;
    state.pendingClaim = null;

    const gameOver = finishTurn(state);
    if (gameOver) {
        return gameOver;
    }

    return {
        type: "claim_resolved",
        ...reveal,
        points: scoredPoints,
        yahtzeeBonus,
    };
}

export function processAction(
    state: YahtzeeState,
    action: YahtzeeAction,
    rollFn: RollFn = defaultRoll,
): YahtzeeResult {
    if (state.phase === "game_over") {
        return { type: "error", message: "Game is over" };
    }

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) {
        return { type: "error", message: "Invalid state" };
    }

    if (action.type === "accept_claim" || action.type === "challenge_claim") {
        if (state.mode !== "lying") {
            return { type: "error", message: "Claims are not used in this game" };
        }

        if (state.phase !== "awaiting_response" || !state.pendingClaim) {
            return { type: "error", message: "No claim to respond to" };
        }

        return resolveLyingClaim(
            state,
            action.playerId,
            action.type === "challenge_claim",
        );
    }

    if (action.playerId !== currentPlayer.id) {
        return { type: "error", message: "Not your turn" };
    }

    if (action.type === "roll") {
        if (state.rollsLeft <= 0) {
            return { type: "error", message: "No rolls left" };
        }

        if (state.phase === "pre_roll") {
            state.held = [false, false, false, false, false];
        }

        state.dice = rollDice(state.dice, state.held, rollFn);
        state.rollsLeft--;
        state.phase = "mid_turn";

        return { type: "rolled", playerId: action.playerId, dice: [...state.dice] as Dice };
    }

    if (action.type === "toggle_hold") {
        if (state.phase !== "mid_turn") {
            return { type: "error", message: "Must roll first" };
        }

        const idx = action.diceIndex;
        if (idx < 0 || idx > 4) {
            return { type: "error", message: "Invalid dice index" };
        }

        state.held[idx] = !state.held[idx];
        return {
            type: "held_toggled",
            playerId: action.playerId,
            diceIndex: idx,
            held: state.held[idx],
        };
    }

    if (action.type === "score") {
        if (state.mode !== "standard") {
            return { type: "error", message: "Submit a claim instead" };
        }

        if (state.phase !== "mid_turn") {
            return { type: "error", message: "Must roll first" };
        }

        const category = action.category;
        if (currentPlayer.scorecard[category] !== undefined) {
            return { type: "error", message: "Category already filled" };
        }

        const gotYahtzeeBonus = maybeAwardYahtzeeBonus(currentPlayer, state.dice);

        const points = calculateScore(state.dice, category);
        currentPlayer.scorecard[category] = points;
        state.lastTurnReveal = null;

        const gameOver = finishTurn(state);
        if (gameOver) {
            return gameOver;
        }

        return {
            type: "scored",
            playerId: action.playerId,
            category,
            points,
            yahtzeeBonus: gotYahtzeeBonus,
        };
    }

    if (action.type === "claim") {
        if (state.mode !== "lying") {
            return { type: "error", message: "Claims are not used in this game" };
        }

        if (state.phase !== "mid_turn") {
            return { type: "error", message: "Must roll first" };
        }

        if (currentPlayer.scorecard[action.category] !== undefined) {
            return { type: "error", message: "Category already filled" };
        }

        const claimedPoints = calculateScore(
            action.claimedDice,
            action.category,
        );

        state.pendingClaim = {
            playerId: action.playerId,
            category: action.category,
            claimedDice: [...action.claimedDice] as Dice,
            claimedPoints,
        };
        state.phase = "awaiting_response";

        return {
            type: "claim_submitted",
            playerId: action.playerId,
            category: action.category,
            claimedDice: [...action.claimedDice] as Dice,
            claimedPoints,
        };
    }

    return { type: "error", message: "Unknown action" };
}
