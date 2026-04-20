import type { Accessor } from "solid-js";

export interface GameConnection<TView, TOutgoing, TEvent = never> {
    view: Accessor<TView | null>;
    send: (message: TOutgoing) => void;
    subscribe: (handler: (event: TEvent) => void) => () => void;
}
