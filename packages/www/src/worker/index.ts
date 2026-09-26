import { GameRoom } from "./ws";
import { handleRoomRequest } from "./room-request";

export default {
    async fetch(request, env) {
        const pathname = new URL(request.url).pathname;
        const room = /^\/api\/room\/([^/]+)(?:\/rpc\/?)?$/.exec(pathname);
        if (room) return handleRoomRequest(request, room[1], env);
        if (pathname.startsWith("/api/"))
            return new Response("Not found", { status: 404 });
        return env.ASSETS.fetch(request);
    },
} satisfies ExportedHandler<Env>;

export { GameRoom };
