import { Data, Effect } from "effect";

import { encodeJsonMessage } from "~/effect/schema-helpers";
import type { BroadcastFn, SendToFn } from "~/game/shared/game-adapter-types";
import { Schema } from "effect";

export class DispatcherEncodeError extends Data.TaggedError(
    "DispatcherEncodeError",
)<{
    readonly messageType: string;
    readonly index: number;
    readonly cause: unknown;
}> {}

export interface Dispatcher {
    broadcastEvent(params: {
        index: number;
        data: unknown;
    }): Effect.Effect<void, DispatcherEncodeError>;
    sendHidden(params: {
        playerId: string;
        index: number;
        data: unknown;
    }): Effect.Effect<void, DispatcherEncodeError>;
    broadcastSnapshot(params: {
        index: number;
        data: unknown;
    }): Effect.Effect<void, DispatcherEncodeError>;
    broadcastRaw(message: unknown): void;
    sendRaw(params: { playerId: string; message: unknown }): void;
}

interface DispatcherConfig {
    readonly eventType: string;
    readonly hiddenType: string;
    readonly snapshotType: string;
    readonly broadcast: BroadcastFn;
    readonly sendTo: SendToFn;
    readonly component?: string;
}

function wrapMessage(
    type: string,
    index: number,
    data: unknown,
): Effect.Effect<string, DispatcherEncodeError> {
    return Effect.try({
        try: () => {
            const schema = Schema.Struct({
                type: Schema.Literal(type),
                index: Schema.Number,
                data: Schema.Unknown,
            });
            return encodeJsonMessage(schema, { type, index, data });
        },
        catch: (cause) => new DispatcherEncodeError({ messageType: type, index, cause }),
    });
}

export function createDispatcher(config: DispatcherConfig): Dispatcher {
    const component = config.component ?? "dispatcher";

    const broadcastEffect = (msg: string) =>
        Effect.sync(() => config.broadcast(msg));

    const sendToEffect = (playerId: string, msg: string) =>
        Effect.sync(() => config.sendTo(playerId, msg));

    return {
        broadcastEvent({ index, data }) {
            return Effect.gen(function* () {
                const msg = yield* wrapMessage(config.eventType, index, data);
                yield* broadcastEffect(msg);

                yield* Effect.logDebug("dispatcher.event.broadcast").pipe(
                    Effect.annotateLogs({
                        component,
                        messageType: config.eventType,
                        index,
                    }),
                );
            });
        },

        sendHidden({ playerId, index, data }) {
            return Effect.gen(function* () {
                const msg = yield* wrapMessage(config.hiddenType, index, data);
                yield* sendToEffect(playerId, msg);

                yield* Effect.logDebug("dispatcher.hidden.sent").pipe(
                    Effect.annotateLogs({
                        component,
                        messageType: config.hiddenType,
                        index,
                        playerId,
                    }),
                );
            });
        },

        broadcastSnapshot({ index, data }) {
            return Effect.gen(function* () {
                const msg = yield* wrapMessage(
                    config.snapshotType,
                    index,
                    data,
                );
                yield* broadcastEffect(msg);

                yield* Effect.logDebug("dispatcher.snapshot.broadcast").pipe(
                    Effect.annotateLogs({
                        component,
                        messageType: config.snapshotType,
                        index,
                    }),
                );
            });
        },

        broadcastRaw(message) {
            config.broadcast(JSON.stringify(message));
        },

        sendRaw({ playerId, message }) {
            config.sendTo(playerId, JSON.stringify(message));
        },
    };
}
