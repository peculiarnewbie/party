import { createSignal } from "solid-js";
import type { GameConnection } from "~/game/connection";

export interface FakeGameConnectionOptions<TView, TOutgoing, TEvent> {
    initialView?: TView | null;
    onSend?: (message: TOutgoing) => void;
    afterSend?: Partial<Record<string, TEvent[]>>;
}

export interface FakeGameConnection<TView, TOutgoing, TEvent>
    extends GameConnection<TView, TOutgoing, TEvent> {
    emit(event: TEvent): void;
    setView(view: TView | null): void;
    readonly sentMessages: readonly TOutgoing[];
}

export function createFakeGameConnection<
    TView,
    TOutgoing extends { type: string } = { type: string },
    TEvent extends { type: string } = { type: string },
>(
    options: FakeGameConnectionOptions<TView, TOutgoing, TEvent> = {},
): FakeGameConnection<TView, TOutgoing, TEvent> {
    const [view, setView] = createSignal<TView | null>(options.initialView ?? null);
    const handlers = new Set<(event: TEvent) => void>();
    const sentMessages: TOutgoing[] = [];
    const afterSend = options.afterSend ?? {};

    const emit = (event: TEvent) => {
        for (const handler of handlers) {
            handler(event);
        }
    };

    return {
        view,
        send: (message) => {
            sentMessages.push(message);
            options.onSend?.(message);

            const queued = afterSend[message.type] ?? [];
            for (const queuedEvent of queued) {
                emit(queuedEvent);
            }
        },
        subscribe: (handler) => {
            handlers.add(handler);
            return () => {
                handlers.delete(handler);
            };
        },
        emit,
        setView: (next) => setView(() => next),
        get sentMessages() {
            return sentMessages;
        },
    };
}
