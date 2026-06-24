import {
    createSignal,
    type Accessor,
} from "solid-js";
import type { ConnectionStatus, TransportMessage } from "./types";

const MESSAGE_LOG_LIMIT = 500;

export interface RoomTransport {
    status: Accessor<ConnectionStatus>;
    send(message: unknown): void;
    subscribe(handler: (message: Record<string, unknown>) => void): () => void;
    latest(type: string): unknown | null;
    connect(): void;
    disconnect(): void;
    dispose(): void;
    messageLog: Accessor<readonly TransportMessage[]>;
}

export interface CreateWebSocketRoomTransportOptions {
    roomId: string;
    playerId: string;
    playerName: string;
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
    let messageId = 0;
    const subscribers = new Set<(message: Record<string, unknown>) => void>();
    const latestByType = new Map<string, unknown>();

    const [status, setStatus] = createSignal<ConnectionStatus>("disconnected");
    const [messageLog, setMessageLog] = createSignal<readonly TransportMessage[]>(
        [],
    );

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
        for (const handler of subscribers) {
            handler(message);
        }
    };

    const buildWsUrl = () => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${window.location.host}/api/room/${options.roomId}`;
    };

    const connect = () => {
        if (disposed) return;
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        setStatus("connecting");
        ws = new WebSocket(buildWsUrl());

        ws.onopen = () => {
            setStatus("connected");
            const identify = {
                playerId: options.playerId,
                playerName: options.playerName,
                type: "identify",
                data: {},
            };
            ws?.send(JSON.stringify(identify));
            appendLog({
                direction: "out",
                timestamp: Date.now(),
                type: "identify",
                payload: identify,
                byteSize: JSON.stringify(identify).length,
            });
        };

        ws.onmessage = (event) => {
            const raw = typeof event.data === "string" ? event.data : "";
            const message = parseMessage(raw);
            if (!message) {
                appendLog({
                    direction: "in",
                    timestamp: Date.now(),
                    type: "malformed",
                    payload: raw,
                    byteSize: raw.length,
                    decodeError: "invalid_json",
                });
                return;
            }

            appendLog({
                direction: "in",
                timestamp: Date.now(),
                type: messageType(message),
                payload: message,
                byteSize: raw.length,
            });
            publish(message);
        };

        ws.onerror = () => {
            setStatus("error");
        };

        ws.onclose = () => {
            ws = null;
            if (!disposed) {
                setStatus("disconnected");
            }
        };
    };

    const disconnect = () => {
        if (!ws) {
            setStatus("disconnected");
            return;
        }
        ws.close();
        ws = null;
        setStatus("disconnected");
    };

    const send = (message: unknown) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const payload = JSON.stringify(message);
        ws.send(payload);
        const parsed = parseMessage(payload);
        appendLog({
            direction: "out",
            timestamp: Date.now(),
            type: parsed ? messageType(parsed) : "unknown",
            payload: parsed ?? message,
            byteSize: payload.length,
        });
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
        subscribers.clear();
        latestByType.clear();
        disconnect();
    };

    if (options.autoConnect !== false && typeof window !== "undefined") {
        connect();
    }

    return {
        status,
        send,
        subscribe,
        latest,
        connect,
        disconnect,
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
        dispose: () => {
            ws.removeEventListener("message", handler);
            subscribers.clear();
            latestByType.clear();
        },
        messageLog,
    };
}
