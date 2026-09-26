import { Schema } from "effect";
import { createEffect, createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import { displayMessageSchema, type DisplayState } from "./display-protocol";
import type { ConnectionStatus } from "./types";

export function createDisplayClient(roomId: Accessor<string>) {
    const [state, setState] = createSignal<DisplayState | null>(null);
    const [status, setStatus] = createSignal<ConnectionStatus>("connecting");
    const decode = Schema.decodeUnknownOption(
        Schema.fromJsonString(displayMessageSchema),
    );

    createEffect(roomId, (id) => {
        setState(null);
        setStatus("connecting");
        let socket: WebSocket | null = null;
        let retry: ReturnType<typeof setTimeout> | undefined;
        let disposed = false;
        let attempts = 0;

        const connect = () => {
            if (disposed) return;
            const url = new URL(
                `/api/room/${encodeURIComponent(id)}`,
                window.location.origin,
            );
            url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
            url.searchParams.set("view", "display");
            socket = new WebSocket(url);
            socket.onopen = () => {
                attempts = 0;
            };
            socket.onmessage = (event) => {
                const decoded = decode(event.data);
                if (decoded._tag === "None") {
                    setStatus("error");
                    return;
                }
                setState(decoded.value.data);
                setStatus("connected");
            };
            socket.onerror = () => setStatus("error");
            socket.onclose = () => {
                if (disposed) return;
                setStatus("reconnecting");
                retry = setTimeout(
                    connect,
                    Math.min(1000 * 2 ** attempts++, 10000),
                );
            };
        };

        connect();
        return () => {
            disposed = true;
            clearTimeout(retry);
            socket?.close();
        };
    });

    return { state, status };
}
