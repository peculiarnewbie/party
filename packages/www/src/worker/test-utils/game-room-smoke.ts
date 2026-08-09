import { describe, expect, it } from "vitest";

import type { GameType, RoomStatePayload } from "~/game";
import {
    type MessageEnvelope,
    type TestRoomClient,
    connectClient,
} from "./room-e2e";

type GameRoomSmokeConfig = {
    gameType: GameType;
    playerCount: number;
    initialMessageType: `${string}:state` | null;
};

function isRoomStateMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & { type: "room_state"; data: RoomStatePayload } {
    return message.type === "room_state";
}

async function joinRoom(
    client: TestRoomClient,
    playerId: string,
    playerName: string,
) {
    const cursor = client.cursor();
    client.send({
        type: "join",
        playerId,
        playerName,
        data: {},
    });
    await client.waitForMessage(
        (message) =>
            isRoomStateMessage(message) &&
            message.data.players.some((player) => player.id === playerId),
        { since: cursor },
    );
}

export function describeGameRoomSmoke(config: GameRoomSmokeConfig) {
    describe(`${config.gameType} room`, () => {
        it("starts through the real Durable Object and sends player state", async () => {
            const roomId = `smoke-${config.gameType}-${crypto.randomUUID()}`;
            const clients: TestRoomClient[] = [];

            try {
                for (let index = 0; index < config.playerCount; index += 1) {
                    const { client } = await connectClient(roomId);
                    clients.push(client);
                    await joinRoom(client, `p${index}`, `Player ${index}`);
                }

                const host = clients[0]!;
                let cursor = host.cursor();
                host.send({
                    type: "select_game",
                    playerId: "p0",
                    playerName: "Player 0",
                    data: { gameType: config.gameType },
                });
                await host.waitForMessage(
                    (message) =>
                        isRoomStateMessage(message) &&
                        message.data.selectedGameType === config.gameType,
                    { since: cursor },
                );

                const gameCursors = clients.map((client) => client.cursor());
                cursor = host.cursor();
                host.send({
                    type: "start",
                    playerId: "p0",
                    playerName: "Player 0",
                    data: {},
                });

                const roomState = await host.waitForMessage(
                    (message) =>
                        isRoomStateMessage(message) &&
                        message.data.phase === "playing" &&
                        message.data.activeGameType === config.gameType,
                    { since: cursor },
                );
                const roomStateData = roomState.data as unknown as RoomStatePayload;
                expect(roomStateData.gameParticipants).toHaveLength(
                    config.playerCount,
                );
                expect(
                    roomStateData.gameParticipants.every(
                        (participant) => participant.status === "active",
                    ),
                ).toBe(true);

                if (config.initialMessageType) {
                    await Promise.all(
                        clients.map((client, index) =>
                            client.waitForMessage(
                                (message) =>
                                    message.type === config.initialMessageType,
                                { since: gameCursors[index] },
                            ),
                        ),
                    );
                }
            } finally {
                for (const client of clients) client.close();
            }
        });
    });
}
