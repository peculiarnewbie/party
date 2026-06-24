import type { Schema } from "effect";
import { onCleanup } from "solid-js";
import type { SchemaType } from "~/effect/schema-types";
import { wrapWebSocketAsTransport } from "~/room/room-transport";
import type { GameConnection } from "./connection";
import {
    createGameConnectionFromTransport,
    type CreateGameConnectionOptions,
} from "./connection-from-transport";

export type { CreateGameConnectionOptions };

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
    const transport = wrapWebSocketAsTransport(ws);
    const connection = createGameConnectionFromTransport(transport, options);
    onCleanup(() => {
        connection.dispose?.();
        transport.dispose();
    });
    return connection;
}
