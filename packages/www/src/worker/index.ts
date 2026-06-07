import handler from "@tanstack/solid-start/server-entry";
import { GameRoom } from "./ws";

const worker = {
    async fetch(request: Request) {
        return handler.fetch(request);
    },
    GameRoom,
} as ExportedHandler<Env> & { GameRoom: typeof GameRoom };

export default worker;
export { GameRoom };
