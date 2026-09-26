import { isValidRoomId, normalizeRoomId } from "~/utils/room-id";

export async function handleRoomRequest(
    request: Request,
    roomIdParam: string,
    env: Pick<Env, "WS">,
): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (
        !/\/rpc\/?$/.test(new URL(request.url).pathname) &&
        upgradeHeader?.toLowerCase() !== "websocket"
    ) {
        return new Response("Worker expected Upgrade: websocket", {
            status: 426,
        });
    }
    const roomId = normalizeRoomId(roomIdParam);
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
}
