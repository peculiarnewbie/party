import { createMemo, createSignal } from "solid-js";
import { decodeUnknownSync } from "~/effect/schema-helpers";
import type { RoomTransport } from "~/room/room-transport";
import type { GameConnection } from "../connection";
import { createRpsFold } from "./client-fold";
import type { RpsClientOutgoing, RpsConnection, RpsSideEvent } from "./connection";
import { rpsServerMessageSchema } from "./schemas";

export function createRpsGameConnection(
    transport: RoomTransport,
    envelope: () => { playerId: string | null; playerName: string },
): RpsConnection {
    const playerId = () => envelope().playerId ?? "";
    const fold = createRpsFold(playerId());
    const [snapshotView, setSnapshotView] = createSignal<
        import("./schemas").RpsPlayerView | null
    >(null);
    const handlers = new Set<(event: RpsSideEvent) => void>();

    const view = createMemo(() => fold.view() ?? snapshotView());

    const handleMessage = (raw: Record<string, unknown>) => {
        if (typeof raw.type !== "string" || !raw.type.startsWith("rps:")) {
            return;
        }

        let message: { type: string; [key: string]: unknown };
        try {
            message = decodeUnknownSync(rpsServerMessageSchema, raw) as {
                type: string;
                [key: string]: unknown;
            };
        } catch {
            return;
        }

        if (message.type === "rps:state") {
            setSnapshotView(() => message.data as import("./schemas").RpsPlayerView);
            return;
        }

        if (message.type === "rps:snapshot") {
            fold.applySnapshot(
                message.index as number,
                message.data as import("./types").RpsState,
            );
        } else if (message.type === "rps:event") {
            const syncInfo = fold.syncInfo();
            const index = message.index as number;
            if (index > syncInfo.lastEventIndex + 1) {
                transport.send({
                    type: "rps:sync",
                    data: syncInfo,
                    playerId: envelope().playerId,
                    playerName: envelope().playerName,
                });
                return;
            }
            fold.processEvent(index, message.data as import("./events").RpsEvent);
        } else if (message.type === "rps:hidden") {
            fold.processHidden(
                message.index as number,
                message.data as import("./events").RpsHiddenData,
            );
        } else if (message.type === "rps:sync_response") {
            fold.applySync(
                message as unknown as import("~/game/shared/game-engine-types").SyncResponse,
            );
        }

        for (const handler of handlers) {
            handler(message as unknown as RpsSideEvent);
        }
    };

    const cached = transport.latest("rps:state") as
        | { data?: import("./schemas").RpsPlayerView }
        | null;
    if (cached?.data) {
        setSnapshotView(() => cached.data as import("./schemas").RpsPlayerView);
    }

    const unsubscribe = transport.subscribe(handleMessage);

    const connection: GameConnection<
        import("./schemas").RpsPlayerView,
        RpsClientOutgoing,
        RpsSideEvent
    > = {
        view,
        send: (message) => {
            const env = envelope();
            transport.send({
                ...message,
                playerId: env.playerId,
                playerName: env.playerName,
            });
        },
        subscribe: (handler) => {
            handlers.add(handler);
            return () => handlers.delete(handler);
        },
        dispose: () => {
            unsubscribe();
            handlers.clear();
            fold.reset();
        },
    };

    return connection;
}
