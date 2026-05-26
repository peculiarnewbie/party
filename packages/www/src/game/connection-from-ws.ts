import { createSignal, onCleanup } from "solid-js";
import type { GameConnection } from "./connection";

export interface CreateGameConnectionOptions<TView, TEvent = never> {
    stateType: string;
    prefix: string;
    envelope: () => { playerId: string | null; playerName: string };
    decodeView?: (data: unknown) => TView | null;
    decodeServerMessage?: (raw: unknown) => TEvent | null;
}

export function createGameConnection<
    TView,
    TOutgoing extends { type: string },
    TEvent extends { type: string } = never,
>(
    ws: WebSocket,
    options: CreateGameConnectionOptions<TView, TEvent>,
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
            const rawData = (payload as unknown as { data: unknown }).data;
            const data = options.decodeView
                ? options.decodeView(rawData)
                : (rawData as TView);
            if (data === null) return;
            setView(() => data);
            return;
        }

        const decoded = options.decodeServerMessage
            ? options.decodeServerMessage(payload)
            : (payload as TEvent);
        if (decoded === null) {
            return;
        }

        for (const handler of handlers) {
            handler(decoded);
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
