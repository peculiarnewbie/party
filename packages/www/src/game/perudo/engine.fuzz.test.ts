// @vitest-environment node

import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { decodeUnknownSync } from "~/effect/schema-helpers";
import { createSeededRng, runFuzz } from "~/game/shared/fuzz-test-helpers";

import {
    finishReveal,
    getActivePlayers,
    getCurrentPlayer,
    initGame,
    isValidBid,
    openBidding,
    processAction,
} from "./engine";
import { perudoStateSchema } from "./schemas";
import type { FaceValue, PerudoState } from "./types";
import { getPlayerView } from "./views";

function players(count: number): { id: string; name: string }[] {
    return Array.from({ length: count }, (_, index) => ({
        id: `p${index}`,
        name: `Player ${index}`,
    }));
}

function dieRoll(rng: () => number): () => number {
    return () => Math.floor(rng() * 6) + 1;
}

function nextBid(
    state: PerudoState,
): { quantity: number; faceValue: FaceValue } | null {
    const bid = state.currentBid;
    if (!bid) return { quantity: 1, faceValue: 1 };
    if (bid.faceValue < 6) {
        return {
            quantity: bid.quantity,
            faceValue: (bid.faceValue + 1) as FaceValue,
        };
    }
    if (bid.quantity < state.totalDiceInPlay) {
        return { quantity: bid.quantity + 1, faceValue: 1 };
    }
    return null;
}

function assertPrivacyAndActions(state: PerudoState): void {
    const active = getActivePlayers(state);
    const current = getCurrentPlayer(state);

    for (const viewer of state.players) {
        const view = getPlayerView(state, viewer.id);
        expect(view.currentPlayerId).toBe(current?.id ?? "");
        expect(
            view.players.filter((player) => player.isCurrentPlayer),
        ).toHaveLength(active.length === 0 ? 0 : 1);
        expect(view.canBid).toBe(
            current?.id === viewer.id &&
                (state.phase === "round_start" || state.phase === "bidding"),
        );
        expect(view.canChallenge).toBe(
            current?.id === viewer.id &&
                state.phase === "bidding" &&
                state.currentBid !== null,
        );

        for (const player of view.players) {
            if (player.eliminated) {
                expect(player.dice).toBeNull();
            } else if (player.id === viewer.id || state.phase === "revealing") {
                expect(player.dice).toEqual(
                    state.players.find((entry) => entry.id === player.id)?.dice,
                );
            } else {
                expect(player.dice).toBeNull();
            }
        }

        if (view.nextHigherBid) {
            expect(
                isValidBid(
                    view.nextHigherBid,
                    state.currentBid,
                    state.totalDiceInPlay,
                ).valid,
            ).toBe(true);
        } else if (state.phase === "round_start" || state.phase === "bidding") {
            expect(nextBid(state)).toBeNull();
        }
    }
}

function assertStateInvariants(state: PerudoState, deep = false): void {
    const active = getActivePlayers(state);
    const totalDice = state.players.reduce(
        (total, player) => total + player.dice.length,
        0,
    );

    expect(state.totalDiceInPlay).toBe(totalDice);
    expect(state.roundNumber).toBeGreaterThanOrEqual(1);
    expect(new Set(state.players.map((player) => player.id)).size).toBe(
        state.players.length,
    );

    for (const player of state.players) {
        expect(player.dice.length).toBeGreaterThanOrEqual(0);
        expect(player.dice.length).toBeLessThanOrEqual(5);
        expect(player.dice.every((die) => die >= 1 && die <= 6)).toBe(true);
        expect(player.eliminated).toBe(player.dice.length === 0);
    }

    if (state.phase === "game_over") {
        expect(active).toHaveLength(1);
        expect(state.winners).toEqual([active[0].id]);
        expect(state.revealTimerActive).toBe(false);
    } else {
        expect(active.length).toBeGreaterThanOrEqual(2);
        expect(state.currentPlayerIndex).toBeGreaterThanOrEqual(0);
        expect(state.currentPlayerIndex).toBeLessThan(active.length);
        expect(state.startingPlayerIndex).toBeGreaterThanOrEqual(0);
        expect(state.startingPlayerIndex).toBeLessThan(active.length);
        expect(getCurrentPlayer(state)).not.toBeNull();
    }

    expect(state.revealTimerActive).toBe(state.phase === "revealing");
    if (deep) {
        expect(
            decodeUnknownSync(
                perudoStateSchema,
                JSON.parse(JSON.stringify(state)) as unknown,
            ),
        ).toEqual(state);
        assertPrivacyAndActions(state);
    }
}

function assertRejectedActionDoesNotMutate(state: PerudoState): void {
    const before = structuredClone(state);
    const result = processAction(state, {
        type: "bid",
        playerId: "not-a-player",
        quantity: 0,
        faceValue: 1,
    });
    expect(result.type).toBe("error");
    expect(state).toEqual(before);
}

describe("perudo engine fuzz", () => {
    it(
        "random full games preserve turns, dice, privacy, and serialization",
        { timeout: 120_000 },
        () => {
            runFuzz(
                "perudo-engine",
                fc.property(
                    fc.integer({ min: 1, max: 100_000 }),
                    fc.integer({ min: 3, max: 8 }),
                    fc.array(fc.integer(), { minLength: 50, maxLength: 120 }),
                    (seed, playerCount, decisions) => {
                        const rng = createSeededRng(seed);
                        const roll = dieRoll(rng);
                        const state = initGame(players(playerCount), roll);

                        for (const [index, decision] of decisions.entries()) {
                            assertStateInvariants(state, index % 10 === 0);
                            assertRejectedActionDoesNotMutate(state);
                            if (state.phase === "game_over") break;

                            if (state.phase === "round_start") {
                                expect(openBidding(state).type).toBe(
                                    "round_started",
                                );
                                continue;
                            }

                            if (state.phase === "revealing") {
                                expect(finishReveal(state, roll).type).toBe(
                                    "round_started",
                                );
                                continue;
                            }

                            const current = getCurrentPlayer(state);
                            expect(current).not.toBeNull();
                            if (!current) return;

                            const candidate = nextBid(state);
                            if (
                                state.currentBid &&
                                (candidate === null ||
                                    Math.abs(decision) % 3 === 0)
                            ) {
                                expect(
                                    processAction(state, {
                                        type: "challenge",
                                        playerId: current.id,
                                    }).type,
                                ).not.toBe("error");
                            } else if (candidate) {
                                expect(
                                    processAction(state, {
                                        type: "bid",
                                        playerId: current.id,
                                        ...candidate,
                                    }).type,
                                ).toBe("bid_placed");
                            }
                        }

                        assertStateInvariants(state, true);
                    },
                ),
            );
        },
    );
});
