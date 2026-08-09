import { describe, expect, it } from "vitest";
import {
    connectClient,
    isMessageType,
    type MessageEnvelope,
    type TestRoomClient,
    sleep,
    withRoom,
} from "./test-utils/room-e2e";

function isRoomState(message: MessageEnvelope) {
    return message.type === "room_state";
}

async function join(
    client: TestRoomClient,
    playerId: string,
    playerName: string,
) {
    const cursor = client.cursor();
    client.send({ type: "join", playerId, playerName, data: {} });
    await client.waitForMessage(
        (message) =>
            isRoomState(message) &&
            Array.isArray(message.data.players) &&
            message.data.players.some(
                (player: { id: string }) => player.id === playerId,
            ),
        { since: cursor },
    );
}

async function joinWithCapability(
    client: TestRoomClient,
    playerId: string,
    playerName: string,
) {
    const cursor = client.cursor();
    client.sendRaw({ type: "join", playerId, playerName, data: {} });
    const session = await client.waitForMessage(isMessageType("room_session"), {
        since: cursor,
    });
    await client.waitForMessage(
        (message) =>
            isRoomState(message) &&
            Array.isArray(message.data.players) &&
            message.data.players.some(
                (player: { id: string }) => player.id === playerId,
            ),
        { since: cursor },
    );
    return session.data.sessionToken as string;
}

describe("GameRoom player authority", () => {
    it("rejects a socket that claims an existing host without its capability", async () => {
        const roomId = "room-auth-impersonation";
        const { client: host } = await connectClient(roomId);
        const { client: attacker } = await connectClient(roomId);

        try {
            await join(host, "host-1", "Host");
            const cursor = attacker.cursor();
            attacker.sendRaw({
                type: "identify",
                playerId: "host-1",
                playerName: "Attacker",
                sessionToken: "x".repeat(43),
                data: {},
            });

            const error = await attacker.waitForMessage(
                isMessageType("room_auth_error"),
                { since: cursor },
            );
            expect(error.data.reason).toBe("invalid_session");

            attacker.sendRaw({
                type: "select_game",
                playerId: "host-1",
                playerName: "Attacker",
                data: { gameType: "poker" },
            });

            const state = await withRoom(
                roomId,
                (_, instance) => instance.state,
            );
            expect(state.hostId).toBe("host-1");
            expect(state.selectedGameType).toBe("quiz");
        } finally {
            host.close();
            attacker.close();
        }
    });

    it("allows the issued capability to reconnect the same player", async () => {
        const roomId = "room-auth-reconnect";
        const { client: first } = await connectClient(roomId);

        await join(first, "player-1", "Alice");
        first.close();

        const { client: reconnect } = await connectClient(roomId);
        try {
            const cursor = reconnect.cursor();
            reconnect.send({
                type: "identify",
                playerId: "player-1",
                playerName: "Alice",
                data: {},
            });

            await reconnect.waitForMessage(
                (message) =>
                    isRoomState(message) &&
                    Array.isArray(message.data.players) &&
                    message.data.players.some(
                        (player: { id: string }) => player.id === "player-1",
                    ),
                { since: cursor },
            );

            const attachments = await withRoom(roomId, (ctx) =>
                ctx
                    .getWebSockets()
                    .map((socket) => socket.deserializeAttachment()),
            );
            expect(attachments).toContainEqual({
                id: expect.any(String),
                playerId: "player-1",
                authenticated: true,
            });
        } finally {
            reconnect.close();
        }
    });

    it("prunes disconnected lobby players before the next room action", async () => {
        const roomId = "room-auth-lobby-prune";
        const { client: host } = await connectClient(roomId);
        const { client: guest } = await connectClient(roomId);

        try {
            await join(host, "host-1", "Host");
            await join(guest, "guest-1", "Guest");
            guest.close();
            await sleep(50);

            const cursor = host.cursor();
            host.send({
                type: "select_game",
                playerId: "host-1",
                playerName: "Host",
                data: { gameType: "rps" },
            });

            await host.waitForMessage(
                (message) =>
                    isRoomState(message) &&
                    Array.isArray(message.data.players) &&
                    !message.data.players.some(
                        (player: { id: string }) => player.id === "guest-1",
                    ),
                { since: cursor },
            );
            const state = await withRoom(
                roomId,
                (_, instance) => instance.state,
            );
            expect(state.players.map((player) => player.id)).toEqual([
                "host-1",
            ]);
        } finally {
            host.close();
        }
    });

    it("revokes every socket bound to a player when that player leaves", async () => {
        const roomId = "room-auth-revoke-siblings";
        const { client: first } = await connectClient(roomId);
        const capability = await joinWithCapability(first, "host-1", "Host");
        const { client: sibling } = await connectClient(roomId);

        try {
            const identifyCursor = sibling.cursor();
            sibling.sendRaw({
                type: "identify",
                playerId: "host-1",
                playerName: "Host",
                sessionToken: capability,
                data: {},
            });
            await sibling.waitForMessage(isRoomState, {
                since: identifyCursor,
            });

            const leaveCursor = first.cursor();
            first.send({
                type: "leave",
                playerId: "host-1",
                playerName: "Host",
                data: {},
            });
            await first.waitForMessage(
                (message) =>
                    isRoomState(message) &&
                    Array.isArray(message.data.players) &&
                    message.data.players.length === 0,
                { since: leaveCursor },
            );

            const attachments = await withRoom(roomId, (ctx) =>
                ctx
                    .getWebSockets()
                    .map((socket) => socket.deserializeAttachment()),
            );
            expect(attachments).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        playerId: null,
                        authenticated: false,
                    }),
                ]),
            );
            expect(
                attachments.every(
                    (attachment) =>
                        attachment.playerId === null &&
                        attachment.authenticated === false,
                ),
            ).toBe(true);

            sibling.sendRaw({
                type: "select_game",
                playerId: "host-1",
                playerName: "Host",
                data: { gameType: "poker" },
            });
            await sleep(50);

            const state = await withRoom(
                roomId,
                (_, instance) => instance.state,
            );
            expect(state.selectedGameType).toBe("quiz");
        } finally {
            first.close();
            sibling.close();
        }
    });

    it("serializes back-to-back host actions on an authenticated socket", async () => {
        const roomId = "room-auth-message-order";
        const { client } = await connectClient(roomId);

        try {
            await join(client, "host-1", "Host");
            const cursor = client.cursor();
            client.sendRaw({
                type: "select_game",
                playerId: "host-1",
                playerName: "Host",
                data: { gameType: "rps" },
            });
            client.sendRaw({
                type: "select_game",
                playerId: "host-1",
                playerName: "Host",
                data: { gameType: "poker" },
            });

            await client.waitForMessage(
                (message) =>
                    isRoomState(message) &&
                    message.data.selectedGameType === "poker",
                { since: cursor },
            );
            const state = await withRoom(
                roomId,
                (_, instance) => instance.state,
            );
            expect(state.hostId).toBe("host-1");
            expect(state.selectedGameType).toBe("poker");
        } finally {
            client.close();
        }
    });

    it("ignores malformed text and binary frames without poisoning the socket", async () => {
        const roomId = "room-auth-invalid-frames";
        const { client } = await connectClient(roomId);

        try {
            client.sendText("{");
            client.sendText("x".repeat(64 * 1024));
            client.sendBinary(new TextEncoder().encode("ignored"));
            await join(client, "player-1", "Alice");

            const state = await withRoom(
                roomId,
                (_, instance) => instance.state,
            );
            expect(state.players.map((player) => player.id)).toEqual([
                "player-1",
            ]);
        } finally {
            client.close();
        }
    });

    it("closes a socket that exceeds the application message limit", async () => {
        const roomId = "room-auth-message-limit";
        const { client } = await connectClient(roomId);

        client.sendText("x".repeat(64 * 1024 + 1));
        const closeEvent = await client.waitForClose();

        expect(closeEvent.code).toBe(1009);
        expect(closeEvent.reason).toBe("Message too large");
    });

    it("applies the message limit to encoded bytes, not UTF-16 length", async () => {
        const roomId = "room-auth-unicode-message-limit";
        const { client } = await connectClient(roomId);

        client.sendText("😀".repeat(20_000));
        const closeEvent = await client.waitForClose();

        expect(closeEvent.code).toBe(1009);
    });
});
