// @vitest-environment node

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
    calculateScore,
    getTotalScore,
    initGame,
    isYahtzee,
    processAction,
    TOTAL_ROUNDS,
} from "./engine";
import { SCORING_CATEGORIES } from "./types";
import type {
    Dice,
    ScoringCategory,
    YahtzeeAction,
    YahtzeeMode,
    YahtzeeResult,
    YahtzeeState,
} from "./types";

const CATEGORIES: ScoringCategory[] = SCORING_CATEGORIES;

function createRng(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function rollDie(rng: () => number): number {
    return Math.floor(rng() * 6) + 1;
}

const dieArb = fc.integer({ min: 1, max: 6 });
const diceArb: fc.Arbitrary<Dice> = fc.tuple(
    dieArb,
    dieArb,
    dieArb,
    dieArb,
    dieArb,
) as fc.Arbitrary<Dice>;
const categoryArb = fc.constantFrom(...CATEGORIES);

function findAvailableCategory(
    state: YahtzeeState,
    playerId: string,
    preferred: ScoringCategory,
): ScoringCategory | null {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return null;
    if (player.scorecard[preferred] === undefined) return preferred;
    for (const cat of CATEGORIES) {
        if (player.scorecard[cat] === undefined) return cat;
    }
    return null;
}

function maxPointsForCategory(category: ScoringCategory): number {
    switch (category) {
        case "ones":
            return 5;
        case "twos":
            return 10;
        case "threes":
            return 15;
        case "fours":
            return 20;
        case "fives":
            return 25;
        case "sixes":
            return 30;
        case "three_of_a_kind":
        case "four_of_a_kind":
        case "chance":
            return 30;
        case "full_house":
            return 25;
        case "small_straight":
            return 30;
        case "large_straight":
            return 40;
        case "yahtzee":
            return 50;
    }
}

function isValidScore(
    value: number,
    category: ScoringCategory,
    allowNegative: boolean,
): boolean {
    const max = maxPointsForCategory(category);
    if (value > max) return false;
    if (!allowNegative && value < 0) return false;
    if (allowNegative && value < -max) return false;
    return true;
}

type TurnDecision =
    | {
          mode: "standard";
          category: ScoringCategory;
          rolls: number;
          holds: number[][];
      }
    | {
          mode: "lying";
          category: ScoringCategory;
          claimedDice: Dice;
          response: "accept" | "challenge";
          rolls: number;
          holds: number[][];
      };

function turnDecisionArb(mode: YahtzeeMode): fc.Arbitrary<TurnDecision> {
    if (mode === "standard") {
        return fc
            .record({
                category: categoryArb,
                rolls: fc.integer({ min: 1, max: 3 }),
                holds: fc.array(fc.array(fc.integer({ min: 0, max: 4 })), {
                    maxLength: 2,
                }),
            })
            .map((r): TurnDecision => ({ mode: "standard", ...r }));
    }

    return fc
        .record({
            category: categoryArb,
            rolls: fc.integer({ min: 1, max: 3 }),
            holds: fc.array(fc.array(fc.integer({ min: 0, max: 4 })), {
                maxLength: 2,
            }),
            claimedDice: diceArb,
            response: fc.constantFrom<"accept" | "challenge">(
                "accept",
                "challenge",
            ),
        })
        .map((r): TurnDecision => ({ mode: "lying", ...r }));
}

function applyRoll(
    state: YahtzeeState,
    rng: () => number,
): YahtzeeResult | null {
    if (state.rollsLeft <= 0) return null;
    const currentPlayer = state.players[state.currentPlayerIndex];
    return processAction(
        state,
        { type: "roll", playerId: currentPlayer.id },
        () => rollDie(rng),
    );
}

function applyToggleHold(
    state: YahtzeeState,
    diceIndex: number,
): YahtzeeResult | null {
    if (!isMidTurn(state)) return null;
    const currentPlayer = state.players[state.currentPlayerIndex];
    return processAction(state, {
        type: "toggle_hold",
        playerId: currentPlayer.id,
        diceIndex,
    });
}

function isGameOver(state: YahtzeeState): boolean {
    return state.phase === "game_over";
}

function isMidTurn(state: YahtzeeState): boolean {
    return state.phase === "mid_turn";
}

function isAwaitingResponse(state: YahtzeeState): boolean {
    return state.phase === "awaiting_response";
}

function playTurn(
    state: YahtzeeState,
    decision: TurnDecision,
    rng: () => number,
): void {
    if (isGameOver(state)) return;

    const currentPlayerId = state.players[state.currentPlayerIndex].id;

    for (let i = 0; i < decision.rolls; i++) {
        applyRoll(state, rng);
        if (isGameOver(state)) return;
        if (i < decision.holds.length) {
            for (const idx of decision.holds[i]) {
                applyToggleHold(state, idx);
            }
        }
    }

    if (isGameOver(state)) return;

    if (decision.mode === "standard") {
        const category = findAvailableCategory(
            state,
            currentPlayerId,
            decision.category,
        );
        if (!category) return;
        if (!isMidTurn(state)) return;

        const diceAtScore: Dice = [...state.dice] as Dice;
        const result = processAction(state, {
            type: "score",
            playerId: currentPlayerId,
            category,
        });

        if (result.type === "scored") {
            const player = state.players.find((p) => p.id === currentPlayerId)!;
            const expectedPoints = calculateScore(diceAtScore, category);
            expect(player.scorecard[category]).toBe(expectedPoints);
            if (result.yahtzeeBonus) {
                expect(isYahtzee(diceAtScore)).toBe(true);
            }
        }
    } else {
        const category = findAvailableCategory(
            state,
            currentPlayerId,
            decision.category,
        );
        if (!category || !isMidTurn(state)) return;

        const result = processAction(state, {
            type: "claim",
            playerId: currentPlayerId,
            category,
            claimedDice: decision.claimedDice,
        });

        if (result.type !== "claim_submitted") return;
        if (!isAwaitingResponse(state)) return;

        const responder = state.players.find((p) => p.id !== currentPlayerId);
        if (!responder) return;

        const responseAction: YahtzeeAction =
            decision.response === "accept"
                ? { type: "accept_claim", playerId: responder.id }
                : { type: "challenge_claim", playerId: responder.id };

        const actualDice: Dice = [...state.dice] as Dice;
        const claimedDice = decision.claimedDice;
        const claimedPoints = calculateScore(claimedDice, category);
        const actualMatch =
            [...actualDice].sort((a, b) => a - b).join(",") ===
            [...claimedDice].sort((a, b) => a - b).join(",");

        const response = processAction(state, responseAction);
        if (response.type !== "claim_resolved") return;

        const player = state.players.find((p) => p.id === currentPlayerId)!;
        if (response.outcome === "accepted") {
            expect(player.scorecard[category]).toBe(claimedPoints);
        } else if (response.outcome === "truthful_challenge") {
            expect(player.scorecard[category]).toBe(claimedPoints);
            expect(responder.penaltyPoints).toBe(claimedPoints);
        } else if (response.outcome === "caught_lying") {
            expect(player.scorecard[category]).toBe(-claimedPoints);
        }
    }
}

function assertStateInvariants(state: YahtzeeState, mode: YahtzeeMode): void {
    expect(state.currentPlayerIndex).toBeGreaterThanOrEqual(0);
    expect(state.currentPlayerIndex).toBeLessThan(state.players.length);
    expect(state.rollsLeft).toBeGreaterThanOrEqual(0);
    expect(state.rollsLeft).toBeLessThanOrEqual(3);
    expect(state.round).toBeGreaterThanOrEqual(1);
    expect(state.round).toBeLessThanOrEqual(TOTAL_ROUNDS);

    expect(state.players.length).toBeGreaterThanOrEqual(2);
    expect(state.players.length).toBeLessThanOrEqual(10);

    for (const player of state.players) {
        const filled = Object.keys(
            player.scorecard,
        ) as ScoringCategory[];
        expect(filled.length).toBeLessThanOrEqual(TOTAL_ROUNDS);

        for (const cat of filled) {
            expect(CATEGORIES).toContain(cat);
            const value = player.scorecard[cat];
            expect(value).toBeDefined();
            expect(
                isValidScore(value!, cat, mode === "lying"),
            ).toBe(true);
        }

        expect(player.yahtzeeBonus).toBeGreaterThanOrEqual(0);
        expect(player.penaltyPoints).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(getTotalScore(player))).toBe(true);
    }

    if (state.pendingClaim) {
        expect(CATEGORIES).toContain(state.pendingClaim.category);
        expect(state.pendingClaim.claimedDice).toHaveLength(5);
        expect(
            state.pendingClaim.claimedDice.every(
                (d) => d >= 1 && d <= 6,
            ),
        ).toBe(true);
        expect(state.pendingClaim.claimedPoints).toBe(
            calculateScore(state.pendingClaim.claimedDice, state.pendingClaim.category),
        );
    }

    if (state.phase === "game_over") {
        expect(state.winners).not.toBeNull();
    }
}

function playerArb(count: number): { id: string; name: string }[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
    }));
}

function logFuzzFailure(
    label: string,
    runDetails: fc.RunDetails<[number, number, TurnDecision[]]>,
): void {
    const seed = runDetails.seed;
    const numShrinks = runDetails.numShrinks;
    const counterexample = runDetails.counterexample;

    if (!process.env.CI) {
        const logDir = path.join(process.cwd(), ".fuzz-failures");
        fs.mkdirSync(logDir, { recursive: true });
        const logPath = path.join(logDir, `${label}.json`);
        fs.writeFileSync(
            logPath,
            JSON.stringify(
                {
                    label,
                    seed,
                    numShrinks,
                    counterexample,
                    timestamp: new Date().toISOString(),
                },
                null,
                2,
            ),
        );
        console.error(`Fuzz failure for ${label} logged to ${logPath}`);
    } else {
        console.error(
            `Fuzz failure for ${label}: seed=${seed}, shrinks=${numShrinks}`,
        );
        console.error("Counterexample:", JSON.stringify(counterexample, null, 2));
    }
}

describe("yahtzee engine fuzz", () => {
    it("standard mode: random full games maintain invariants", () => {
        const result = fc.check(
            fc.property(
                fc.integer({ min: 1, max: 100000 }),
                fc.integer({ min: 2, max: 4 }),
                fc.array(turnDecisionArb("standard"), {
                    minLength: 15,
                    maxLength: 25,
                }),
                (seed, playerCount, decisions) => {
                    const rng = createRng(seed);
                    const state = initGame(playerArb(playerCount), {
                        mode: "standard",
                    });

                    for (const decision of decisions) {
                        if (state.phase === "game_over") break;
                        playTurn(state, decision, rng);
                        assertStateInvariants(state, "standard");
                    }

                    if (state.phase !== "game_over") {
                        const anyMovesLeft = state.players.some(
                            (p) =>
                                Object.keys(p.scorecard).length < TOTAL_ROUNDS,
                        );
                        if (!anyMovesLeft) {
                            expect(state.phase).toBe("game_over");
                        }
                    }
                },
            ),
            { numRuns: 50 },
        );
        if (result.failed) {
            logFuzzFailure("yahtzee-standard", result);
            throw new Error("Fuzz failed for standard mode");
        }
    });

    it("lying mode: random full games maintain invariants", () => {
        const result = fc.check(
            fc.property(
                fc.integer({ min: 1, max: 100000 }),
                fc.integer({ min: 2, max: 4 }),
                fc.array(turnDecisionArb("lying"), {
                    minLength: 15,
                    maxLength: 25,
                }),
                (seed, playerCount, decisions) => {
                    const rng = createRng(seed);
                    const state = initGame(playerArb(playerCount), {
                        mode: "lying",
                    });

                    for (const decision of decisions) {
                        if (state.phase === "game_over") break;
                        playTurn(state, decision, rng);
                        assertStateInvariants(state, "lying");
                    }

                    if (state.phase !== "game_over") {
                        const anyMovesLeft = state.players.some(
                            (p) =>
                                Object.keys(p.scorecard).length < TOTAL_ROUNDS,
                        );
                        if (!anyMovesLeft) {
                            expect(state.phase).toBe("game_over");
                        }
                    }
                },
            ),
            { numRuns: 50 },
        );
        if (result.failed) {
            logFuzzFailure("yahtzee-lying", result);
            throw new Error("Fuzz failed for lying mode");
        }
    });
});
