import { DurableObject } from "cloudflare:workers";
import { GameState, server } from "~/game";

export class GameRoom extends DurableObject {
    sessions: Map<WebSocket, { id: string }>;
    state: GameState;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sessions = new Map();
        this.state = { players: [], hostId: null, answers: {} };
    }

    async fetch(request: Request): Promise<Response> {
        const webSocketPair = new WebSocketPair();
        const [client, serverWs] = Object.values(webSocketPair);

        serverWs.accept();

        const id = crypto.randomUUID();
        this.sessions.set(serverWs, { id });

        serverWs.send(
            JSON.stringify({
                type: "room_state",
                data: {
                    players: this.state.players,
                    hostId: this.state.hostId,
                },
            }),
        );

        serverWs.addEventListener("message", async (event) => {
            const broadcast = (msg: string) => {
                this.sessions.forEach((_, ws) => ws.send(msg));
            };
            await server(this.state).processMessage(
                event.data as string,
                broadcast,
            );
        });

        serverWs.addEventListener("close", () => {
            this.sessions.delete(serverWs);
        });

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }
}
