import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { displayMessageSchema } from "~/room/display-protocol";
import { pokerPlayerViewSchema } from "~/game/poker/schemas";
import {
    connectClient,
    createRoomStub,
    TestRoomClient,
    withRoom,
} from "./test-utils/room-e2e";

async function connectDisplay(roomId: string) {
    const response = await createRoomStub(roomId).fetch(
        new Request(`http://example.com/rooms/${roomId}?view=display`, {
            headers: { Upgrade: "websocket" },
        }),
    );
    if (!response.webSocket) throw new Error("Missing display socket");
    const client = new TestRoomClient(roomId, response.webSocket);
    await client.waitForMessage((message) => message.type === "display:state");
    return client;
}

async function join(roomId: string, id: string, name: string) {
    const { client } = await connectClient(roomId);
    client.send({ type: "join", playerId: id, playerName: name, data: {} });
    await client.waitForMessage((message) => message.type === "room_session");
    return client;
}

describe("Party mode display connections", () => {
    it.each(["identify", "join", "end", "poker:act"])(
        "does not take a seat or become host, and rejects %s commands",
        async (type) => {
            const roomId = `display-read-only-${type.replace(":", "-")}`;
            const display = await connectDisplay(roomId);
            const before = await withRoom(roomId, (_ctx, room) => ({
                players: room.state.players,
                host: room.state.hostId,
                sessions: room.sessions.size,
            }));
            expect(before).toEqual({ players: [], host: null, sessions: 0 });
            const alice = await join(roomId, "alice", "Alice");
            await display.waitForMessage(
                (message) =>
                    Schema.decodeUnknownSync(displayMessageSchema)(message).data
                        .players.length === 1,
            );
            display.send({
                type,
                playerId: "alice",
                playerName: "Alice",
                data: { type: "fold" },
            });
            expect((await display.waitForClose()).code).toBe(1008);
            expect(
                await withRoom(roomId, (_ctx, room) => room.state.hostId),
            ).toBe("alice");
            alice.close();
        },
    );

    it.each(["poker", "backwards_poker"])(
        "streams public %s changes, reconnects, and pauses when only the display remains",
        async (gameType) => {
            const roomId = `display-${gameType}`;
            const display = await connectDisplay(roomId);
            const alice = await join(roomId, "alice", "Alice");
            const bob = await join(roomId, "bob", "Bob");
            alice.send({
                type: "select_game",
                playerId: "alice",
                playerName: "Alice",
                data: { gameType },
            });
            await alice.waitForMessage(
                (message) =>
                    message.type === "room_state" &&
                    message.data.selectedGameType === gameType,
            );
            alice.send({
                type: "start",
                playerId: "alice",
                playerName: "Alice",
                data: {},
            });
            const start = Schema.decodeUnknownSync(displayMessageSchema)(
                await display.waitForMessage(
                    (message) => message.data.poker !== null,
                ),
            );
            expect(start.data.poker?.players).toHaveLength(2);
            expect(
                start.data.poker?.players.every(
                    (player) => player.visibleHoleCards.length === 0,
                ),
            ).toBe(true);
            expect(start.data.poker).not.toHaveProperty("myHoleCards");
            expect(start.data.poker).not.toHaveProperty("deck");
            const playerMessage = await alice.waitForMessage(
                (message) => message.type === "poker:state",
            );
            const playerView = Schema.decodeUnknownSync(pokerPlayerViewSchema)(
                playerMessage.data,
            );
            expect(playerView.myHoleCards).toHaveLength(
                gameType === "backwards_poker" ? 0 : 2,
            );
            expect(
                playerView.players.find((player) => player.id === "bob")
                    ?.visibleHoleCards,
            ).toHaveLength(gameType === "backwards_poker" ? 2 : 0);
            expect(
                playerView.players.find((player) => player.id === "alice")
                    ?.visibleHoleCards,
            ).toEqual([]);
            const actorId = start.data.poker?.actingPlayerId;
            const actor = actorId === "alice" ? alice : bob;
            actor.send({
                type: "poker:act",
                playerId: actorId,
                playerName: actorId,
                data: { type: "fold" },
            });
            await display.waitForMessage(
                (message) =>
                    Schema.decodeUnknownSync(displayMessageSchema)(message).data
                        .poker?.street === "hand_over",
            );
            display.close();
            const reconnected = await connectDisplay(roomId);
            const snapshot = Schema.decodeUnknownSync(displayMessageSchema)(
                reconnected.messages[0],
            );
            expect(snapshot.data.poker?.street).toBe("hand_over");
            const nextHand = Schema.decodeUnknownSync(displayMessageSchema)(
                await reconnected.waitForMessage(
                    (message) =>
                        Schema.decodeUnknownSync(displayMessageSchema)(message)
                            .data.poker?.handNumber === 2,
                    { timeoutMs: 7000 },
                ),
            );
            expect(
                nextHand.data.poker?.players.every(
                    (player) => player.visibleHoleCards.length === 0,
                ),
            ).toBe(true);
            await withRoom(roomId, (ctx, room) => {
                const displays = ctx
                    .getWebSockets()
                    .filter(
                        (socket) =>
                            socket.deserializeAttachment()?.role === "display",
                    );
                expect(displays.length).toBeGreaterThan(0);
                room.broadcast(
                    JSON.stringify({
                        type: "private:test",
                        data: { secret: "hidden" },
                    }),
                );
                room.broadcastDisplayState();
            });
            alice.close();
            bob.close();
            await reconnected.waitForMessage(
                (message) => message.data.phase === "hibernated",
            );
            expect(
                reconnected.messages.every(
                    (message) => message.type === "display:state",
                ),
            ).toBe(true);
            expect(
                await withRoom(
                    roomId,
                    (_ctx, room) => room.state.gameParticipants,
                ),
            ).toHaveLength(2);
            reconnected.close();
        },
    );
});
