import { DurableObject } from "cloudflare:workers";
import { MessageType, server } from "~/game";

export class GameRoom extends DurableObject {
    sessions: Map<WebSocket, { [key: string]: string }>;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sessions = new Map();

        this.ctx.getWebSockets().forEach((ws) => {
            let attachment = ws.deserializeAttachment();
            if (attachment) {
                this.sessions.set(ws, { ...attachment });
            }
        });

        this.ctx.setWebSocketAutoResponse(
            new WebSocketRequestResponsePair("ping", "pong"),
        );
    }

    async fetch(request: Request): Promise<Response> {
        const webSocketPair = new WebSocketPair();
        const [client, serverWs] = Object.values(webSocketPair);

        this.ctx.acceptWebSocket(serverWs);

        const id = crypto.randomUUID();
        serverWs.serializeAttachment({ id });
        this.sessions.set(serverWs, { id });

        const send = (msg: string) => serverWs.send(msg);

        const serverInstance = server(this.ctx);

        const players = await serverInstance.getPlayers();
        const hostId = await serverInstance.getHostId();

        send(
            JSON.stringify({
                type: "room_state",
                data: {
                    players: players || [],
                    hostId: hostId || null,
                },
            }),
        );

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    async webSocketMessage(ws: WebSocket, message: string) {
        const broadcast = (msg: string) => {
            this.sessions.forEach((_, connectedWs) => {
                connectedWs.send(msg);
            });
        };

        await server(this.ctx).processMessage(message, broadcast);
    }

    async webSocketClose(
        ws: WebSocket,
        code: number,
        reason: string,
        wasClean: boolean,
    ) {
        this.sessions.delete(ws);
        ws.close(code, "Durable Object is closing WebSocket");
    }
}
