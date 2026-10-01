import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { displayMessageSchema } from "~/room/display-protocol";
import {
    connectClient,
    createRoomStub,
    TestRoomClient,
} from "./test-utils/room-e2e";

describe("Yahtzee and Go Fish Party sockets", () => {
    for (const gameType of ["yahtzee", "go_fish", "lying_yahtzee"] as const) {
        it(`${gameType}: keeps displays public and read-only at the player limit`, async () => {
            const roomId = `display-${gameType}-${crypto.randomUUID()}`;
            const sockets: TestRoomClient[] = [];
            const connectDisplay = async () => {
                const response = await createRoomStub(roomId).fetch(
                    new Request(
                        `http://example.com/rooms/${roomId}?view=display`,
                        { headers: { Upgrade: "websocket" } },
                    ),
                );
                if (!response.webSocket)
                    throw new Error("Missing display socket");
                const client = new TestRoomClient(roomId, response.webSocket);
                sockets.push(client);
                await client.waitForMessage(
                    (message) => message.type === "display:state",
                );
                return client;
            };
            const count =
                gameType === "yahtzee" ? 10 : gameType === "go_fish" ? 6 : 2;
            try {
                for (let index = 0; index < count; index++) {
                    const { client } = await connectClient(roomId);
                    sockets.push(client);
                    client.send({
                        type: "join",
                        playerId: `p${index}`,
                        playerName: `Player ${index}`,
                        data: {},
                    });
                    await client.waitForMessage(
                        (message) => message.type === "room_session",
                    );
                }
                let display = await connectDisplay();
                const send = (
                    type: string,
                    data: Record<string, unknown> = {},
                ) =>
                    sockets[0].send({
                        type,
                        playerId: "p0",
                        playerName: "Player 0",
                        data,
                    });
                send("select_game", { gameType });
                await sockets[0].waitForMessage(
                    (message) =>
                        message.type === "room_state" &&
                        message.data.selectedGameType === gameType,
                );
                send("start");
                const started = await display.waitForMessage(
                    (message) =>
                        message.type === "display:state" &&
                        message.data.phase === "playing" &&
                        (gameType === "lying_yahtzee" ||
                            Schema.decodeUnknownSync(displayMessageSchema)(
                                message,
                            ).data.game?.type === gameType),
                );
                const snapshot =
                    Schema.decodeUnknownSync(displayMessageSchema)(
                        started,
                    ).data;
                expect(snapshot.players).toHaveLength(count);
                if (gameType === "lying_yahtzee")
                    expect(snapshot.game).toBeNull();
                else {
                    expect(snapshot.game?.type).toBe(gameType);
                    expect(snapshot.game?.view.players).toHaveLength(count);
                }
                if (gameType === "yahtzee") {
                    const cursor = display.cursor();
                    send("yahtzee:roll");
                    const roll = await display.waitForMessage(
                        (message) => {
                            const game =
                                Schema.decodeUnknownSync(displayMessageSchema)(
                                    message,
                                ).data.game;
                            return (
                                game?.type === "yahtzee" &&
                                game.view.phase === "mid_turn"
                            );
                        },
                        { since: cursor },
                    );
                    const rolled =
                        Schema.decodeUnknownSync(displayMessageSchema)(roll)
                            .data.game;
                    if (rolled?.type !== "yahtzee")
                        throw new Error("Missing public roll");
                    expect(
                        rolled.view.dice.every((die) => die >= 1 && die <= 6),
                    ).toBe(true);
                }
                for (const message of display.messages) {
                    expect(message.type).toBe("display:state");
                    expect(JSON.stringify(message)).not.toMatch(
                        /"(?:myHand|hand|drawPile|suit|myId|potentialScores|canRoll|pendingClaim)"/,
                    );
                }
                const final = display.messages.at(-1);
                display.close();
                display = await connectDisplay();
                expect(display.messages.at(-1)).toEqual(final);
                display.sendRaw({
                    type:
                        gameType === "go_fish"
                            ? "go_fish:draw"
                            : "yahtzee:roll",
                    playerId: "p0",
                    playerName: "Imposter",
                    data: {},
                });
                await display.waitForClose();
            } finally {
                for (const socket of sockets) socket.close();
            }
        });
    }
});
