import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flush } from "solid-js";
import {
    createWebSocketRoomTransport,
    type RoomTransport,
} from "./room-transport";

class TestSocket {
    static OPEN = 1;
    static CONNECTING = 0;
    static CLOSED = 3;
    static instances: TestSocket[] = [];
    readyState = 0;
    sent: string[] = [];
    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    constructor(_url: string) {
        TestSocket.instances.push(this);
    }
    send(value: string) {
        this.sent.push(value);
    }
    open() {
        this.readyState = 1;
        this.onopen?.();
    }
    close() {
        this.readyState = 3;
        this.onclose?.();
    }
    receive(message: unknown) {
        this.onmessage?.({ data: JSON.stringify(message) });
    }
}

let transport: RoomTransport;
const socket = () => TestSocket.instances[TestSocket.instances.length - 1];
beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", TestSocket);
    TestSocket.instances = [];
    transport = createWebSocketRoomTransport({
        roomId: "room",
        playerId: "player",
        playerName: "Alex",
        sessionToken: "saved-token",
        autoConnect: false,
    });
    transport.connect();
});
afterEach(() => {
    transport.dispose();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

function ready() {
    socket().open();
    socket().receive({ type: "room_ready", data: { authenticated: true } });
    flush();
}

describe("room reconnection", () => {
    it("waits for authenticated resynchronization before accepting actions", () => {
        socket().open();
        flush();
        expect(transport.status()).toBe("connecting");
        transport.send({ type: "poker:action" });
        expect(socket().sent).toHaveLength(2);
        expect(JSON.parse(socket().sent[1])).toMatchObject({
            type: "identify",
            sessionToken: "saved-token",
        });
        socket().receive({
            type: "room_state",
            data: { gameSessionId: "game" },
        });
        flush();
        expect(transport.status()).toBe("connecting");
        socket().receive({ type: "room_ready", data: { authenticated: true } });
        flush();
        expect(transport.status()).toBe("connected");
        transport.send({ type: "poker:action" });
        expect(socket().sent).toHaveLength(3);
    });

    it("retries with the same identity and never replays offline actions", async () => {
        ready();
        socket().close();
        flush();
        expect(transport.status()).toBe("reconnecting");
        transport.send({
            type: "poker:action",
            data: { type: "raise", amount: 100 },
        });
        await vi.advanceTimersByTimeAsync(1400);
        ready();
        expect(TestSocket.instances).toHaveLength(2);
        expect(
            socket().sent.map((message) => JSON.parse(message).type),
        ).toEqual(["room_ping", "identify"]);
        expect(transport.status()).toBe("connected");
    });

    it("ignores late events from a replaced socket", () => {
        ready();
        const old = socket();
        transport.disconnect();
        transport.connect();
        ready();
        old.onclose?.();
        old.onerror?.();
        old.receive({
            type: "room_auth_error",
            data: { reason: "invalid_session" },
        });
        flush();
        expect(transport.status()).toBe("connected");
        transport.send({ type: "join" });
        expect(socket().sent).toHaveLength(3);
    });

    it("stops retries for an intentional disconnect or disposal", async () => {
        ready();
        transport.disconnect();
        window.dispatchEvent(new Event("online"));
        await vi.advanceTimersByTimeAsync(120_000);
        expect(TestSocket.instances).toHaveLength(1);
        transport.connect();
        socket().close();
        transport.dispose();
        await vi.advanceTimersByTimeAsync(120_000);
        expect(TestSocket.instances).toHaveLength(2);
    });

    it("recovers stalled handshakes and silent sockets", async () => {
        await vi.advanceTimersByTimeAsync(11_400);
        expect(TestSocket.instances).toHaveLength(2);
        ready();
        await vi.advanceTimersByTimeAsync(91_400);
        expect(TestSocket.instances.length).toBeGreaterThanOrEqual(3);
    });

    it("surfaces invalid credentials without an endless retry loop", async () => {
        socket().open();
        socket().receive({
            type: "room_auth_error",
            data: { reason: "invalid_session" },
        });
        flush();
        expect(transport.status()).toBe("session_expired");
        await vi.advanceTimersByTimeAsync(120_000);
        expect(TestSocket.instances).toHaveLength(1);
    });
    it("retries a silent connection without waiting for its close handshake", async () => {
        ready();
        const stalled = socket();
        stalled.close = () => {
            stalled.readyState = 2;
        };
        await vi.advanceTimersByTimeAsync(90_000);
        flush();
        expect(transport.status()).toBe("reconnecting");
        await vi.advanceTimersByTimeAsync(1400);
        expect(TestSocket.instances).toHaveLength(2);
        ready();
        stalled.onclose?.();
        flush();
        expect(transport.status()).toBe("connected");
    });
});
