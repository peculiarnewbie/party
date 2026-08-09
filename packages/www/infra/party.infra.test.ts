import * as Cloudflare from "alchemy/Cloudflare";
import * as Test from "alchemy/Test/Vitest";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as State from "alchemy/State";
import { expect } from "vitest";

import { makePartyStack } from "../alchemy.run";

type MessageEnvelope = {
    type: string;
    data: object;
};

type MessageWaiter = {
    since: number;
    predicate: (message: MessageEnvelope) => boolean;
    resolve: (message: MessageEnvelope) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
};

class WorkerReadinessError extends Schema.TaggedErrorClass<WorkerReadinessError>()(
    "WorkerReadinessError",
    { message: Schema.String },
) {}

class WebSocketReadinessError extends Schema.TaggedErrorClass<WebSocketReadinessError>()(
    "WebSocketReadinessError",
    { message: Schema.String },
) {}

const stage = process.env.PARTY_INFRA_STAGE ?? "test";
if (!/^test(?:[-_][a-z0-9_-]+)?$/.test(stage)) {
    throw new Error(
        "PARTY_INFRA_STAGE must be 'test' or begin with 'test-'/'test_'",
    );
}

process.env.CI = "true";

const { test, beforeAll, afterAll, deploy, destroy } = Test.make({
    providers: Cloudflare.providers(),
    state: State.localState(),
    profile: process.env.PARTY_INFRA_PROFILE ?? "party",
    stage,
    dev: false,
});

const PartyStack = makePartyStack(State.localState());

const deployed = beforeAll(deploy(PartyStack), { timeout: 300_000 });
afterAll(destroy(PartyStack), { timeout: 300_000 });

function parseEnvelope(raw: unknown): MessageEnvelope {
    let text: string;
    if (typeof raw === "string") {
        text = raw;
    } else if (raw instanceof ArrayBuffer) {
        text = new TextDecoder().decode(raw);
    } else if (ArrayBuffer.isView(raw)) {
        text = new TextDecoder().decode(raw);
    } else {
        throw new Error("Unsupported WebSocket message payload");
    }

    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) {
        throw new Error("WebSocket message must be an object");
    }
    const type = Reflect.get(parsed, "type");
    const data = Reflect.get(parsed, "data");
    if (typeof type !== "string" || typeof data !== "object" || data === null) {
        throw new Error("WebSocket message has an invalid envelope");
    }
    return { type, data };
}

class LiveRoomClient {
    readonly messages: MessageEnvelope[] = [];
    private readonly waiters = new Set<MessageWaiter>();
    private readonly opened: Promise<void>;

    constructor(private readonly socket: WebSocket) {
        this.opened = new Promise((resolve, reject) => {
            socket.addEventListener("open", () => resolve(), { once: true });
            socket.addEventListener(
                "error",
                (event) => {
                    const message = Reflect.get(event, "message");
                    reject(
                        new Error(
                            typeof message === "string"
                                ? `WebSocket connection failed: ${message}`
                                : "WebSocket connection failed",
                        ),
                    );
                },
                { once: true },
            );
        });
        socket.addEventListener("message", (event) => {
            const message = parseEnvelope(event.data);
            const index = this.messages.push(message) - 1;
            for (const waiter of this.waiters) {
                if (index < waiter.since || !waiter.predicate(message)) {
                    continue;
                }
                clearTimeout(waiter.timeout);
                this.waiters.delete(waiter);
                waiter.resolve(message);
            }
        });
        socket.addEventListener("close", () => {
            for (const waiter of this.waiters) {
                clearTimeout(waiter.timeout);
                waiter.reject(
                    new Error("WebSocket closed while waiting for a message"),
                );
            }
            this.waiters.clear();
        });
    }

    static async connect(url: string) {
        const client = new LiveRoomClient(new WebSocket(url));
        await client.opened;
        return client;
    }

    cursor() {
        return this.messages.length;
    }

    send(message: object) {
        this.socket.send(JSON.stringify(message));
    }

    waitForMessage(
        predicate: (message: MessageEnvelope) => boolean,
        options: { since?: number; timeoutMs?: number } = {},
    ) {
        const since = options.since ?? 0;
        const existing = this.messages
            .slice(since)
            .find((message) => predicate(message));
        if (existing) return Promise.resolve(existing);

        return new Promise<MessageEnvelope>((resolve, reject) => {
            const waiter: MessageWaiter = {
                since,
                predicate,
                resolve,
                reject,
                timeout: setTimeout(() => {
                    this.waiters.delete(waiter);
                    reject(
                        new Error("Timed out waiting for WebSocket message"),
                    );
                }, options.timeoutMs ?? 15_000),
            };
            this.waiters.add(waiter);
        });
    }

    close() {
        if (this.socket.readyState === WebSocket.CLOSED) {
            return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
            const timeout = setTimeout(resolve, 5_000);
            this.socket.addEventListener(
                "close",
                () => {
                    clearTimeout(timeout);
                    resolve();
                },
                { once: true },
            );
            this.socket.close(1000, "infra test complete");
        });
    }
}

function roomHasPlayers(message: MessageEnvelope, playerIds: string[]) {
    if (message.type !== "room_state") return false;
    const players = Reflect.get(message.data, "players");
    if (!Array.isArray(players)) return false;
    const observedIds = new Set(
        players.flatMap((player) => {
            if (typeof player !== "object" || player === null) return [];
            const id = Reflect.get(player, "id");
            return typeof id === "string" ? [id] : [];
        }),
    );
    return playerIds.every((playerId) => observedIds.has(playerId));
}

function deployedUrl(output: { url?: string | undefined }) {
    if (!output.url) {
        throw new Error("Alchemy deployment did not return a Worker URL");
    }
    return output.url;
}

function fetchWhenReady(url: string) {
    return Effect.tryPromise({
        try: async () => {
            const response = await fetch(url);
            if (response.status === 404 || response.status >= 500) {
                throw new WorkerReadinessError({
                    message: `Worker is not ready: HTTP ${response.status}`,
                });
            }
            return response;
        },
        catch: (error) =>
            error instanceof WorkerReadinessError
                ? error
                : new WorkerReadinessError({ message: String(error) }),
    }).pipe(
        Effect.retry(
            Schedule.max([
                Schedule.exponential("250 millis"),
                Schedule.recurs(6),
            ]),
        ),
    );
}

function connectWhenReady(url: string) {
    return Effect.tryPromise({
        try: () => LiveRoomClient.connect(url),
        catch: (error) =>
            new WebSocketReadinessError({ message: String(error) }),
    }).pipe(
        Effect.retry(
            Schedule.max([
                Schedule.exponential("250 millis"),
                Schedule.recurs(6),
            ]),
        ),
    );
}

test(
    "provisions an isolated Cloudflare stack",
    Effect.gen(function* () {
        const output = yield* deployed;
        const url = deployedUrl(output);
        const response = yield* fetchWhenReady(url);

        expect(response.status).toBe(200);
        expect(output.stage).toBe(stage);
        expect(output.workerName).not.toBe("party");
        expect(output.databaseName).not.toBe("party");
        expect(output.bucketName).not.toBe("party");
        expect(output.domain).toBeUndefined();
        expect(output.durableObjectNamespaces).toHaveProperty("GameRoom");
    }),
    { timeout: 60_000 },
);

test(
    "routes real WebSockets through a persistent Durable Object",
    Effect.gen(function* () {
        const output = yield* deployed;
        const workerUrl = new URL(deployedUrl(output));
        const roomId = `infra-${crypto.randomUUID().slice(0, 8)}`;
        workerUrl.protocol = workerUrl.protocol === "https:" ? "wss:" : "ws:";
        workerUrl.pathname = `/api/room/${roomId}`;

        const clients: LiveRoomClient[] = [];
        const host = yield* connectWhenReady(workerUrl.toString());
        clients.push(host);
        yield* Effect.promise(async () => {
            try {
                await host.waitForMessage(
                    (message) => message.type === "room_state",
                );
                const hostCursor = host.cursor();
                host.send({
                    type: "join",
                    playerId: "infra-host",
                    playerName: "Infra Host",
                    data: {},
                });
                const session = await host.waitForMessage(
                    (message) => message.type === "room_session",
                    { since: hostCursor },
                );
                const sessionToken = Reflect.get(session.data, "sessionToken");
                if (typeof sessionToken !== "string") {
                    throw new Error("Room did not issue a session capability");
                }
                await host.waitForMessage(
                    (message) => roomHasPlayers(message, ["infra-host"]),
                    { since: hostCursor },
                );

                const guest = await LiveRoomClient.connect(
                    workerUrl.toString(),
                );
                clients.push(guest);
                await guest.waitForMessage(
                    (message) => message.type === "room_state",
                );
                const guestCursor = guest.cursor();
                guest.send({
                    type: "join",
                    playerId: "infra-guest",
                    playerName: "Infra Guest",
                    data: {},
                });
                await guest.waitForMessage(
                    (message) =>
                        roomHasPlayers(message, ["infra-host", "infra-guest"]),
                    { since: guestCursor },
                );

                await host.close();
                const reconnected = await LiveRoomClient.connect(
                    workerUrl.toString(),
                );
                clients.push(reconnected);
                await reconnected.waitForMessage(
                    (message) => message.type === "room_state",
                );
                const reconnectCursor = reconnected.cursor();
                reconnected.send({
                    type: "identify",
                    playerId: "infra-host",
                    playerName: "Infra Host",
                    sessionToken,
                    data: {},
                });
                await reconnected.waitForMessage(
                    (message) =>
                        roomHasPlayers(message, ["infra-host", "infra-guest"]),
                    { since: reconnectCursor },
                );

                const selectCursor = guest.cursor();
                reconnected.send({
                    type: "select_game",
                    playerId: "infra-host",
                    playerName: "Infra Host",
                    data: { gameType: "rps" },
                });
                const selected = await guest.waitForMessage(
                    (message) =>
                        message.type === "room_state" &&
                        Reflect.get(message.data, "selectedGameType") === "rps",
                    { since: selectCursor },
                );
                expect(Reflect.get(selected.data, "hostId")).toBe("infra-host");
            } finally {
                await Promise.all(clients.map((client) => client.close()));
            }
        });
    }),
    { timeout: 60_000 },
);
