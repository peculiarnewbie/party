import {
    env,
    runInDurableObject,
} from "cloudflare:test";
import { expect } from "vitest";

import type { GameRoom } from "~/worker/ws";

export type MessageEnvelope = {
    type: string;
    data: Record<string, unknown>;
};

export class TestRoomClient {
    readonly messages: MessageEnvelope[] = [];

    constructor(readonly socket: WebSocket) {
        socket.accept();
        socket.addEventListener("message", (event) => {
            this.messages.push(parseMessage(event.data));
        });
    }

    cursor() {
        return this.messages.length;
    }

    send(message: Record<string, unknown>) {
        this.socket.send(JSON.stringify(message));
    }

    close(code = 1000, reason = "test complete") {
        this.socket.close(code, reason);
    }

    async waitForMessage<T extends MessageEnvelope = MessageEnvelope>(
        predicate: (message: MessageEnvelope) => message is T,
        options?: { since?: number; timeoutMs?: number },
    ): Promise<T>;
    async waitForMessage(
        predicate: (message: MessageEnvelope) => boolean,
        options?: { since?: number; timeoutMs?: number },
    ): Promise<MessageEnvelope>;
    async waitForMessage(
        predicate: (message: MessageEnvelope) => boolean,
        options: { since?: number; timeoutMs?: number } = {},
    ) {
        const since = options.since ?? 0;
        const timeoutAt = Date.now() + (options.timeoutMs ?? 5_000);

        while (Date.now() < timeoutAt) {
            for (let index = since; index < this.messages.length; index += 1) {
                const message = this.messages[index];
                if (predicate(message)) {
                    return message;
                }
            }

            await sleep(20);
        }

        throw new Error(
            `Timed out waiting for websocket message.\nMessages:\n${JSON.stringify(
                this.messages,
                null,
                2,
            )}`,
        );
    }
}

function parseMessage(raw: unknown): MessageEnvelope {
    if (typeof raw === "string") {
        return JSON.parse(raw) as MessageEnvelope;
    }

    if (raw instanceof ArrayBuffer) {
        return JSON.parse(new TextDecoder().decode(raw)) as MessageEnvelope;
    }

    return JSON.parse(String(raw)) as MessageEnvelope;
}

export function createRoomStub(roomId: string) {
    return env.WS.getByName(roomId);
}

export async function connectClient(roomId: string) {
    const stub = createRoomStub(roomId);
    const response = await stub.fetch(
        new Request(`http://example.com/rooms/${roomId}`, {
            headers: {
                Upgrade: "websocket",
            },
        }),
    );

    expect(response.status).toBe(101);
    expect(response.webSocket).toBeDefined();

    const client = new TestRoomClient(response.webSocket as WebSocket);
    await client.waitForMessage(isMessageType("room_state"));
    return { stub, client };
}

export async function withRoom<R>(
    roomId: string,
    callback: (ctx: DurableObjectState, instance: GameRoom) => Promise<R> | R,
) {
    const stub = createRoomStub(roomId);
    return runInDurableObject(stub, async (instance, ctx) => {
        await instance.ready;
        return callback(ctx, instance);
    });
}

export async function sleep(intervalMs: number) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

export function isMessageType(type: string) {
    return (message: MessageEnvelope) => message.type === type;
}
