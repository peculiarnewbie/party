import { createSignal } from "solid-js";
import { Effect, Queue, Schema, Stream } from "effect";
import type { RoomTransport } from "~/room/room-transport";
import type { GameConnection } from "../connection";
import { createRpsFold } from "./client-fold";
import type {
    RpsClientOutgoing,
    RpsConnection,
    RpsSideEvent,
} from "./connection";
import { rpsServerMessageSchema } from "./schemas";

export function createRpsGameConnection(
    transport: RoomTransport,
    envelope: () => { playerId: string | null; playerName: string },
): RpsConnection {
    const playerId = () => envelope().playerId ?? "";
    const fold = createRpsFold(playerId());
    const [snapshotView, setSnapshotView] = createSignal<
        import("./schemas").RpsPlayerView | null
    >(() => {
        const decoded = Schema.decodeUnknownOption(rpsServerMessageSchema)(
            transport.latest("rps:state"),
        );
        return decoded._tag === "Some" && decoded.value.type === "rps:state"
            ? decoded.value.data
            : null;
    });
    const handlers = new Set<(event: RpsSideEvent) => void>();
    let syncPending = false;
    const lifetime = new AbortController();

    const view = () => fold.view() ?? snapshotView();

    const handleMessage = (raw: Record<string, unknown>) => {
        if (typeof raw.type !== "string" || !raw.type.startsWith("rps:")) {
            return;
        }

        const decoded = Schema.decodeUnknownOption(rpsServerMessageSchema)(raw);
        if (decoded._tag === "None") return;
        const message = decoded.value;

        if (message.type === "rps:state") {
            setSnapshotView(() => message.data);
            return;
        }

        if (message.type === "rps:snapshot") {
            fold.applySnapshot(message.index, message.data);
        } else if (message.type === "rps:event") {
            const syncInfo = fold.syncInfo();
            const index = message.index;
            if (index > syncInfo.lastEventIndex + 1) {
                if (!syncPending) {
                    syncPending = true;
                    send({ type: "rps:sync", data: syncInfo });
                }
                return;
            }
            fold.processEvent(index, message.data);
        } else if (message.type === "rps:hidden") {
            fold.processHidden(message.index, message.data);
        } else if (message.type === "rps:sync_response") {
            syncPending = false;
            fold.applySync(message);
        }

        for (const handler of handlers) {
            handler(message);
        }
    };

    const send = (message: RpsClientOutgoing) => {
        if (transport.rps) {
            Effect.runFork(
                transport.rps(message).pipe(
                    Effect.tap((reply) =>
                        Effect.sync(() => {
                            if (reply) handleMessage(reply);
                        }),
                    ),
                    Effect.catch((error) =>
                        Effect.sync(() => {
                            syncPending = false;
                            const event: RpsSideEvent = {
                                type: "rps:error",
                                data: {
                                    message:
                                        error._tag === "RpsRequestError"
                                            ? error.message
                                            : "Connection interrupted. Reconnect to resynchronize.",
                                },
                            };
                            for (const handler of handlers) handler(event);
                        }),
                    ),
                ),
                { signal: lifetime.signal },
            );
            return;
        }
        const env = envelope();
        transport.send({
            ...message,
            playerId: env.playerId,
            playerName: env.playerName,
        });
    };

    const updates = Stream.callback<Record<string, unknown>>((queue) =>
        Effect.acquireRelease(
            Effect.sync(() =>
                transport.subscribe((message) => {
                    Queue.offerUnsafe(queue, message);
                }),
            ),
            (unsubscribe) => Effect.sync(unsubscribe),
        ),
    );
    Effect.runFork(
        updates.pipe(
            Stream.runForEach((message) =>
                Effect.sync(() => handleMessage(message)),
            ),
        ),
        { signal: lifetime.signal },
    );
    queueMicrotask(() => {
        if (lifetime.signal.aborted) return;
        for (const type of ["rps:snapshot", "rps:sync_response"]) {
            const message = transport.latest(type);
            if (message && typeof message === "object") {
                const decoded = Schema.decodeUnknownOption(
                    rpsServerMessageSchema,
                )(message);
                if (decoded._tag === "Some") handleMessage(decoded.value);
            }
        }
    });

    const connection: GameConnection<
        import("./schemas").RpsPlayerView,
        RpsClientOutgoing,
        RpsSideEvent
    > = {
        view,
        send,
        subscribe: (handler) => {
            handlers.add(handler);
            return () => handlers.delete(handler);
        },
        dispose: () => {
            lifetime.abort();
            handlers.clear();
            fold.reset();
        },
    };

    return connection;
}
