import { createFileRoute } from "@tanstack/solid-router";
import { env } from "cloudflare:workers";
import { isValidRoomId, normalizeRoomId } from "~/utils/room-id";

export const Route = createFileRoute("/api/room/$roomId")({
    server: {
        handlers: {
            GET: async ({ params, request, context, pathname }) => {
                const upgradeHeader = request.headers.get("Upgrade");
                if (upgradeHeader?.toLowerCase() !== "websocket") {
                    return new Response("Worker expected Upgrade: websocket", {
                        status: 426,
                    });
                }
                const roomId = normalizeRoomId(params.roomId);
                if (!isValidRoomId(roomId)) {
                    return new Response("Invalid room ID", { status: 400 });
                }

                const origin = request.headers.get("Origin");
                if (origin && origin !== new URL(request.url).origin) {
                    return new Response("WebSocket origin not allowed", {
                        status: 403,
                    });
                }

                const stub = env.WS.getByName(roomId);
                return await stub.fetch(request);
            },
        },
    },
});
