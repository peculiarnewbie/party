import { createFileRoute } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { createSignal, onMount } from "solid-js";

// const connectWs = createServerFn({ method: "GET" }).handler(async () => {
//     return (await fetch("ws://localhost:3000/api/room/hey")) as any;
// });

// const connectWs = createServerFn({ method: "GET" }).handler(async () => {
//   const upgradeHeader = request.headers.get("Upgrade");
//   if (!upgradeHeader || upgradeHeader !== "websocket") {
//       return new Response("Worker expected Upgrade: websocket", {
//           status: 426,
//       });
//   }
//   const stub = env.WS.getByName(params.roomId);
//   return await stub.fetch(request);
// });

export const Route = createFileRoute("/room/")({
    // loader: async () => {
    //     return {
    //         ws: await connectWs(),
    //     };
    // },
    component: RouteComponent,
});

function RouteComponent() {
    let ws: WebSocket;
    const loaderData = Route.useLoaderData();

    onMount(async () => {
        ws = new WebSocket("ws://localhost:3000/api/room/hey");
        ws.onmessage = (e) => {
            console.log(e.data);
        };
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
