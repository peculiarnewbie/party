import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => {
    return {
        DurableObject: class {
            ctx: DurableObjectState;
            env: Env;

            constructor(ctx: DurableObjectState, env: Env) {
                this.ctx = ctx;
                this.env = env;
            }
        },
    };
});

const { GameRoom } = await import("./ws");
const { GAME_SNAPSHOT_KEY, ROOM_STATE_KEY } = await import("./room-storage");

type ParticipantRow = {
    player_id: string;
    status: string;
    joined_at: number;
    updated_at: number;
};

type LoggedEntry = {
    message?: string;
    level?: string;
    annotations?: Record<string, string>;
};

class FakeWebSocket {
    sent: string[] = [];
    listeners: Record<string, Array<(event?: any) => void | Promise<void>>> = {
        message: [],
        close: [],
    };

    accept() {
        return undefined;
    }

    addEventListener(
        type: string,
        listener: (event?: any) => void | Promise<void>,
    ) {
        this.listeners[type] ??= [];
        this.listeners[type].push(listener);
    }

    send(message: string) {
        this.sent.push(message);
    }

    async dispatch(type: "message" | "close", event?: any) {
        for (const listener of this.listeners[type] ?? []) {
            await listener(event);
        }
    }
}

let lastPair: { client: FakeWebSocket; server: FakeWebSocket } | null = null;

class FakeWebSocketPair {
    0: FakeWebSocket;
    1: FakeWebSocket;

    constructor() {
        this[0] = new FakeWebSocket();
        this[1] = new FakeWebSocket();
        lastPair = {
            client: this[0],
            server: this[1],
        };
    }
}

const OriginalResponse = globalThis.Response;

class WorkerResponse {
    status: number;
    webSocket: unknown;
    body: unknown;

    constructor(body: unknown, init?: { status?: number; webSocket?: unknown }) {
        this.body = body;
        this.status = init?.status ?? 200;
        this.webSocket = init?.webSocket;
    }
}

function createMockContext() {
    const kv = new Map<string, string>();
    const participants = new Map<string, ParticipantRow[]>();

    const ctx = {
        id: {
            toString() {
                return "room-test";
            },
        },
        storage: {
            sql: {
                exec<Row>(query: string, ...params: unknown[]) {
                    const normalized = query.replace(/\s+/g, " ").trim();

                    if (normalized.startsWith("CREATE TABLE")) {
                        return {
                            toArray() {
                                return [] as Row[];
                            },
                        };
                    }

                    if (normalized.startsWith("SELECT value FROM kv")) {
                        const key = params[0] as string;
                        const value = kv.get(key);
                        return {
                            toArray() {
                                return value === undefined
                                    ? ([] as Row[])
                                    : ([{ value }] as Row[]);
                            },
                        };
                    }

                    if (normalized.startsWith("INSERT OR REPLACE INTO kv")) {
                        kv.set(params[0] as string, params[1] as string);
                        return { toArray: () => [] as Row[] };
                    }

                    if (normalized.startsWith("DELETE FROM kv")) {
                        kv.delete(params[0] as string);
                        return { toArray: () => [] as Row[] };
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
                        return { toArray: () => rows };
                    }

                    if (
                        normalized.startsWith(
                            "DELETE FROM game_participants WHERE session_id",
                        )
                    ) {
                        participants.delete(params[0] as string);
                        return { toArray: () => [] as Row[] };
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
                        return { toArray: () => [] as Row[] };
                    }

                    if (normalized === "DELETE FROM game_participants") {
                        participants.clear();
                        return { toArray: () => [] as Row[] };
                    }

                    throw new Error(`Unexpected SQL query: ${normalized}`);
                },
            },
            async setAlarm() {
                return undefined;
            },
            async deleteAlarm() {
                return undefined;
            },
            async deleteAll() {
                kv.clear();
                participants.clear();
            },
        },
        blockConcurrencyWhile<T>(fn: () => Promise<T> | T) {
            return Promise.resolve(fn()).then(() => undefined);
        },
    } as unknown as DurableObjectState;

    return { ctx, kv };
}

async function flushEffects() {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
}

async function createRoom() {
    const { ctx, kv } = createMockContext();
    const room = new GameRoom(ctx, {} as Env);
    await room.ready;
    await room.fetch(new Request("http://example.com/room/test"));

    if (!lastPair) {
        throw new Error("WebSocketPair was not created");
    }

    return {
        room,
        kv,
        serverSocket: lastPair.server,
        clientSocket: lastPair.client,
    };
}

function readLoggedEntries(spy: ReturnType<typeof vi.spyOn>): LoggedEntry[] {
    return spy.mock.calls
        .flatMap((call: unknown[]) => call)
        .flatMap((value: unknown) => {
            if (typeof value !== "string") {
                return [];
            }

            try {
                const parsed = JSON.parse(value) as LoggedEntry;
                return typeof parsed === "object" && parsed !== null
                    ? [parsed]
                    : [];
            } catch {
                return [];
            }
        });
}

function findLoggedEntry(
    entries: LoggedEntry[],
    message: string,
): LoggedEntry & { annotations: Record<string, string> } {
    const entry = entries.find((item) => item.message === message);

    expect(entry).toBeDefined();
    expect(entry?.annotations).toBeDefined();

    return entry as LoggedEntry & { annotations: Record<string, string> };
}

beforeEach(() => {
    lastPair = null;
    Object.assign(globalThis, {
        WebSocketPair: FakeWebSocketPair as unknown as typeof WebSocketPair,
        Response: WorkerResponse as unknown as typeof Response,
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    Object.assign(globalThis, { Response: OriginalResponse });
});

describe("GameRoom worker boundary", () => {
    it("ignores malformed shared-room messages and emits a structured decode log", async () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
            return undefined;
        });
        const { room, serverSocket } = await createRoom();

        await serverSocket.dispatch("message", {
            data: '{"type":"join","playerId":"p1","data":{}}',
        });
        await flushEffects();

        expect(room.state.players).toEqual([]);
        const logs = readLoggedEntries(logSpy);
        const decodeLog = findLoggedEntry(logs, "game-room.room-message.decode");

        expect(decodeLog.level).toBe("WARN");
        expect(decodeLog.annotations).toMatchObject({
            component: "game-room",
            operation: "game-room.room-message.decode",
            roomId: "room-test",
            phase: "lobby",
            sessionCount: "1",
            result: "ignored",
            errorTag: "RoomMessageDecodeError",
        });
    });

    it("ignores malformed poker messages and emits a structured decode log", async () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
            return undefined;
        });
        const { room, serverSocket } = await createRoom();

        room.state.phase = "playing";
        room.state.activeGameType = "poker";

        await serverSocket.dispatch("message", {
            data: JSON.stringify({
                type: "poker:act",
                playerId: "p1",
                playerName: "Alice",
                data: {
                    type: "bet",
                    amount: 0,
                },
            }),
        });
        await flushEffects();

        expect(room.pokerState.current).toBeNull();
        const logs = readLoggedEntries(logSpy);
        const decodeLog = findLoggedEntry(logs, "game-room.poker-message.decode");

        expect(decodeLog.level).toBe("WARN");
        expect(decodeLog.annotations).toMatchObject({
            component: "poker-transport",
            operation: "game-room.poker-message.decode",
            roomId: "room-test",
            gameType: "poker",
            phase: "playing",
            sessionCount: "1",
            result: "ignored",
            errorTag: "PokerMessageDecodeError",
        });
    });

    it("ignores malformed yahtzee messages and emits a structured decode log", async () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
            return undefined;
        });
        const { room, serverSocket } = await createRoom();

        room.state.phase = "playing";
        room.state.activeGameType = "yahtzee";

        await serverSocket.dispatch("message", {
            data: JSON.stringify({
                type: "yahtzee:claim",
                playerId: "p1",
                playerName: "Alice",
                data: {
                    category: "chance",
                    claimedDice: [1, 2, 3, 4],
                },
            }),
        });
        await flushEffects();

        expect(room.yahtzeeState.current).toBeNull();
        const logs = readLoggedEntries(logSpy);
        const decodeLog = findLoggedEntry(
            logs,
            "game-room.yahtzee-message.decode",
        );

        expect(decodeLog.level).toBe("WARN");
        expect(decodeLog.annotations).toMatchObject({
            component: "yahtzee-transport",
            operation: "game-room.yahtzee-message.decode",
            roomId: "room-test",
            gameType: "yahtzee",
            phase: "playing",
            sessionCount: "1",
            result: "ignored",
            errorTag: "YahtzeeMessageDecodeError",
        });
    });

    it("recovers from a corrupted persisted snapshot on startup", async () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
            return undefined;
        });
        const { ctx, kv } = createMockContext();

        kv.set(
            ROOM_STATE_KEY,
            JSON.stringify({
                players: [{ id: "p1", name: "Alice", score: 0 }],
                hostId: "p1",
                answers: {},
                phase: "playing",
                selectedGameType: "yahtzee",
                activeGameType: "yahtzee",
                gameSessionId: null,
                gameParticipants: [],
            }),
        );
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

        const room = new GameRoom(ctx, {} as Env);
        await room.ready;

        expect(room.state.activeGameType).toBe("yahtzee");
        expect(room.yahtzeeState.current).toBeNull();
        const logs = readLoggedEntries(logSpy);
        const decodeLog = findLoggedEntry(logs, "persisted-state.decode-fallback");

        expect(decodeLog.level).toBe("WARN");
        expect(decodeLog.annotations).toMatchObject({
            component: "room-storage",
            operation: "game-room.snapshot.load",
            roomId: "room-test",
            gameType: "yahtzee",
            phase: "playing",
            sessionCount: "0",
            key: "game_snapshot",
            result: "fallback",
            errorTag: "PersistedStateDecodeError",
        });
    });
});
