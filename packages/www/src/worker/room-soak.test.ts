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

type RpsSoakState = {
    eventIndex?: number;
    bestOf: number;
    currentRound: number;
    phase: "throwing" | "round_results" | "tournament_over";
    winnerId: string | null;
    rounds: {
        roundNumber: number;
        matches: {
            player1Id: string;
            player2Id: string;
            player1Choice: "rock" | "paper" | "scissors" | null;
            player2Choice: "rock" | "paper" | "scissors" | null;
            status: "active" | "complete";
        }[];
    }[];
};

function isRpsSnapshot(message: MessageEnvelope) {
    return message.type === "rps:snapshot";
}

function isRpsSyncResponse(message: MessageEnvelope) {
    return message.type === "rps:sync_response";
}

function isRpsEvent(eventType: string) {
    return (message: MessageEnvelope) =>
        message.type === "rps:event" && message.data.type === eventType;
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

async function selectRpsAndStart(
    client: TestRoomClient,
    playerId: string,
    playerName: string,
) {
    const selectCursor = client.cursor();
    client.send({
        type: "select_game",
        playerId,
        playerName,
        data: { gameType: "rps" },
    });
    await client.waitForMessage(
        (message) =>
            isRoomState(message) && message.data.selectedGameType === "rps",
        { since: selectCursor },
    );

    const startCursor = client.cursor();
    client.send({ type: "start", playerId, playerName, data: {} });
    await client.waitForMessage(isRpsSnapshot, { since: startCursor });

    const bestOfCursor = client.cursor();
    client.send({
        type: "rps:set_best_of",
        playerId,
        playerName,
        data: { bestOf: 1 },
    });
    await client.waitForMessage(isRpsEvent("best_of_changed"), {
        since: bestOfCursor,
    });
}

async function readRpsState(roomId: string): Promise<RpsSoakState> {
    return withRoom(roomId, (_, instance) =>
        structuredClone(instance.gameStateHolder.current as RpsSoakState),
    );
}

async function playRpsSoakRoom(roomIndex: number) {
    const roomId = `room-soak-rps-actions-${roomIndex}`;
    const clients = new Map<string, TestRoomClient>();
    const names = new Map<string, string>();

    try {
        for (let playerIndex = 0; playerIndex < 4; playerIndex += 1) {
            const playerId = `player-${playerIndex}`;
            const playerName = `Player ${playerIndex}`;
            const { client } = await connectClient(roomId);
            clients.set(playerId, client);
            names.set(playerId, playerName);
            await join(client, playerId, playerName);
        }

        await selectRpsAndStart(
            clients.get("player-0")!,
            "player-0",
            "Player 0",
        );

        let recoveredPendingThrow = false;
        for (let actionCount = 0; actionCount < 32; actionCount += 1) {
            const state = await readRpsState(roomId);
            if (state.phase === "tournament_over") break;

            if (state.phase === "round_results") {
                const host = clients.get("player-0")!;
                const cursor = host.cursor();
                host.send({
                    type: "rps:next_round",
                    playerId: "player-0",
                    playerName: "Player 0",
                    data: {},
                });
                await host.waitForMessage(isRpsEvent("round_advanced"), {
                    since: cursor,
                });
                continue;
            }

            const round = state.rounds.find(
                (entry) => entry.roundNumber === state.currentRound,
            );
            const match = round?.matches.find(
                (entry) => entry.status === "active",
            );
            expect(match).toBeDefined();
            if (!match) break;

            const firstId = match.player1Choice
                ? match.player2Id
                : match.player1Id;
            const firstChoice = match.player1Choice ? "paper" : "rock";
            const first = clients.get(firstId)!;
            const firstCursor = first.cursor();
            first.send({
                type: "rps:throw",
                playerId: firstId,
                playerName: names.get(firstId)!,
                data: { choice: firstChoice },
            });
            await first.waitForMessage(isRpsEvent("throw_registered"), {
                since: firstCursor,
            });

            const afterFirst = await readRpsState(roomId);
            const pendingMatch = afterFirst.rounds
                .find((entry) => entry.roundNumber === afterFirst.currentRound)
                ?.matches.find(
                    (entry) =>
                        entry.player1Id === match.player1Id &&
                        entry.player2Id === match.player2Id,
                );
            expect(pendingMatch).toBeDefined();
            if (!pendingMatch) break;

            const secondId = pendingMatch.player1Choice
                ? pendingMatch.player2Id
                : pendingMatch.player1Id;
            if (!recoveredPendingThrow) {
                clients.get(secondId)!.close();
                const replacement = await reconnect(
                    roomId,
                    secondId,
                    names.get(secondId)!,
                );
                clients.set(secondId, replacement);
                await replacement.waitForMessage(isRpsSyncResponse);
                await withRoom(roomId, (_, instance) => {
                    instance.clearCachedAdapter();
                });
                recoveredPendingThrow = true;
            }

            const second = clients.get(secondId)!;
            const secondCursor = second.cursor();
            second.send({
                type: "rps:throw",
                playerId: secondId,
                playerName: names.get(secondId)!,
                data: { choice: "paper" },
            });
            await second.waitForMessage(isRpsEvent("throw_revealed"), {
                since: secondCursor,
            });
        }

        const observed = await withRoom(roomId, (ctx, instance) => ({
            state: structuredClone(
                instance.gameStateHolder.current as RpsSoakState,
            ),
            persisted: JSON.parse(
                ctx.storage.sql
                    .exec<{
                        value: string;
                    }>("SELECT value FROM kv WHERE key = 'game_snapshot'")
                    .one().value,
            ) as { gameType: string; state: RpsSoakState },
        }));

        expect(recoveredPendingThrow).toBe(true);
        expect(observed.state.phase).toBe("tournament_over");
        expect(observed.state.winnerId).toMatch(/^player-/);
        expect(observed.state.eventIndex).toBeGreaterThan(0);
        expect(observed.persisted.gameType).toBe("rps");
        expect(observed.persisted.state).toEqual(observed.state);
        expect(
            Array.from(clients.values()).flatMap((client) =>
                client.messages.filter(
                    (message) => message.type === "rps:error",
                ),
            ),
        ).toHaveLength(0);

        return observed.state.winnerId;
    } finally {
        await closeAll(clients.values());
    }
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

    it("finishes real tournaments across reconnects and adapter restoration", async () => {
        const winners = await Promise.all(
            Array.from({ length: 4 }, (_, roomIndex) =>
                playRpsSoakRoom(roomIndex),
            ),
        );
        expect(winners.every((winner) => winner !== null)).toBe(true);
    });
});
