import type { Schema } from "effect";
import { createSignal } from "solid-js";
import { decodeUnknownSync } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import type { RoomTransport } from "~/room/room-transport";
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

export function createGameConnectionFromTransport<
    ViewSchema extends Schema.Top,
    ServerSchema extends Schema.Top,
    TStateType extends string,
    TOutgoing extends { type: string },
    TEvent extends { type: string } = never,
>(
    transport: RoomTransport,
    options: CreateGameConnectionOptions<ViewSchema, ServerSchema, TStateType>,
): GameConnection<SchemaType<ViewSchema>, TOutgoing, TEvent> {
    const [view, setView] = createSignal<SchemaType<ViewSchema> | null>(null);
    const handlers = new Set<(event: TEvent) => void>();

    const replayLatest = () => {
        const cached = transport.latest(options.stateType) as
            | { data?: SchemaType<ViewSchema> }
            | null;
        if (cached?.data !== undefined) {
            setView(() => cached.data as SchemaType<ViewSchema>);
        }
    };

    const handleMessage = (raw: Record<string, unknown>) => {
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

    replayLatest();
    const unsubscribe = transport.subscribe(handleMessage);

    return {
        view,
        send: (message) => {
            const env = options.envelope();
            transport.send({
                ...message,
                playerId: env.playerId,
                playerName: env.playerName,
            });
        },
        subscribe: (handler) => {
            handlers.add(handler);
            return () => {
                handlers.delete(handler);
            };
        },
        dispose: () => {
            unsubscribe();
            handlers.clear();
        },
    };
}
