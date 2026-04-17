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

type ParticipantRow = {
    player_id: string;
    status: string;
    joined_at: number;
    updated_at: number;
};

const noShuffle = <T,>(arr: T[]): T[] => [...arr];

function result<Row>(rows: Row[]) {
    return {
        toArray() {
            return rows;
        },
    };
}

function createMockState() {
    const kv = new Map<string, string>();
    const participants = new Map<string, ParticipantRow[]>();

    const ctx = {
        storage: {
            sql: {
                exec<Row>(query: string, ...params: unknown[]) {
                    const normalized = query.replace(/\s+/g, " ").trim();

                    if (normalized.startsWith("CREATE TABLE")) {
                        return result<Row>([]);
                    }

                    if (normalized.startsWith("SELECT value FROM kv")) {
                        const key = params[0] as string;
                        const value = kv.get(key);
                        return result<Row>(
                            value === undefined
                                ? []
                                : ([{ value }] as Row[]),
                        );
                    }

                    if (normalized.startsWith("INSERT OR REPLACE INTO kv")) {
                        kv.set(params[0] as string, params[1] as string);
                        return result<Row>([]);
                    }

                    if (normalized.startsWith("DELETE FROM kv")) {
                        kv.delete(params[0] as string);
                        return result<Row>([]);
                    }

                    if (
                        normalized.includes(
                            "SELECT player_id, status FROM game_participants",
                        )
                    ) {
                        const sessionId = params[0] as string;
                        const rows = [...(participants.get(sessionId) ?? [])]
                            .sort((a, b) => a.joined_at - b.joined_at)
                            .map((row) => ({
                                player_id: row.player_id,
                                status: row.status,
                            })) as Row[];
                        return result(rows);
                    }

                    if (
                        normalized.startsWith(
                            "DELETE FROM game_participants WHERE session_id",
                        )
                    ) {
                        participants.delete(params[0] as string);
                        return result<Row>([]);
                    }

                    if (
                        normalized.startsWith(
                            "INSERT INTO game_participants",
                        )
                    ) {
                        const [sessionId, playerId, status, joinedAt, updatedAt] =
                            params as [
                                string,
                                string,
                                string,
                                number,
                                number,
                            ];
                        const rows = participants.get(sessionId) ?? [];
                        rows.push({
                            player_id: playerId,
                            status,
                            joined_at: joinedAt,
                            updated_at: updatedAt,
                        });
                        participants.set(sessionId, rows);
                        return result<Row>([]);
                    }

                    if (
                        normalized === "DELETE FROM game_participants"
                    ) {
                        participants.clear();
                        return result<Row>([]);
                    }

                    throw new Error(`Unexpected SQL query: ${normalized}`);
                },
            },
        },
    } as unknown as DurableObjectState;

    return { ctx, kv, participants };
}

describe("room-storage", () => {
    it("loads valid persisted room state", () => {
        const { ctx } = createMockState();
        const roomState = {
            ...createDefaultState(),
            players: [{ id: "p1", name: "Alice", score: 4 }],
            hostId: "p1",
            phase: "playing" as const,
            selectedGameType: "yahtzee" as const,
            activeGameType: "yahtzee" as const,
            gameSessionId: "session-1",
            gameParticipants: [{ playerId: "p1", status: "active" as const }],
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

    it("falls back to the default room state for invalid persisted room payloads", () => {
        const { ctx, kv } = createMockState();
        kv.set(ROOM_STATE_KEY, '{"phase":42}');

        const loaded = runObservedSync(
            loadRoomState(ctx),
            "room-storage.load",
            { component: "room-storage" },
        );

        expect(loaded).toEqual(createDefaultState());
    });

    it("loads a valid poker snapshot", () => {
        const { ctx } = createMockState();
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

    it("loads a valid yahtzee snapshot", () => {
        const { ctx } = createMockState();
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

    it("returns null and logs when the persisted poker snapshot is invalid", () => {
        const { ctx, kv } = createMockState();
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
            return undefined;
        });

        kv.set(
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
    });

    it("returns null and logs when the persisted snapshot is invalid", () => {
        const { ctx, kv } = createMockState();
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
            return undefined;
        });

        kv.set(
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
    });

    it("round-trips participant rows separately from room metadata", () => {
        const { ctx } = createMockState();
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
