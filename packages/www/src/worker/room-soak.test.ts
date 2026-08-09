import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
    connectClient,
    type MessageEnvelope,
    type TestRoomClient,
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

async function reconnect(roomId: string, playerId: string, playerName: string) {
    const { client } = await connectClient(roomId);
    const cursor = client.cursor();
    client.send({ type: "identify", playerId, playerName, data: {} });
    await client.waitForMessage(
        (message) =>
            isRoomState(message) &&
            Array.isArray(message.data.players) &&
            message.data.players.some(
                (player: { id: string }) => player.id === playerId,
            ),
        { since: cursor },
    );
    return client;
}

async function closeAll(clients: Iterable<TestRoomClient>) {
    await Promise.all(
        Array.from(clients, async (client) => {
            client.close();
            await client.waitForClose();
        }),
    );
}

beforeAll(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterAll(() => {
    vi.restoreAllMocks();
});

describe("GameRoom bounded soak", () => {
    it("keeps a 32-player room consistent through churn and queued bursts", async () => {
        const roomId = "room-soak-churn";
        const clients = new Map<string, TestRoomClient>();

        try {
            for (let index = 0; index < 32; index += 1) {
                const playerId = `player-${index}`;
                const { client } = await connectClient(roomId);
                clients.set(playerId, client);
                await join(client, playerId, `Player ${index}`);
            }

            const reconnectIds = Array.from(clients.keys()).filter(
                (_, index) => index % 4 === 1,
            );
            for (const playerId of reconnectIds) {
                clients.get(playerId)?.close();
                const replacement = await reconnect(
                    roomId,
                    playerId,
                    `Player ${playerId.slice("player-".length)}`,
                );
                clients.set(playerId, replacement);
            }

            const host = clients.get("player-0");
            expect(host).toBeDefined();
            if (!host) return;

            const cursor = host.cursor();
            for (let index = 0; index < 100; index += 1) {
                host.sendRaw({
                    type: "select_game",
                    playerId: "player-0",
                    playerName: "Player 0",
                    data: { gameType: index % 2 === 0 ? "rps" : "poker" },
                });
            }
            const terminalGame = "yahtzee";
            host.sendRaw({
                type: "select_game",
                playerId: "player-0",
                playerName: "Player 0",
                data: { gameType: terminalGame },
            });
            await host.waitForMessage(
                (message) =>
                    isRoomState(message) &&
                    message.data.selectedGameType === terminalGame,
                { since: cursor, timeoutMs: 15_000 },
            );

            const observed = await withRoom(roomId, (ctx, instance) => ({
                state: instance.state,
                sessionCount: instance.sessions.size,
                playerSocketCount: instance.playerSockets.size,
                socketCounts: Array.from(
                    instance.playerSockets.values(),
                    (sockets) => sockets.size,
                ),
                capabilityCount: ctx.storage.sql
                    .exec<{
                        count: number;
                    }>("SELECT COUNT(*) AS count FROM player_capabilities")
                    .one().count,
            }));
            const playerIds = observed.state.players.map((player) => player.id);

            expect(observed.state.hostId).toBe("player-0");
            expect(observed.state.selectedGameType).toBe(terminalGame);
            expect(playerIds).toHaveLength(32);
            expect(new Set(playerIds).size).toBe(32);
            expect(observed.sessionCount).toBe(32);
            expect(observed.playerSocketCount).toBe(32);
            expect(observed.socketCounts).toEqual(
                Array.from({ length: 32 }, () => 1),
            );
            expect(observed.capabilityCount).toBe(32);
        } finally {
            await closeAll(clients.values());
        }
    });

    it("isolates repeated player identities across eight concurrent rooms", async () => {
        const capabilityHashes = await Promise.all(
            Array.from({ length: 8 }, async (_, roomIndex) => {
                const roomId = `room-soak-isolation-${roomIndex}`;
                const clients: TestRoomClient[] = [];

                try {
                    for (
                        let playerIndex = 0;
                        playerIndex < 8;
                        playerIndex += 1
                    ) {
                        const { client } = await connectClient(roomId);
                        clients.push(client);
                        await join(
                            client,
                            `shared-player-${playerIndex}`,
                            `Player ${playerIndex}`,
                        );
                    }

                    const host = clients[0];
                    const expectedGame = roomIndex % 2 === 0 ? "rps" : "poker";
                    const cursor = host.cursor();
                    host.send({
                        type: "select_game",
                        playerId: "shared-player-0",
                        playerName: "Player 0",
                        data: { gameType: expectedGame },
                    });
                    await host.waitForMessage(
                        (message) =>
                            isRoomState(message) &&
                            message.data.selectedGameType === expectedGame,
                        { since: cursor },
                    );

                    return await withRoom(roomId, (ctx, instance) => {
                        expect(instance.state.players).toHaveLength(8);
                        expect(instance.state.hostId).toBe("shared-player-0");
                        expect(instance.state.selectedGameType).toBe(
                            expectedGame,
                        );
                        expect(instance.sessions.size).toBe(8);
                        return ctx.storage.sql
                            .exec<{ capability_hash: string }>(
                                `
                                    SELECT capability_hash
                                    FROM player_capabilities
                                    WHERE player_id = 'shared-player-0'
                                `,
                            )
                            .one().capability_hash;
                    });
                } finally {
                    await closeAll(clients);
                }
            }),
        );

        expect(new Set(capabilityHashes).size).toBe(8);
    });
});
