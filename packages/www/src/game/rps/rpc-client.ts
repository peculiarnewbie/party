import { Effect, Layer } from "effect";
import {
    FetchHttpClient,
    HttpClient,
    HttpClientRequest,
} from "effect/unstable/http";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import { RpsApi, RpsRequestError } from "./rpc";
import type { RpsClientOutgoing } from "./connection";

export function createRpsRpcClient(options: {
    url: string;
    playerId: string;
    sessionToken: () => string | null;
    gameSessionId: () => string | null;
}) {
    return (message: RpsClientOutgoing) =>
        Effect.gen(function* () {
            const gameSessionId = options.gameSessionId();
            const token = options.sessionToken();
            if (!gameSessionId || !token)
                return yield* new RpsRequestError({
                    reason: "unauthorized",
                    message: "Join a game before playing.",
                });
            const protocol = RpcClient.layerProtocolHttp({
                url: options.url,
                transformClient: (client) =>
                    HttpClient.mapRequest(
                        client,
                        HttpClientRequest.setHeaders({
                            "X-Player-Id": options.playerId,
                            Authorization: `Bearer ${token}`,
                        }),
                    ),
            }).pipe(
                Layer.provide([
                    FetchHttpClient.layer,
                    RpcSerialization.layerJson,
                ]),
            );
            return yield* Effect.gen(function* () {
                const client = yield* RpcClient.make(RpsApi);
                if (message.type === "rps:sync")
                    return yield* client.sync({
                        gameSessionId,
                        ...message.data,
                    });
                yield* client.command({
                    gameSessionId,
                    commandId: crypto.randomUUID(),
                    command: message,
                });
                return null;
            }).pipe(Effect.provide(protocol), Effect.scoped);
        });
}
