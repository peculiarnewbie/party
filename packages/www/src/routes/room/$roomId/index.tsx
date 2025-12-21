import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, onCleanup, onMount } from "solid-js";

export const Route = createFileRoute("/room/$roomId/")({
    component: RouteComponent,
});

function RouteComponent() {
    const params = Route.useParams();
    let ws: WebSocket;
    const loaderData = Route.useLoaderData();

    onMount(async () => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/room/${params().roomId}`;

        ws = new WebSocket(wsUrl);
        ws.onmessage = (e) => {
            console.log(e.data);
        };
    });

    onCleanup(() => {
        if (ws) {
            ws.close();
        }
    });

    const connect = (name: string) => {
        ws.send(JSON.stringify({ user: name, data: { message: "hello" } }));
    };

    const [name, setName] = createSignal("");

    return (
        <div>
            <div>Hello "/room/"!</div>
            <input
                type="string"
                value={name()}
                oninput={(e) => setName(e.currentTarget.value)}
            />
            <button onclick={() => connect(name())}>Connect</button>
        </div>
    );
}
