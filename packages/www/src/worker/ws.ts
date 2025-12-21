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
        const [client, server] = Object.values(webSocketPair);

        this.ctx.acceptWebSocket(server);

        const id = crypto.randomUUID();

        server.serializeAttachment({ id });

        this.sessions.set(server, { id });

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    async webSocketMessage(ws: WebSocket, message: string) {
        const session = this.sessions.get(ws)!;

        const json = JSON.parse(message) as {
            user: string;
            data: any;
            type: MessageType;
        };

        const { user, data, type } = json;
        const s = server();

        if (type === "join") {
            const res = await s.addPlayer(this.ctx, user);
            const ret: { type: MessageType; data: any } = {
                type: "info",
                data: res,
            };
            ws.send(JSON.stringify(ret));

            this.sessions.forEach((attachment, connectedWs) => {
                if (connectedWs !== ws) {
                    connectedWs.send(JSON.stringify(ret));
                }
            });
        }
    }

    async webSocketClose(
        ws: WebSocket,
        code: number,
        reason: string,
        wasClean: boolean,
    ) {
        // If the client closes the connection, the runtime will invoke the webSocketClose() handler.
        this.sessions.delete(ws);
        ws.close(code, "Durable Object is closing WebSocket");
    }
}
