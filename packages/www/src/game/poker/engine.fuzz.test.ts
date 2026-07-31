// @vitest-environment node

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
    getLegalActions,
    initGame,
    POKER_BIG_BLIND,
    POKER_STARTING_STACK,
    processAction,
    startNextHand,
} from "./engine";
import type { PokerAction, PokerActionType, PokerState } from "./types";

function createRng(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function createSeededShuffle(seed: number) {
    const rng = createRng(seed);
    return <T>(arr: T[]): T[] => {
        const next = [...arr];
        for (let i = next.length - 1; i > 0; i -= 1) {
            const j = Math.floor(rng() * (i + 1));
            [next[i], next[j]] = [next[j], next[i]];
        }
        return next;
    };
}

const ACTION_TYPES: PokerActionType[] = [
    "fold",
    "check",
    "call",
    "bet",
    "raise",
    "all_in",
];

type ActionChoice = {
    preferredType: PokerActionType;
    amount: number;
};

const actionChoiceArb: fc.Arbitrary<ActionChoice> = fc.record({
    preferredType: fc.constantFrom(...ACTION_TYPES),
    amount: fc.integer({ min: 1, max: 10000 }),
});

function playerArb(count: number): { id: string; name: string }[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
    }));
}

function pickOne<T>(arr: T[], rng: () => number): T {
    return arr[Math.floor(rng() * arr.length)];
}

function selectAction(
    state: PokerState,
    playerId: string,
    choice: ActionChoice,
    rng: () => number,
): PokerAction | null {
    const legal = getLegalActions(state, playerId);
    if (legal.legalActions.length === 0) return null;

    let type = choice.preferredType;
    if (!legal.legalActions.includes(type)) {
        type = pickOne(legal.legalActions, rng);
    }

    const player = state.players[state.actingPlayerIndex!];
    const callAmount = state.currentBet - player.committedThisStreet;

    if (type === "bet") {
        const maxBet = player.stack;
        if (maxBet < POKER_BIG_BLIND) return null;
        const minBet = POKER_BIG_BLIND;
        const amount = Math.max(minBet, Math.min(maxBet, choice.amount));
        return { type: "bet", amount };
    }

    if (type === "raise") {
        const minTotal = state.currentBet + state.minRaise;
        const maxTotal = player.committedThisStreet + player.stack;
        if (maxTotal < minTotal) return null;
        const amount = Math.max(minTotal, Math.min(maxTotal, choice.amount));
        return { type: "raise", amount };
    }

    return { type };
}

function assertInvariants(state: PokerState): void {
    const totalStartingChips = state.players.length * POKER_STARTING_STACK;
    const totalStack = state.players.reduce((sum, p) => sum + p.stack, 0);
    const totalCommitted = state.players.reduce(
        (sum, p) => sum + p.committedThisHand,
        0,
    );
    const totalPot = state.pots.reduce((sum, pot) => sum + pot.amount, 0);

    try {
        expect(totalStack + totalCommitted).toBe(totalStartingChips);
        expect(totalPot).toBe(totalCommitted);
        expect(state.currentBet).toBeGreaterThanOrEqual(0);
        expect(state.minRaise).toBeGreaterThanOrEqual(POKER_BIG_BLIND);

        if (state.actingPlayerIndex !== null) {
            expect(state.actingPlayerIndex).toBeGreaterThanOrEqual(0);
            expect(state.actingPlayerIndex).toBeLessThan(state.players.length);
            expect(state.players[state.actingPlayerIndex].status).toBe(
                "active",
            );
        }

        if (state.street !== "hand_over" && state.street !== "tournament_over") {
            // Weaker pot check without importing buildPots
            expect(totalPot).toBe(totalCommitted);
        } else {
            expect(totalCommitted).toBe(0);
            expect(totalPot).toBe(0);
            expect(state.currentBet).toBe(0);
            expect(state.actingPlayerIndex).toBeNull();
        }
    } catch (err) {
        console.error("Invariant failed for state:", {
            street: state.street,
            actingPlayerIndex: state.actingPlayerIndex,
            dealerIndex: state.dealerIndex,
            smallBlindIndex: state.smallBlindIndex,
            bigBlindIndex: state.bigBlindIndex,
            currentBet: state.currentBet,
            minRaise: state.minRaise,
            totalStack,
            totalCommitted,
            totalPot,
            totalStartingChips,
            players: state.players.map((p) => ({
                id: p.id,
                stack: p.stack,
                status: p.status,
                committedThisStreet: p.committedThisStreet,
                committedThisHand: p.committedThisHand,
            })),
            pots: state.pots,
        });
        throw err;
    }
}

function logFuzzFailure(
    label: string,
    runDetails: fc.RunDetails<[number, number, number, ActionChoice[]]>,
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

describe("poker engine fuzz", () => {
    it("random full hands maintain invariants", () => {
        const result = fc.check(
            fc.property(
                fc.integer({ min: 1, max: 100000 }),
                fc.integer({ min: 1, max: 100000 }),
                fc.integer({ min: 3, max: 3 }),
                fc.array(actionChoiceArb, {
                    minLength: 50,
                    maxLength: 100,
                }),
                (shuffleSeed, actionSeed, playerCount, choices) => {
                    const shuffle = createSeededShuffle(shuffleSeed);
                    const rng = createRng(actionSeed);
                    const state = initGame(playerArb(playerCount), shuffle);

                    for (const choice of choices) {
                        if (state.street === "tournament_over") break;

                        if (state.street === "hand_over") {
                            if (!startNextHand(state, shuffle)) break;
                        }

                        if (state.actingPlayerIndex === null) break;

                        const playerId = state.players[state.actingPlayerIndex].id;
                        const action = selectAction(
                            state,
                            playerId,
                            choice,
                            rng,
                        );
                        if (!action) continue;

                        const res = processAction(state, playerId, action);
                        if (res.type === "ok") {
                            assertInvariants(state);
                        }
                    }

                    if (state.street !== "tournament_over") {
                        assertInvariants(state);
                    }
                },
            ),
            { numRuns: 50 },
        );
        if (result.failed) {
            logFuzzFailure("poker-engine", result);
            throw new Error("Fuzz failed for poker engine");
        }
    });
});
