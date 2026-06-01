import { Cause, Effect } from "effect";

import type { GameEngine, SyncResponse } from "~/game/shared/game-engine-types";
import type { BroadcastFn, SendToFn } from "~/game/shared/game-adapter-types";
import { createLedger, type Ledger, type LedgerReduceError } from "~/game/shared/ledger";
import { createDispatcher, type Dispatcher, type DispatcherEncodeError } from "~/game/shared/dispatcher";

type EngineError = LedgerReduceError | DispatcherEncodeError;

import type { RpsState, RpsAction, RpsChoice, BestOf } from "./types";
import type { RpsEvent, RpsHiddenData } from "./events";
import { rpsEventSchema } from "./events";
import { initGame, validateNextRound, getCurrentRound, checkRoundComplete, collectRoundWinners, winsNeeded, resolveThrow, findActiveMatch, getPlayerMatchPosition } from "./mechanics";
import { reduce } from "./reduce";
import { rpsClientMessageSchema } from "./messages";
import { encodeRpsServerMessage, type RpsServerMessage } from "./schemas";
import { decodeUnknownSync } from "~/effect/schema-helpers";

interface RpsEngineConfig {
    broadcast: BroadcastFn;
    sendTo: SendToFn;
}

const COMPONENT = "rps-engine";

interface ThrowTracker {
    p1Choice: RpsChoice | null;
    p2Choice: RpsChoice | null;
}

export function createRpsEngine(config: RpsEngineConfig): GameEngine {
    let ledger: Ledger<RpsState, RpsEvent> | null = null;
    let playerIds: string[] = [];
    let hostPlayerId: string | null = null;

    const hiddenStore = new Map<number, Map<string, RpsHiddenData>>();

    const throwTracker = new Map<number, ThrowTracker>();

    const dispatcher: Dispatcher = createDispatcher({
        eventType: "rps:event",
        hiddenType: "rps:hidden",
        snapshotType: "rps:snapshot",
        broadcast: config.broadcast,
        sendTo: config.sendTo,
        component: COMPONENT,
    });

    function getState(): RpsState {
        return ledger!.getState();
    }

    function appendAndDispatch(event: RpsEvent, hidden?: { playerId: string; data: RpsHiddenData }) {
        return Effect.gen(function* () {
            const result = yield* ledger!.append(event);

            yield* dispatcher.broadcastEvent({
                index: result.index,
                data: event,
            });

            if (hidden) {
                let indexStore = hiddenStore.get(result.index);
                if (!indexStore) {
                    indexStore = new Map();
                    hiddenStore.set(result.index, indexStore);
                }
                indexStore.set(hidden.playerId, hidden.data);

                yield* dispatcher.sendHidden({
                    playerId: hidden.playerId,
                    index: result.index,
                    data: hidden.data,
                });
            }
        });
    }

    function getOrCreateTracker(matchIndex: number): ThrowTracker {
        let tracker = throwTracker.get(matchIndex);
        if (!tracker) {
            tracker = { p1Choice: null, p2Choice: null };
            throwTracker.set(matchIndex, tracker);
        }
        return tracker;
    }

    function validateThrow(
        playerId: string,
    ): { ok: true; matchIndex: number; position: "p1" | "p2" } | { ok: false; error: string } {
        const state = getState();

        if (state.phase !== "throwing") {
            return { ok: false, error: "not_in_throwing_phase" };
        }

        const round = getCurrentRound(state);
        if (!round) {
            return { ok: false, error: "no_current_round" };
        }

        const match = findActiveMatch(round, playerId);
        if (!match) {
            return { ok: false, error: "no_active_match" };
        }

        const position = getPlayerMatchPosition(match, playerId);
        if (!position) {
            return { ok: false, error: "no_active_match" };
        }

        const matchIndex = round.matches.indexOf(match);
        const tracker = getOrCreateTracker(matchIndex);

        const alreadyThrown =
            position === "p1" ? tracker.p1Choice !== null : tracker.p2Choice !== null;
        if (alreadyThrown) {
            return { ok: false, error: "already_thrown" };
        }

        return { ok: true, matchIndex, position };
    }

    function processThrow(action: { playerId: string; choice: RpsChoice }): Effect.Effect<void, EngineError> {
        return Effect.gen(function* () {
            const validation = validateThrow(action.playerId);

            if (!validation.ok) {
                yield* sendError(action.playerId, validation.error);
                return;
            }

            const { matchIndex, position } = validation;
            const state = getState();
            const round = getCurrentRound(state)!;
            const match = round.matches[matchIndex];

            const tracker = getOrCreateTracker(matchIndex);
            if (position === "p1") {
                tracker.p1Choice = action.choice;
            } else {
                tracker.p2Choice = action.choice;
            }

            const hidden: RpsHiddenData = {
                type: "throw_choice",
                choice: action.choice,
            };

            yield* appendAndDispatch(
                { type: "throw_registered", playerId: action.playerId, matchIndex },
                { playerId: action.playerId, data: hidden },
            );

            const otherChoice = position === "p1" ? tracker.p2Choice : tracker.p1Choice;

            if (otherChoice !== null) {
                const p1Choice = tracker.p1Choice!;
                const p2Choice = tracker.p2Choice!;
                const result = resolveThrow(p1Choice, p2Choice);
                const winnerId =
                    result === "p1"
                        ? match.player1Id
                        : result === "p2"
                          ? match.player2Id
                          : null;

                yield* appendAndDispatch({
                    type: "throw_revealed",
                    matchIndex,
                    player1Choice: p1Choice,
                    player2Choice: p2Choice,
                    winnerId,
                });

                throwTracker.delete(matchIndex);

                const p1NewWins = match.player1Wins + (result === "p1" ? 1 : 0);
                const p2NewWins = match.player2Wins + (result === "p2" ? 1 : 0);
                const needed = winsNeeded(state.bestOf);

                if (p1NewWins >= needed || p2NewWins >= needed) {
                    const matchWinnerId = p1NewWins >= needed ? match.player1Id : match.player2Id;

                    yield* appendAndDispatch({
                        type: "match_completed",
                        matchIndex,
                        winnerId: matchWinnerId,
                    });

                    const updatedState = getState();
                    const updatedRound = getCurrentRound(updatedState);
                    if (updatedRound && checkRoundComplete(updatedState)) {
                        const winnerIds = collectRoundWinners(updatedRound);

                        if (winnerIds.length <= 1) {
                            yield* appendAndDispatch({
                                type: "tournament_over",
                                winnerId: winnerIds[0] ?? null,
                            });
                        }
                    }
                }

                yield* ledger!.createSnapshot();
            }
        });
    }

    function processNextRound(playerId: string): Effect.Effect<void, EngineError> {
        return Effect.gen(function* () {
            if (hostPlayerId && playerId !== hostPlayerId) {
                yield* sendError(playerId, "host_only");
                return;
            }

            const state = getState();
            const validation = validateNextRound(state);

            if (!validation.ok) {
                yield* sendError(playerId, validation.error.type);
                return;
            }

            const round = getCurrentRound(state)!;
            const winnerIds = collectRoundWinners(round);

            if (winnerIds.length <= 1) {
                yield* appendAndDispatch({
                    type: "tournament_over",
                    winnerId: winnerIds[0] ?? null,
                });
                return;
            }

            yield* appendAndDispatch({
                type: "round_advanced",
                roundNumber: state.currentRound + 1,
            });

            yield* ledger!.createSnapshot();
        });
    }

    function processSetBestOf(playerId: string, bestOf: BestOf): Effect.Effect<void, EngineError> {
        if (hostPlayerId && playerId !== hostPlayerId) {
            return sendError(playerId, "host_only");
        }

        return appendAndDispatch({ type: "best_of_changed", bestOf });
    }

    function sendSyncResponse(playerId: string, lastSnapshotIndex: number, lastEventIndex: number) {
        const response = buildSyncResponse(playerId, lastSnapshotIndex, lastEventIndex);
        config.sendTo(playerId, encodeRpsServerMessage({ type: "rps:sync_response", ...response } as RpsServerMessage));
    }

    function sendError(playerId: string, message: string): Effect.Effect<void> {
        return Effect.sync(() => {
            config.sendTo(
                playerId,
                encodeRpsServerMessage({ type: "rps:error", data: { message } }),
            );
        });
    }

    function toAction(msg: unknown): RpsAction | null {
        const parsed = decodeUnknownSync(rpsClientMessageSchema, msg);

        if (parsed.type === "rps:throw") {
            return { type: "throw", playerId: parsed.playerId, choice: parsed.data.choice };
        }
        if (parsed.type === "rps:next_round") {
            return { type: "next_round", playerId: parsed.playerId };
        }
        if (parsed.type === "rps:set_best_of") {
            return { type: "set_best_of", playerId: parsed.playerId, bestOf: parsed.data.bestOf };
        }
        if (parsed.type === "rps:sync") {
            return {
                type: "sync",
                playerId: parsed.playerId,
                lastSnapshotIndex: parsed.data.lastSnapshotIndex,
                lastEventIndex: parsed.data.lastEventIndex,
            };
        }
        return null;
    }

    function buildSyncResponse(playerId: string, lastSnapshotIndex: number, lastEventIndex: number): SyncResponse {
        if (!ledger) {
            return {
                snapshot: { index: 0, data: null },
                events: [],
                hidden: [],
            };
        }

        const { snapshot, events } = ledger.getSyncData(
            lastSnapshotIndex,
            lastEventIndex,
        );

        const hidden: { index: number; data: RpsHiddenData }[] = [];
        for (const entry of events) {
            const indexStore = hiddenStore.get(entry.index);
            if (!indexStore) continue;

            const playerHidden = indexStore.get(playerId);
            if (playerHidden) {
                hidden.push({ index: entry.index, data: playerHidden });
            }
        }

        return {
            snapshot: { index: snapshot.index, data: snapshot.state },
            events: events.map((e) => ({
                index: e.index,
                type: e.event.type,
                data: e.event,
            })),
            hidden,
        };
    }

    return {
        initGame(players, hostId) {
            const state = initGame(players);
            ledger = createLedger({
                initialState: state,
                reduce,
                component: COMPONENT,
            });
            playerIds = players.map((p) => p.id);
            hostPlayerId = hostId;

            Effect.runSync(
                Effect.gen(function* () {
                    yield* ledger!.createSnapshot();

                    yield* dispatcher.broadcastSnapshot({
                        index: 0,
                        data: state,
                    });
                }),
            );
        },

        processMessage(raw) {
            const json = JSON.parse(raw);
            const action = toAction(json);
            if (!action) return;

            Effect.runSync(
                Effect.gen(function* () {
                    if (action.type === "throw") {
                        yield* processThrow(action);
                    } else if (action.type === "next_round") {
                        yield* processNextRound(action.playerId);
                    } else if (action.type === "set_best_of") {
                        yield* processSetBestOf(action.playerId, action.bestOf);
                    } else if (action.type === "sync") {
                        sendSyncResponse(action.playerId, action.lastSnapshotIndex, action.lastEventIndex);
                    }
                }).pipe(
                    Effect.catchCause((cause) =>
                        Effect.logError("rps-engine.process.failed").pipe(
                            Effect.annotateLogs({
                                component: COMPONENT,
                                error: Cause.pretty(cause),
                            }),
                        ),
                    ),
                ),
            );
        },

        removePlayer(playerId) {
            if (!ledger) return;

            const state = getState();
            const player = state.players.find((p) => p.id === playerId);
            if (!player || player.eliminated) return;

            Effect.runSync(
                Effect.gen(function* () {
                    const round = getCurrentRound(state);
                    let matchIndex = -1;
                    let matchWinnerId: string | null = null;

                    if (round) {
                        for (let i = 0; i < round.matches.length; i++) {
                            const match = round.matches[i];
                            if (match.status !== "active") continue;
                            if (match.player1Id === playerId) {
                                matchWinnerId = match.player2Id;
                                matchIndex = i;
                                break;
                            }
                            if (match.player2Id === playerId) {
                                matchWinnerId = match.player1Id;
                                matchIndex = i;
                                break;
                            }
                        }
                    }

                    if (matchIndex >= 0 && matchWinnerId) {
                        yield* appendAndDispatch({
                            type: "match_completed",
                            matchIndex,
                            winnerId: matchWinnerId,
                        });
                    }

                    const active = state.players.filter(
                        (p) => p.id !== playerId && !p.eliminated,
                    );
                    if (active.length <= 1) {
                        yield* appendAndDispatch({
                            type: "tournament_over",
                            winnerId: active[0]?.id ?? null,
                        });
                    }
                }),
            );
        },

        endGame() {
            if (!ledger) return;

            Effect.runSync(
                appendAndDispatch({
                    type: "tournament_over",
                    winnerId: getState().winnerId,
                }),
            );
        },

        sync(playerId, lastSnapshotIndex, lastEventIndex) {
            return buildSyncResponse(playerId, lastSnapshotIndex, lastEventIndex);
        },
    };
}
