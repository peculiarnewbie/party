import { env, runInDurableObject } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";

import { initGame } from "~/game/poker";
import { makeState } from "~/game/yahtzee/test-helpers";
import { runObservedSync } from "~/effect/runtime";
import type { PlayerId } from "~/game";
import {
    createDefaultState,
    deletePlayerCapability,
    ensureSchema,
    GAME_SNAPSHOT_KEY,
    loadGameSnapshot,
    loadPlayerCapabilityHash,
    loadRoomState,
    persistPlayerCapabilityHash,
    persistGameSnapshot,
    persistRoomState,
    ROOM_STATE_KEY,
} from "./room-storage";
import type { GameRoom } from "./ws";

const noShuffle = <T>(arr: T[]): T[] => [...arr];

let roomCounter = 0;
function roomStub() {
    const id = env.WS.idFromName(`room-storage-test-${roomCounter++}`);
    return env.WS.get(id);
}

const pid = (s: string) => s as PlayerId;

function withRoom<R>(
    callback: (ctx: DurableObjectState, instance: GameRoom) => Promise<R>,
): Promise<R> {
    const stub = roomStub();
    return runInDurableObject(stub, async (instance, ctx) => {
        await instance.ready;
        return callback(ctx, instance);
    });
}

function seedKv(ctx: DurableObjectState, key: string, value: string) {
    ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)",
        key,
        value,
    );
}

describe("room-storage", () => {
    it("loads valid persisted room state", async () => {
        await withRoom(async (ctx) => {
            const roomState = {
                ...createDefaultState(),
                players: [{ id: pid("p1"), name: "Alice", score: 4 }],
                hostId: pid("p1"),
                phase: "playing" as const,
                selectedGameType: "yahtzee" as const,
                activeGameType: "yahtzee" as const,
                gameSessionId: "session-1",
                gameParticipants: [
                    { playerId: pid("p1"), status: "active" as const },
                ],
            };

            runObservedSync(
                persistRoomState(ctx, roomState),
                "room-storage.persist",
                { component: "room-storage" },
            );

            const loaded = runObservedSync(
                loadRoomState(ctx),
                "room-storage.load",
                { component: "room-storage" },
            );

            expect(loaded.players).toEqual(roomState.players);
            expect(loaded.hostId).toBe("p1");
            expect(loaded.gameParticipants).toEqual(roomState.gameParticipants);
        });
    });

    it("falls back to the default room state for invalid persisted room payloads", async () => {
        await withRoom(async (ctx) => {
            seedKv(ctx, ROOM_STATE_KEY, '{"phase":42}');

            const loaded = runObservedSync(
                loadRoomState(ctx),
                "room-storage.load",
                { component: "room-storage" },
            );

            expect(loaded).toEqual(createDefaultState());
        });
    });

    it("loads a valid poker snapshot", async () => {
        await withRoom(async (ctx) => {
            const snapshot = {
                gameType: "poker" as const,
                state: initGame(
                    [
                        { id: pid("p1"), name: "Alice" },
                        { id: "p2", name: "Bob" },
                    ],
                    noShuffle,
                ),
            };

            runObservedSync(
                persistGameSnapshot(ctx, snapshot),
                "room-storage.persist",
                { component: "room-storage" },
            );

            const loaded = runObservedSync(
                loadGameSnapshot(ctx, "poker"),
                "room-storage.load",
                { component: "room-storage" },
            );

            expect(loaded).toEqual(snapshot);
        });
    });

    it("loads a valid yahtzee snapshot", async () => {
        await withRoom(async (ctx) => {
            const snapshot = {
                gameType: "yahtzee" as const,
                state: makeState({
                    mode: "standard",
                    phase: "mid_turn",
                    dice: [1, 2, 3, 4, 5],
                    held: [false, true, false, true, false],
                }),
            };

            runObservedSync(
                persistGameSnapshot(ctx, snapshot),
                "room-storage.persist",
                { component: "room-storage" },
            );

            const loaded = runObservedSync(
                loadGameSnapshot(ctx, "yahtzee"),
                "room-storage.load",
                { component: "room-storage" },
            );

            expect(loaded).toEqual(snapshot);
        });
    });

    it("returns null and logs when the persisted poker snapshot is invalid", async () => {
        await withRoom(async (ctx) => {
            const logSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => undefined);

            seedKv(
                ctx,
                GAME_SNAPSHOT_KEY,
                JSON.stringify({
                    gameType: "poker",
                    state: {
                        players: [],
                        spectators: [],
                        deck: [],
                        board: [],
                        dealerIndex: 0,
                        smallBlindIndex: 0,
                        bigBlindIndex: 1,
                        actingPlayerIndex: 0,
                        street: "not-a-street",
                        pots: [],
                        currentBet: 20,
                        minRaise: 20,
                        handNumber: 1,
                        lastAggressorIndex: null,
                        endedByHost: false,
                        winnerIds: null,
                        eventLog: [],
                        eventSeq: 0,
                    },
                }),
            );

            const loaded = runObservedSync(
                loadGameSnapshot(ctx, "poker"),
                "room-storage.load",
                { component: "room-storage" },
            );

            expect(loaded).toBeNull();
            expect(logSpy).toHaveBeenCalled();
            logSpy.mockRestore();
        });
    });

    it("returns null and logs when the persisted snapshot is invalid", async () => {
        await withRoom(async (ctx) => {
            const logSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => undefined);

            seedKv(
                ctx,
                GAME_SNAPSHOT_KEY,
                JSON.stringify({
                    gameType: "yahtzee",
                    state: {
                        mode: "standard",
                        players: [],
                        currentPlayerIndex: 0,
                        dice: [1, 2, 3, 4],
                    },
                }),
            );

            const loaded = runObservedSync(
                loadGameSnapshot(ctx, "yahtzee"),
                "room-storage.load",
                { component: "room-storage" },
            );

            expect(loaded).toBeNull();
            expect(logSpy).toHaveBeenCalled();
            logSpy.mockRestore();
        });
    });

    it("round-trips participant rows separately from room metadata", async () => {
        await withRoom(async (ctx) => {
            const roomState = {
                ...createDefaultState(),
                gameSessionId: "session-2",
                gameParticipants: [
                    { playerId: pid("p1"), status: "active" as const },
                    { playerId: pid("p2"), status: "disconnected" as const },
                ],
            };

            runObservedSync(
                persistRoomState(ctx, roomState),
                "room-storage.persist",
                { component: "room-storage" },
            );

            const loaded = runObservedSync(
                loadRoomState(ctx),
                "room-storage.load",
                { component: "room-storage" },
            );

            expect(loaded.gameParticipants).toEqual(roomState.gameParticipants);
        });
    });

    it("round-trips participant batches across multiple SQL chunks", async () => {
        await withRoom(async (ctx) => {
            const participants = Array.from({ length: 45 }, (_, index) => ({
                playerId: pid(`player-${index}`),
                status:
                    index % 3 === 0
                        ? ("disconnected" as const)
                        : ("active" as const),
            }));
            const roomState = {
                ...createDefaultState(),
                gameSessionId: "session-batched",
                gameParticipants: participants,
            };

            runObservedSync(
                persistRoomState(ctx, roomState),
                "room-storage.persist",
                { component: "room-storage" },
            );
            const loaded = runObservedSync(
                loadRoomState(ctx),
                "room-storage.load",
                { component: "room-storage" },
            );

            expect(loaded.gameParticipants).toEqual(participants);
        });
    });

    it("removes obsolete participant rows when a new session is persisted", async () => {
        await withRoom(async (ctx) => {
            runObservedSync(
                persistRoomState(ctx, {
                    ...createDefaultState(),
                    gameSessionId: "session-old",
                    gameParticipants: [
                        { playerId: pid("p1"), status: "active" },
                        { playerId: pid("p2"), status: "disconnected" },
                    ],
                }),
                "room-storage.persist",
                { component: "room-storage" },
            );
            runObservedSync(
                persistRoomState(ctx, {
                    ...createDefaultState(),
                    gameSessionId: "session-current",
                    gameParticipants: [
                        { playerId: pid("p3"), status: "active" },
                    ],
                }),
                "room-storage.persist",
                { component: "room-storage" },
            );

            const storedRows = ctx.storage.sql
                .exec<{
                    session_id: string;
                    player_id: string;
                }>("SELECT session_id, player_id FROM game_participants")
                .toArray();
            const loaded = runObservedSync(
                loadRoomState(ctx),
                "room-storage.load",
                { component: "room-storage" },
            );

            expect(storedRows).toEqual([
                { session_id: "session-current", player_id: "p3" },
            ]);
            expect(loaded.gameParticipants).toEqual([
                { playerId: "p3", status: "active" },
            ]);
        });
    });

    it("upgrades a legacy room schema idempotently without losing state", async () => {
        await withRoom(async (ctx) => {
            const roomState = {
                ...createDefaultState(),
                players: [{ id: pid("p1"), name: "Alice", score: 7 }],
                hostId: pid("p1"),
            };
            runObservedSync(
                persistRoomState(ctx, roomState),
                "room-storage.persist",
                { component: "room-storage" },
            );
            ctx.storage.sql.exec("DROP TABLE player_capabilities");

            runObservedSync(ensureSchema(ctx), "room-storage.schema", {
                component: "room-storage",
            });
            runObservedSync(ensureSchema(ctx), "room-storage.schema", {
                component: "room-storage",
            });
            runObservedSync(
                persistPlayerCapabilityHash(ctx, "p1", "digest"),
                "room-storage.capability.persist",
                { component: "room-storage" },
            );

            const loaded = runObservedSync(
                loadRoomState(ctx),
                "room-storage.load",
                { component: "room-storage" },
            );
            expect(loaded.players).toEqual(roomState.players);
            expect(loaded.hostId).toBe("p1");
            expect(
                runObservedSync(
                    loadPlayerCapabilityHash(ctx, "p1"),
                    "room-storage.capability.load",
                    { component: "room-storage" },
                ),
            ).toBe("digest");
        });
    });

    it("creates, rotates, and deletes player capability digests", async () => {
        await withRoom(async (ctx) => {
            expect(
                runObservedSync(
                    loadPlayerCapabilityHash(ctx, "player-1"),
                    "room-storage.capability.load",
                    { component: "room-storage" },
                ),
            ).toBeNull();

            runObservedSync(
                persistPlayerCapabilityHash(ctx, "player-1", "digest-1"),
                "room-storage.capability.persist",
                { component: "room-storage" },
            );
            expect(
                runObservedSync(
                    loadPlayerCapabilityHash(ctx, "player-1"),
                    "room-storage.capability.load",
                    { component: "room-storage" },
                ),
            ).toBe("digest-1");

            runObservedSync(
                persistPlayerCapabilityHash(ctx, "player-1", "digest-2"),
                "room-storage.capability.rotate",
                { component: "room-storage" },
            );
            expect(
                runObservedSync(
                    loadPlayerCapabilityHash(ctx, "player-1"),
                    "room-storage.capability.load",
                    { component: "room-storage" },
                ),
            ).toBe("digest-2");

            runObservedSync(
                deletePlayerCapability(ctx, "player-1"),
                "room-storage.capability.delete",
                { component: "room-storage" },
            );
            expect(
                runObservedSync(
                    loadPlayerCapabilityHash(ctx, "player-1"),
                    "room-storage.capability.load",
                    { component: "room-storage" },
                ),
            ).toBeNull();
        });
    });
});
