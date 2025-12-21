import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/api/room/$roomId")({
    server: {
        handlers: {
            GET: async ({ params, request, context, pathname }) => {
                const upgradeHeader = request.headers.get("Upgrade");
                if (!upgradeHeader || upgradeHeader !== "websocket") {
                    return new Response("Worker expected Upgrade: websocket", {
                        status: 426,
                    });
                }
                const stub = env.WS.getByName(params.roomId);
                return await stub.fetch(request);
            },
        },
    },
});
