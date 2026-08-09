// @vitest-environment node

import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { decodeUnknownSync } from "~/effect/schema-helpers";
import { createSeededRng, runFuzz } from "~/game/shared/fuzz-test-helpers";

import { createRpsEngine, type RpsEngine } from "./engine-new";
import {
    collectRoundWinners,
    getCurrentRound,
    resolveThrow,
    winsNeeded,
} from "./mechanics";
import { rpsStateSchema } from "./schemas";
import type { BestOf, RpsChoice, RpsState } from "./types";

type WireMessage = Record<string, unknown> & { type: string };

type Harness = {
    engine: RpsEngine;
    broadcasts: WireMessage[];
    direct: { playerId: string; message: WireMessage }[];
};

function createHarness(): Harness {
    const broadcasts: WireMessage[] = [];
    const direct: { playerId: string; message: WireMessage }[] = [];
    const engine = createRpsEngine({
        broadcast: (raw) => broadcasts.push(JSON.parse(raw) as WireMessage),
        sendTo: (playerId, raw) =>
            direct.push({
                playerId,
                message: JSON.parse(raw) as WireMessage,
            }),
    });
    return { engine, broadcasts, direct };
}

function players(count: number): { id: string; name: string }[] {
    return Array.from({ length: count }, (_, index) => ({
        id: `p${index}`,
        name: `Player ${index}`,
    }));
}

function process(
    harness: Harness,
    type: "rps:throw" | "rps:next_round" | "rps:set_best_of",
    playerId: string,
    data: Record<string, unknown>,
): void {
    harness.engine.processMessage(
        JSON.stringify({
            type,
            playerId,
            playerName: playerId,
            data,
        }),
    );
}

function beatingChoice(choice: RpsChoice): RpsChoice {
    if (choice === "rock") return "paper";
    if (choice === "paper") return "scissors";
    return "rock";
}

function choiceFrom(decision: number): RpsChoice {
    return (["rock", "paper", "scissors"] as const)[Math.abs(decision) % 3];
}

function assertPublicMessagesDoNotLeakPendingChoices(
    broadcasts: WireMessage[],
): void {
    for (const message of broadcasts) {
        if (message.type === "rps:snapshot") {
            const snapshot = message.data as RpsState;
            for (const round of snapshot.rounds) {
                for (const match of round.matches) {
                    expect(match.player1Choice).toBeNull();
                    expect(match.player2Choice).toBeNull();
                }
            }
        }
        if (
            message.type === "rps:event" &&
            (message.data as { type?: string }).type === "throw_registered"
        ) {
            expect(message.data).not.toHaveProperty("choice");
            expect(message.data).not.toHaveProperty("player1Choice");
            expect(message.data).not.toHaveProperty("player2Choice");
        }
    }
}

function assertSyncPrivacy(engine: RpsEngine, state: RpsState): void {
    for (const player of state.players) {
        const expected: RpsChoice[] = [];
        const round = getCurrentRound(state);
        if (round) {
            for (const match of round.matches) {
                if (match.player1Id === player.id && match.player1Choice) {
                    expected.push(match.player1Choice);
                }
                if (match.player2Id === player.id && match.player2Choice) {
                    expected.push(match.player2Choice);
                }
            }
        }

        const response = engine.sync(player.id, 0, 0);
        const hidden = response.hidden.map(
            (entry) => (entry.data as { choice: RpsChoice }).choice,
        );
        expect(hidden).toEqual(expected);

        const snapshot = response.snapshot.data as RpsState;
        for (const snapshotRound of snapshot.rounds) {
            for (const match of snapshotRound.matches) {
                expect(match.player1Choice).toBeNull();
                expect(match.player2Choice).toBeNull();
            }
        }
    }
}

function assertStateInvariants(
    harness: Harness,
    state: RpsState,
    deep = false,
): void {
    const playerIds = new Set(state.players.map((player) => player.id));
    expect(playerIds.size).toBe(state.players.length);
    expect(state.eventIndex ?? 0).toBeGreaterThanOrEqual(0);
    expect([1, 3, 5]).toContain(state.bestOf);
    expect(state.currentRound).toBeGreaterThanOrEqual(1);
    expect(state.currentRound).toBeLessThanOrEqual(state.rounds.length);

    for (const [roundIndex, round] of state.rounds.entries()) {
        expect(round.roundNumber).toBe(roundIndex + 1);
        const participantIds = round.matches.flatMap((match) => [
            match.player1Id,
            match.player2Id,
        ]);
        if (round.byePlayerId) participantIds.push(round.byePlayerId);
        expect(new Set(participantIds).size).toBe(participantIds.length);
        expect(
            participantIds.every((playerId) => playerIds.has(playerId)),
        ).toBe(true);

        for (const match of round.matches) {
            const player1Wins = match.throws.filter(
                (entry) => entry.winnerId === match.player1Id,
            ).length;
            const player2Wins = match.throws.filter(
                (entry) => entry.winnerId === match.player2Id,
            ).length;
            expect(match.player1Wins).toBe(player1Wins);
            expect(match.player2Wins).toBe(player2Wins);
            expect(match.player1HasThrown).toBe(match.player1Choice !== null);
            expect(match.player2HasThrown).toBe(match.player2Choice !== null);

            for (const entry of match.throws) {
                const result = resolveThrow(
                    entry.player1Choice,
                    entry.player2Choice,
                );
                expect(entry.winnerId).toBe(
                    result === "p1"
                        ? match.player1Id
                        : result === "p2"
                          ? match.player2Id
                          : null,
                );
            }

            if (match.status === "complete") {
                expect([match.player1Id, match.player2Id]).toContain(
                    match.winnerId,
                );
                const winnerWins =
                    match.winnerId === match.player1Id
                        ? match.player1Wins
                        : match.player2Wins;
                expect(winnerWins).toBeGreaterThanOrEqual(
                    winsNeeded(state.bestOf),
                );
            } else {
                expect(match.winnerId).toBeNull();
                expect(match.player1Wins).toBeLessThan(
                    winsNeeded(state.bestOf),
                );
                expect(match.player2Wins).toBeLessThan(
                    winsNeeded(state.bestOf),
                );
            }
        }
    }

    const currentRound = getCurrentRound(state);
    expect(currentRound).not.toBeNull();
    if (state.phase === "round_results") {
        expect(
            currentRound?.matches.every((match) => match.status === "complete"),
        ).toBe(true);
        expect(collectRoundWinners(currentRound!).length).toBeGreaterThan(1);
    }
    if (state.phase === "tournament_over") {
        expect(state.winnerId).not.toBeNull();
        expect(playerIds.has(state.winnerId!)).toBe(true);
    }

    if (deep) {
        expect(
            decodeUnknownSync(
                rpsStateSchema,
                JSON.parse(JSON.stringify(state)) as unknown,
            ),
        ).toEqual(state);
        assertPublicMessagesDoNotLeakPendingChoices(harness.broadcasts);
        assertSyncPrivacy(harness.engine, state);
    }
}

function assertInvalidActionsDoNotMutate(harness: Harness): void {
    const before = harness.engine.getPersistedState();
    process(harness, "rps:throw", "not-a-player", { choice: "rock" });
    expect(harness.engine.getPersistedState()).toEqual(before);
    process(harness, "rps:set_best_of", "not-the-host", { bestOf: 5 });
    expect(harness.engine.getPersistedState()).toEqual(before);
    process(harness, "rps:next_round", "not-the-host", {});
    expect(harness.engine.getPersistedState()).toEqual(before);
}

function restoreHarness(harness: Harness): Harness {
    const persisted = harness.engine.getPersistedState();
    expect(persisted).not.toBeNull();
    const serialized = decodeUnknownSync(
        rpsStateSchema,
        JSON.parse(JSON.stringify(persisted)) as unknown,
    );
    const restored = createHarness();
    restored.engine.restoreGame(serialized, "p0");
    expect(restored.engine.getPersistedState()).toEqual(persisted);
    return restored;
}

describe("rps engine fuzz", () => {
    it(
        "random tournaments preserve brackets, privacy, and restore equivalence",
        { timeout: 120_000 },
        () => {
            runFuzz(
                "rps-engine",
                fc.property(
                    fc.integer({ min: 1, max: 100_000 }),
                    fc.integer({ min: 2, max: 8 }),
                    fc.constantFrom<BestOf>(1, 3, 5),
                    fc.array(fc.integer(), { minLength: 30, maxLength: 120 }),
                    (seed, playerCount, bestOf, decisions) => {
                        const originalRandom = Math.random;
                        Math.random = createSeededRng(seed);
                        try {
                            let harness = createHarness();
                            harness.engine.initGame(players(playerCount), "p0");
                            process(harness, "rps:set_best_of", "p0", {
                                bestOf,
                            });

                            for (const [
                                index,
                                decision,
                            ] of decisions.entries()) {
                                const state =
                                    harness.engine.getPersistedState();
                                expect(state).not.toBeNull();
                                if (!state) return;
                                assertStateInvariants(
                                    harness,
                                    state,
                                    index % 10 === 0,
                                );

                                if (index % 11 === 0) {
                                    assertInvalidActionsDoNotMutate(harness);
                                }
                                if (index % 7 === 0) {
                                    harness = restoreHarness(harness);
                                }

                                const current =
                                    harness.engine.getPersistedState();
                                expect(current).not.toBeNull();
                                if (
                                    !current ||
                                    current.phase === "tournament_over"
                                ) {
                                    break;
                                }

                                if (current.phase === "round_results") {
                                    process(
                                        harness,
                                        "rps:next_round",
                                        "p0",
                                        {},
                                    );
                                    continue;
                                }

                                const round = getCurrentRound(current);
                                const match = round?.matches.find(
                                    (entry) => entry.status === "active",
                                );
                                expect(match).toBeDefined();
                                if (!match) return;

                                let playerId: string;
                                let choice: RpsChoice;
                                if (match.player1Choice) {
                                    playerId = match.player2Id;
                                    choice = beatingChoice(match.player1Choice);
                                } else if (match.player2Choice) {
                                    playerId = match.player1Id;
                                    choice = beatingChoice(match.player2Choice);
                                } else {
                                    playerId = match.player1Id;
                                    choice = choiceFrom(decision);
                                }

                                process(harness, "rps:throw", playerId, {
                                    choice,
                                });
                                const after =
                                    harness.engine.getPersistedState();
                                expect(after).not.toBeNull();
                                if (!after) return;
                                const afterMatch = getCurrentRound(
                                    after,
                                )?.matches.find(
                                    (entry) =>
                                        entry.player1Id === match.player1Id &&
                                        entry.player2Id === match.player2Id,
                                );
                                if (
                                    afterMatch?.status === "active" &&
                                    (afterMatch.player1Choice ||
                                        afterMatch.player2Choice)
                                ) {
                                    const pendingPlayerId =
                                        afterMatch.player1Choice
                                            ? afterMatch.player1Id
                                            : afterMatch.player2Id;
                                    const beforeDuplicate =
                                        harness.engine.getPersistedState();
                                    process(
                                        harness,
                                        "rps:throw",
                                        pendingPlayerId,
                                        {
                                            choice: "rock",
                                        },
                                    );
                                    expect(
                                        harness.engine.getPersistedState(),
                                    ).toEqual(beforeDuplicate);
                                }
                            }

                            const finalState =
                                harness.engine.getPersistedState();
                            expect(finalState).not.toBeNull();
                            if (finalState) {
                                assertStateInvariants(
                                    harness,
                                    finalState,
                                    true,
                                );
                            }
                        } finally {
                            Math.random = originalRandom;
                        }
                    },
                ),
            );
        },
    );
});
