import type { Schema } from "effect";
import { createSignal, onCleanup } from "solid-js";
import { decodeUnknownSync } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import type { GameConnection } from "./connection";

export interface CreateGameConnectionOptions<
    ViewSchema extends Schema.Top,
    ServerSchema extends Schema.Top,
    TStateType extends string,
> {
    stateType: TStateType;
    prefix: string;
    envelope: () => { playerId: string | null; playerName: string };
    playerViewSchema: ViewSchema;
    serverMessageSchema: ServerSchema;
}

export function createGameConnection<
    ViewSchema extends Schema.Top,
    ServerSchema extends Schema.Top,
    TStateType extends string,
    TOutgoing extends { type: string },
    TEvent extends { type: string } = never,
>(
    ws: WebSocket,
    options: CreateGameConnectionOptions<ViewSchema, ServerSchema, TStateType>,
): GameConnection<SchemaType<ViewSchema>, TOutgoing, TEvent> {
    const [view, setView] = createSignal<SchemaType<ViewSchema> | null>(null);
    const handlers = new Set<(event: TEvent) => void>();

    const handleMessage = (event: MessageEvent) => {
        let raw: Record<string, unknown>;
        try {
            raw = JSON.parse(event.data as string) as Record<string, unknown>;
        } catch {
            return;
        }

        if (typeof raw.type !== "string") return;
        if (!raw.type.startsWith(options.prefix)) return;

        let message: SchemaType<ServerSchema> & { type: string };
        try {
            message = decodeUnknownSync(options.serverMessageSchema, raw) as SchemaType<ServerSchema> & { type: string };
        } catch {
            return;
        }

        if (message.type === options.stateType) {
            const data = (message as unknown as { data: SchemaType<ViewSchema> })
                .data;
            setView(() => data);
            return;
        }

        for (const handler of handlers) {
            handler(message as unknown as TEvent);
        }
    };

    ws.addEventListener("message", handleMessage);
    onCleanup(() => {
        ws.removeEventListener("message", handleMessage);
        handlers.clear();
    });

    return {
        view,
        send: (message) => {
            const env = options.envelope();
            ws.send(
                JSON.stringify({
                    ...message,
                    playerId: env.playerId,
                    playerName: env.playerName,
                }),
            );
        },
        subscribe: (handler) => {
            handlers.add(handler);
            return () => {
                handlers.delete(handler);
            };
        },
    };
}
