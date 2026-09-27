import { createSignal, type Accessor } from "solid-js";
import type { ConnectionStatus, TransportMessage } from "./types";

import { Schema } from "effect";
import { createRpsRpcClient } from "~/game/rps/rpc-client";

const roomSessionSchema = Schema.Struct({
    data: Schema.Struct({ gameSessionId: Schema.NullOr(Schema.String) }),
});

const MESSAGE_LOG_LIMIT = 500;

export interface RoomTransport {
    status: Accessor<ConnectionStatus>;
    rps?: ReturnType<typeof createRpsRpcClient>;
    send(message: unknown): void;
    subscribe(handler: (message: Record<string, unknown>) => void): () => void;
    latest(type: string): unknown | null;
    connect(): void;
    disconnect(): void;
    setSessionToken(token: string): void;
    dispose(): void;
    messageLog: Accessor<readonly TransportMessage[]>;
}

export interface CreateWebSocketRoomTransportOptions {
    roomId: string;
    playerId: string;
    playerName: string;
    sessionToken?: string | null;
    autoConnect?: boolean;
}

function parseMessage(raw: string): Record<string, unknown> | null {
    try {
        const json = JSON.parse(raw) as unknown;
        if (typeof json !== "object" || json === null) return null;
        return json as Record<string, unknown>;
    } catch {
        return null;
    }
}

function messageType(message: Record<string, unknown>): string {
    return typeof message.type === "string" ? message.type : "unknown";
}

export function createWebSocketRoomTransport(
    options: CreateWebSocketRoomTransportOptions,
): RoomTransport {
    let ws: WebSocket | null = null;
    let disposed = false;
    let stopped = false;
    let ready = false;
    let attempts = 0;
    let lastReceived = Date.now();
    let retry: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const clearTimers = () => {
        clearTimeout(retry);
        clearTimeout(watchdog);
        clearInterval(heartbeat);
    };
    let sessionToken = options.sessionToken ?? null;
    let messageId = 0;
    let gameSessionId: string | null = null;
    const subscribers = new Set<(message: Record<string, unknown>) => void>();
    const latestByType = new Map<string, unknown>();

    const [status, setStatus] = createSignal<ConnectionStatus>("disconnected");
    const [messageLog, setMessageLog] = createSignal<
        readonly TransportMessage[]
    >([]);

    const appendLog = (entry: Omit<TransportMessage, "id">) => {
        const next: TransportMessage = { ...entry, id: ++messageId };
        setMessageLog((current) => {
            const merged = [...current, next];
            return merged.length > MESSAGE_LOG_LIMIT
                ? merged.slice(-MESSAGE_LOG_LIMIT)
                : merged;
        });
    };

    const publish = (message: Record<string, unknown>) => {
        const type = messageType(message);
        latestByType.set(type, message);
        if (type === "room_state") {
            const decoded =
                Schema.decodeUnknownOption(roomSessionSchema)(message);
            if (decoded._tag === "Some")
                gameSessionId = decoded.value.data.gameSessionId;
        }
        for (const handler of subscribers) {
            handler(message);
        }
    };

    const withSessionToken = (message: unknown): unknown => {
        if (
            typeof message !== "object" ||
            message === null ||
            !("type" in message) ||
            (message.type !== "identify" && message.type !== "join")
        ) {
            return message;
        }
        return { ...message, sessionToken };
    };

    const redactSessionToken = (message: unknown): unknown => {
        if (
            typeof message !== "object" ||
            message === null ||
            !("sessionToken" in message)
        ) {
            return message;
        }
        return { ...message, sessionToken: "[redacted]" };
    };

    const buildWsUrl = () => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${window.location.host}/api/room/${options.roomId}`;
    };

    const reconnect = (socket: WebSocket) => {
        if (ws !== socket) return;
        ws = null;
        ready = false;
        clearTimers();
        if (!disposed && !stopped) {
            setStatus("reconnecting");
            const delay = Math.min(1000 * 2 ** attempts++, 10_000);
            retry = setTimeout(connect, delay + Math.random() * 300);
        }
        socket.close();
    };

    const connect = () => {
        if (disposed) return;
        stopped = false;
        if (
            ws &&
            (ws.readyState === WebSocket.OPEN ||
                ws.readyState === WebSocket.CONNECTING)
        ) {
            return;
        }

        clearTimers();
        ready = false;
        setStatus(attempts > 0 ? "reconnecting" : "connecting");
        const socket = new WebSocket(buildWsUrl());
        ws = socket;
        watchdog = setTimeout(() => {
            if (ws === socket && !ready) reconnect(socket);
        }, 10_000);

        socket.onopen = () => {
            if (ws !== socket || stopped || disposed) return;
            lastReceived = Date.now();
            socket.send('{"type":"room_ping"}');
            heartbeat = setInterval(() => {
                if (ws !== socket || socket.readyState !== WebSocket.OPEN)
                    return;
                if (Date.now() - lastReceived > 60_000) reconnect(socket);
                else socket.send('{"type":"room_ping"}');
            }, 30_000);
            const identify = {
                playerId: options.playerId,
                playerName: options.playerName,
                sessionToken,
                type: "identify",
                data: {},
            };
            const payload = JSON.stringify(identify);
            socket.send(payload);
            if (import.meta.env.DEV) {
                appendLog({
                    direction: "out",
                    timestamp: Date.now(),
                    type: "identify",
                    payload: redactSessionToken(identify),
                    byteSize: payload.length,
                });
            }
        };

        socket.onmessage = (event) => {
            if (ws !== socket || stopped || disposed) return;
            lastReceived = Date.now();
            const raw = typeof event.data === "string" ? event.data : "";
            const message = parseMessage(raw);
            if (!message) {
                if (import.meta.env.DEV) {
                    appendLog({
                        direction: "in",
                        timestamp: Date.now(),
                        type: "malformed",
                        payload: raw,
                        byteSize: raw.length,
                        decodeError: "invalid_json",
                    });
                }
                return;
            }

            if (message.type === "room_pong") return;
            if (message.type === "room_ready") {
                ready = true;
                attempts = 0;
                clearTimeout(watchdog);
                setStatus("connected");
            }
            if (message.type === "room_auth_error") {
                ready = false;
                stopped = true;
                clearTimers();
                setStatus("session_expired");
                socket.close();
            }
            if (import.meta.env.DEV) {
                appendLog({
                    direction: "in",
                    timestamp: Date.now(),
                    type: messageType(message),
                    payload: message,
                    byteSize: raw.length,
                });
            }
            publish(message);
        };

        socket.onerror = () => {
            if (ws !== socket || stopped || disposed) return;
            reconnect(socket);
        };

        socket.onclose = () => reconnect(socket);
    };

    const disconnect = () => {
        stopped = true;
        ready = false;
        clearTimers();
        const socket = ws;
        ws = null;
        socket?.close();
        setStatus("disconnected");
    };

    const wake = () => {
        if (disposed || stopped || document.visibilityState === "hidden")
            return;
        if (!ws || ws.readyState === WebSocket.CLOSED) connect();
        else if (ws.readyState === WebSocket.OPEN) {
            if (Date.now() - lastReceived > 60_000) reconnect(ws);
            else ws.send('{"type":"room_ping"}');
        }
    };
    if (typeof window !== "undefined") {
        window.addEventListener("online", wake);
        document.addEventListener("visibilitychange", wake);
    }

    const send = (message: unknown) => {
        if (!ready || !ws || ws.readyState !== WebSocket.OPEN) return;
        const authenticatedMessage = withSessionToken(message);
        const payload = JSON.stringify(authenticatedMessage);
        ws.send(payload);
        if (import.meta.env.DEV) {
            const parsed = parseMessage(payload);
            appendLog({
                direction: "out",
                timestamp: Date.now(),
                type: parsed ? messageType(parsed) : "unknown",
                payload: redactSessionToken(parsed ?? authenticatedMessage),
                byteSize: payload.length,
            });
        }
    };

    const subscribe = (handler: (message: Record<string, unknown>) => void) => {
        subscribers.add(handler);
        return () => {
            subscribers.delete(handler);
        };
    };

    const latest = (type: string) => latestByType.get(type) ?? null;

    const dispose = () => {
        disposed = true;
        if (typeof window !== "undefined") {
            window.removeEventListener("online", wake);
            document.removeEventListener("visibilitychange", wake);
        }
        subscribers.clear();
        latestByType.clear();
        disconnect();
    };

    if (options.autoConnect !== false && typeof window !== "undefined") {
        queueMicrotask(connect);
    }

    return {
        status,
        rps: createRpsRpcClient({
            url: `/api/room/${options.roomId}/rpc`,
            playerId: options.playerId,
            sessionToken: () => sessionToken,
            gameSessionId: () => gameSessionId,
        }),
        send,
        subscribe,
        latest,
        connect,
        disconnect,
        setSessionToken: (token) => {
            sessionToken = token;
        },
        dispose,
        messageLog,
    };
}

export function wrapWebSocketAsTransport(ws: WebSocket): RoomTransport {
    const subscribers = new Set<(message: Record<string, unknown>) => void>();
    const latestByType = new Map<string, unknown>();
    const [status, setStatus] = createSignal<ConnectionStatus>(
        ws.readyState === WebSocket.OPEN ? "connected" : "connecting",
    );
    const [messageLog] = createSignal<readonly TransportMessage[]>([]);

    const handler = (event: MessageEvent) => {
        const raw = typeof event.data === "string" ? event.data : "";
        const message = parseMessage(raw);
        if (!message) return;
        const type = messageType(message);
        latestByType.set(type, message);
        for (const sub of subscribers) {
            sub(message);
        }
    };

    ws.addEventListener("message", handler);
    ws.addEventListener("open", () => setStatus("connected"));
    ws.addEventListener("close", () => setStatus("disconnected"));
    ws.addEventListener("error", () => setStatus("error"));

    return {
        status,
        send: (message) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        },
        subscribe: (sub) => {
            subscribers.add(sub);
            return () => subscribers.delete(sub);
        },
        latest: (type) => latestByType.get(type) ?? null,
        connect: () => {},
        disconnect: () => ws.close(),
        setSessionToken: () => {},
        dispose: () => {
            ws.removeEventListener("message", handler);
            subscribers.clear();
            latestByType.clear();
        },
        messageLog,
    };
}
