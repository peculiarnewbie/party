import { render } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import {
    FakeFixtureWebSocket,
    type FakeFixtureWebSocketOptions,
} from "./fake-fixture-websocket";

export interface RenderWithWsOptions<TEnvelope extends { type: string }>
    extends FakeFixtureWebSocketOptions<TEnvelope> {
    autoStart?: boolean;
}

export function renderWithWs<TEnvelope extends { type: string }>(
    ui: (ws: WebSocket) => JSX.Element,
    options: RenderWithWsOptions<TEnvelope> = {},
) {
    const { autoStart = true, ...socketOptions } = options;
    const socket = new FakeFixtureWebSocket<TEnvelope>(socketOptions);
    const result = render(() => ui(socket as unknown as WebSocket));

    if (autoStart) {
        socket.start();
    }

    return {
        ...result,
        socket,
    };
}
