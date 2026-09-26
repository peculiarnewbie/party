import { Effect, Layer, Schema } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import { describe, expect, it } from "vitest";
import { serverMessageSchema } from "~/game";
import { RpsApi } from "~/game/rps/rpc";
import {
    connectClient,
    createRoomStub,
    withRoom,
    type TestRoomClient,
} from "./test-utils/room-e2e";

async function join(client: TestRoomClient, playerId: string) {
    client.send({ type: "join", playerId, playerName: playerId, data: {} });
    const message = await client.waitForMessage(
        (entry) => entry.type === "room_session",
    );
    const session = Schema.decodeUnknownSync(serverMessageSchema)(message);
    if (session.type !== "room_session")
        throw new Error("Expected room session");
    return session.data.sessionToken;
}

function protocol(roomId: string, playerId: string, token: string) {
    const stub = createRoomStub(roomId);
    return RpcClient.layerProtocolHttp({
        url: `https://party.test/api/room/${roomId}/rpc`,
    }).pipe(
        Layer.provide([
            RpcSerialization.layerJson,
            FetchHttpClient.layer.pipe(
                Layer.provide(
                    Layer.succeed(FetchHttpClient.Fetch)((input, init) => {
                        const request = new Request(input, init);
                        request.headers.set("Origin", "https://party.test");
                        request.headers.set("X-Player-Id", playerId);
                        request.headers.set("Authorization", `Bearer ${token}`);
                        return stub.fetch(request);
                    }),
                ),
            ),
        ]),
    );
}

describe("RPS RPC with hibernatable room updates", () => {
    it("authenticates, persists commands once, restores state, and keeps choices private", async () => {
        const roomId = `rps-rpc-${crypto.randomUUID()}`;
        const { client: alice } = await connectClient(roomId);
        const { client: bob } = await connectClient(roomId);
        try {
            const aliceToken = await join(alice, "alice");
            const bobToken = await join(bob, "bob");
            alice.send({
                type: "select_game",
                playerId: "alice",
                playerName: "alice",
                data: { gameType: "rps" },
            });
            await alice.waitForMessage(
                (message) =>
                    message.type === "room_state" &&
                    message.data.selectedGameType === "rps",
            );
            alice.send({
                type: "start",
                playerId: "alice",
                playerName: "alice",
                data: {},
            });
            const started = Schema.decodeUnknownSync(serverMessageSchema)(
                await alice.waitForMessage(
                    (message) =>
                        message.type === "room_state" &&
                        message.data.phase === "playing",
                ),
            );
            if (started.type !== "room_state" || !started.data.gameSessionId)
                throw new Error("Expected active game");
            const gameSessionId = started.data.gameSessionId;
            const command = {
                gameSessionId,
                commandId: "throw-alice-1",
                command: {
                    type: "rps:throw" as const,
                    data: { choice: "rock" as const },
                },
            };
            const aliceProtocol = protocol(roomId, "alice", aliceToken);
            const bobProtocol = protocol(roomId, "bob", bobToken);
            await Effect.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcClient.make(RpsApi);
                    const rejected = yield* client
                        .command({ ...command, gameSessionId: "old-session" })
                        .pipe(Effect.flip);
                    expect(rejected).toMatchObject({
                        _tag: "RpsRequestError",
                        reason: "stale_session",
                    });
                    yield* client.command(command);
                    yield* client.command(command);
                    const own = yield* client.sync({
                        gameSessionId,
                        lastSnapshotIndex: 0,
                        lastEventIndex: 0,
                    });
                    expect(
                        own.hidden.some(
                            (entry) => entry.data.choice === "rock",
                        ),
                    ).toBe(true);
                    const duplicate = yield* client
                        .command({ ...command, commandId: "different-id" })
                        .pipe(Effect.flip);
                    expect(duplicate).toMatchObject({
                        _tag: "RpsRequestError",
                        reason: "rejected",
                        message: "already_thrown",
                    });
                }).pipe(Effect.provide(aliceProtocol), Effect.scoped),
            );
            await withRoom(roomId, (_ctx, room) => {
                room.clearCachedAdapter();
                room.gameStateHolder.current = null;
                room.loadPersistedState();
            });
            await Effect.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcClient.make(RpsApi);
                    yield* client.command(command);
                    const restored = yield* client.sync({
                        gameSessionId,
                        lastSnapshotIndex: 0,
                        lastEventIndex: 0,
                    });
                    expect(
                        restored.hidden.some(
                            (entry) => entry.data.choice === "rock",
                        ),
                    ).toBe(true);
                }).pipe(Effect.provide(aliceProtocol), Effect.scoped),
            );
            await Effect.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcClient.make(RpsApi);
                    const sync = yield* client.sync({
                        gameSessionId,
                        lastSnapshotIndex: 0,
                        lastEventIndex: 0,
                    });
                    expect(sync.hidden).toEqual([]);
                    expect(JSON.stringify(sync)).not.toContain(
                        '"choice":"rock"',
                    );
                    yield* client.command({
                        gameSessionId,
                        commandId: "throw-bob-1",
                        command: {
                            type: "rps:throw",
                            data: { choice: "scissors" },
                        },
                    });
                }).pipe(Effect.provide(bobProtocol), Effect.scoped),
            );
            await alice.waitForMessage(
                (message) =>
                    message.type === "rps:event" &&
                    message.data.type === "throw_revealed",
            );
            const denied = await Effect.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcClient.make(RpsApi);
                    return yield* client
                        .sync({
                            gameSessionId,
                            lastSnapshotIndex: 0,
                            lastEventIndex: 0,
                        })
                        .pipe(Effect.flip);
                }).pipe(
                    Effect.provide(protocol(roomId, "alice", bobToken)),
                    Effect.scoped,
                ),
            );
            expect(denied).toMatchObject({
                _tag: "RpsRequestError",
                reason: "unauthorized",
            });
        } finally {
            alice.close();
            bob.close();
        }
    });

    it("rejects a forged origin", async () => {
        const response = await createRoomStub(
            `rps-rpc-${crypto.randomUUID()}`,
        ).fetch("https://party.test/api/room/test/rpc", {
            method: "POST",
            headers: {
                Origin: "https://attacker.test",
                "Content-Type": "application/json",
            },
            body: "{}",
        });
        expect(response.status).toBe(403);
    });
});
