import { createFileRoute } from "@tanstack/solid-router";
import { env } from "cloudflare:workers";
import { normalizeRoomId } from "~/utils/room-id";

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
                const stub = env.WS.getByName(normalizeRoomId(params.roomId));
                return await stub.fetch(request);
            },
        },
    },
});
