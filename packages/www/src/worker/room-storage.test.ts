import { env, runInDurableObject } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";

import { initGame } from "~/game/poker";
import { makeState } from "~/game/yahtzee/test-helpers";
import { runObservedSync } from "~/effect/runtime";
import {
    createDefaultState,
    GAME_SNAPSHOT_KEY,
    loadGameSnapshot,
    loadRoomState,
    persistGameSnapshot,
    persistRoomState,
    ROOM_STATE_KEY,
} from "./room-storage";
import type { GameRoom } from "./ws";

const noShuffle = <T,>(arr: T[]): T[] => [...arr];

let roomCounter = 0;
function roomStub() {
    const id = env.WS.idFromName(`room-storage-test-${roomCounter++}`);
    return env.WS.get(id);
}

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
                players: [{ id: "p1", name: "Alice", score: 4 }],
                hostId: "p1",
                phase: "playing" as const,
                selectedGameType: "yahtzee" as const,
                activeGameType: "yahtzee" as const,
                gameSessionId: "session-1",
                gameParticipants: [
                    { playerId: "p1", status: "active" as const },
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
                        { id: "p1", name: "Alice" },
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
                    { playerId: "p1", status: "active" as const },
                    { playerId: "p2", status: "disconnected" as const },
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
});
