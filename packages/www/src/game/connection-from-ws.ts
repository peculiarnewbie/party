import { createSignal, onCleanup } from "solid-js";
import type { GameConnection } from "./connection";

export interface CreateGameConnectionOptions {
    stateType: string;
    prefix: string;
    envelope: () => { playerId: string | null; playerName: string };
}

export function createGameConnection<
    TView,
    TOutgoing extends { type: string },
    TEvent extends { type: string } = never,
>(
    ws: WebSocket,
    options: CreateGameConnectionOptions,
): GameConnection<TView, TOutgoing, TEvent> {
    const [view, setView] = createSignal<TView | null>(null);
    const handlers = new Set<(event: TEvent) => void>();

    const handleMessage = (event: MessageEvent) => {
        let payload: unknown;
        try {
            payload = JSON.parse(event.data);
        } catch {
            return;
        }

        if (
            typeof payload !== "object" ||
            payload === null ||
            !("type" in payload) ||
            typeof (payload as { type: unknown }).type !== "string"
        ) {
            return;
        }

        const messageType = (payload as { type: string }).type;
        if (!messageType.startsWith(options.prefix)) return;

        if (messageType === options.stateType) {
            const data = (payload as unknown as { data: unknown }).data as TView;
            setView(() => data);
            return;
        }

        for (const handler of handlers) {
            handler(payload as TEvent);
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
