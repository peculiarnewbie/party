import {
    getTotalScore,
    getUpperBonus,
    getUpperSectionTotal,
    initGame,
} from "./engine";
import type {
    Dice,
    HeldDice,
    LyingClaim,
    LyingTurnReveal,
    ScoringCategory,
    YahtzeeMode,
    YahtzeePhase,
    YahtzeePlayer,
    YahtzeeState,
} from "./types";
import type { YahtzeePlayerInfo, YahtzeePlayerView } from "./views";

export const TEST_PLAYERS = [
    { id: "p1", name: "Alice" },
    { id: "p2", name: "Bob" },
] as const;

export function fixedRollFn(values: number[]) {
    let index = 0;
    return () => values[index++ % values.length];
}

export function makePlayer(
    overrides: Partial<YahtzeePlayer> & Pick<YahtzeePlayer, "id" | "name">,
): YahtzeePlayer {
    return {
        id: overrides.id,
        name: overrides.name,
        scorecard: overrides.scorecard ?? {},
        yahtzeeBonus: overrides.yahtzeeBonus ?? 0,
        penaltyPoints: overrides.penaltyPoints ?? 0,
    };
}

export function makeState(
    overrides: Partial<YahtzeeState> & {
        players?: YahtzeePlayer[];
        mode?: YahtzeeMode;
        dice?: Dice;
        held?: HeldDice;
        pendingClaim?: LyingClaim | null;
        lastTurnReveal?: LyingTurnReveal | null;
    } = {},
): YahtzeeState {
    const state = initGame(
        overrides.players?.map((player) => ({
            id: player.id,
            name: player.name,
        })) ?? [...TEST_PLAYERS],
        { mode: overrides.mode ?? "standard" },
    );

    state.players =
        overrides.players?.map((player) => ({
            ...player,
            scorecard: { ...player.scorecard },
        })) ?? state.players;
    state.currentPlayerIndex = overrides.currentPlayerIndex ?? 0;
    state.dice = overrides.dice ? [...overrides.dice] as Dice : state.dice;
    state.held = overrides.held ? [...overrides.held] as HeldDice : state.held;
    state.rollsLeft = overrides.rollsLeft ?? state.rollsLeft;
    state.phase = overrides.phase ?? state.phase;
    state.round = overrides.round ?? state.round;
    state.winners = overrides.winners ? [...overrides.winners] : overrides.winners ?? state.winners;
    state.pendingClaim = overrides.pendingClaim
        ? {
              ...overrides.pendingClaim,
              claimedDice: [...overrides.pendingClaim.claimedDice] as Dice,
          }
        : overrides.pendingClaim ?? state.pendingClaim;
    state.lastTurnReveal = overrides.lastTurnReveal
        ? {
              ...overrides.lastTurnReveal,
              actualDice: [...overrides.lastTurnReveal.actualDice] as Dice,
              claimedDice: [...overrides.lastTurnReveal.claimedDice] as Dice,
          }
        : overrides.lastTurnReveal ?? state.lastTurnReveal;

    return state;
}

export function buildFilledScorecard(
    entries: Array<[ScoringCategory, number]>,
): Partial<Record<ScoringCategory, number>> {
    return Object.fromEntries(entries);
}

export function resolveWinners(state: YahtzeeState): string[] {
    if (state.players.length === 0) return [];

    const totals = state.players.map((player) => ({
        id: player.id,
        total: getTotalScore(player),
    }));
    const maxTotal = Math.max(...totals.map((entry) => entry.total));
    return totals
        .filter((entry) => entry.total === maxTotal)
        .map((entry) => entry.id);
}

export function makePlayerInfo(
    overrides: Partial<YahtzeePlayerInfo> & Pick<YahtzeePlayerInfo, "id" | "name">,
): YahtzeePlayerInfo {
    const scorecard = overrides.scorecard ?? {};
    const playerForTotals: YahtzeePlayer = {
        id: overrides.id,
        name: overrides.name,
        scorecard,
        yahtzeeBonus: overrides.yahtzeeBonus ?? 0,
        penaltyPoints: overrides.penaltyPoints ?? 0,
    };
    return {
        id: overrides.id,
        name: overrides.name,
        scorecard,
        yahtzeeBonus: overrides.yahtzeeBonus ?? 0,
        penaltyPoints: overrides.penaltyPoints ?? 0,
        upperTotal:
            overrides.upperTotal ?? getUpperSectionTotal(scorecard),
        upperBonus: overrides.upperBonus ?? getUpperBonus(scorecard),
        totalScore:
            overrides.totalScore ?? getTotalScore(playerForTotals),
    };
}

export function makeView(
    overrides: Partial<YahtzeePlayerView> = {},
): YahtzeePlayerView {
    const players = overrides.players ?? [
        makePlayerInfo({ id: "p1", name: "Alice" }),
        makePlayerInfo({ id: "p2", name: "Bob" }),
    ];
    return {
        mode: "standard" as YahtzeeMode,
        myId: "p1",
        phase: "pre_roll" as YahtzeePhase,
        round: 1,
        dice: [0, 0, 0, 0, 0] as Dice,
        held: [false, false, false, false, false] as HeldDice,
        rollsLeft: 3,
        currentPlayerId: "p1",
        isMyTurn: true,
        players,
        potentialScores: null,
        suggestedCategories: [] as ScoringCategory[],
        canRoll: true,
        canScore: false,
        canClaim: false,
        canAcceptClaim: false,
        canChallengeClaim: false,
        pendingClaim: null as LyingClaim | null,
        lastTurnReveal: null as LyingTurnReveal | null,
        winners: null,
        ...overrides,
    };
}
