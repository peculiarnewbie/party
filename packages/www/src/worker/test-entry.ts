import { GameRoom } from "./ws";

export default {
    async fetch() {
        return new Response("test entry", { status: 200 });
    },
} as ExportedHandler<Env>;

export { GameRoom };
