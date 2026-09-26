import { Effect } from "effect";
import { HttpEffect } from "effect/unstable/http";
import { RpcSerialization, RpcServer } from "effect/unstable/rpc";
import { RpsApi } from "~/game/rps/rpc";

export function makeRpsRpcHandler(
    handlers: Parameters<typeof RpsApi.toLayer>[0],
) {
    return HttpEffect.toWebHandler(
        RpcServer.toHttpEffect(RpsApi).pipe(
            Effect.flatMap((handle) => handle),
            Effect.provide([
                RpsApi.toLayer(handlers),
                RpcSerialization.layerJson,
            ]),
        ),
    );
}
