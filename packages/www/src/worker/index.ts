import handler from "@tanstack/solid-start/server-entry";
import { GameRoom } from "./ws";

export default {
    async fetch(request) {
        return handler.fetch(request);
    },
} as ExportedHandler<Env>;
export { GameRoom };
