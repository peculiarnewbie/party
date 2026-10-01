import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { displayMessageSchema } from "~/room/display-protocol";
import { skullPlayerViewSchema } from "~/game/skull/schemas";
import { spicyPlayerViewSchema } from "~/game/spicy/schemas";
import {
    connectClient,
    createRoomStub,
    TestRoomClient,
} from "./test-utils/room-e2e";
import type { SkullTableView } from "~/game/skull/table-view";
import type { SpicyTableView } from "~/game/spicy/table-view";

describe("Skull and Spicy Party sockets", () => {
    for (const gameType of ["skull", "spicy"] as const) {
        it(`${gameType}: hides private choices from six-player displays and restores public reveals on reconnect`, async () => {
            const roomId = `party-${gameType}-${crypto.randomUUID()}`;
            const clients: TestRoomClient[] = [];
            const sockets: TestRoomClient[] = [];
            let display: TestRoomClient;
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
            const send = (
                id: string,
                type: string,
                data: Record<string, unknown> = {},
            ) =>
                clients[Number(id.slice(1))].send({
                    type,
                    playerId: id,
                    playerName: id,
                    data,
                });
            const waitView = async (
                predicate: (view: SkullTableView | SpicyTableView) => boolean,
                since = 0,
            ) => {
                const message = await display.waitForMessage(
                    (message) => {
                        const game =
                            Schema.decodeUnknownSync(displayMessageSchema)(
                                message,
                            ).data.game;
                        return game?.type === gameType && predicate(game.view);
                    },
                    { since },
                );
                const game =
                    Schema.decodeUnknownSync(displayMessageSchema)(message).data
                        .game;
                if (game?.type !== gameType) throw new Error("Unexpected game");
                return game.view;
            };
            try {
                for (let index = 0; index < 6; index++) {
                    const { client } = await connectClient(roomId);
                    clients.push(client);
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
                display = await connectDisplay();
                send("p0", "select_game", { gameType });
                await clients[0].waitForMessage(
                    (message) =>
                        message.type === "room_state" &&
                        message.data.selectedGameType === gameType,
                );
                send("p0", "start");
                let view = await waitView(() => true);
                expect(view.players).toHaveLength(6);
                if (gameType === "skull") {
                    for (let count = 1; count <= 6; count++) {
                        send(view.currentPlayerId, "skull:play_disc", {
                            disc: "flower",
                        });
                        view = await waitView(
                            (view) =>
                                "roundNumber" in view &&
                                view.players.reduce(
                                    (sum, player) => sum + player.matCount,
                                    0,
                                ) === count,
                        );
                    }
                    send(view.currentPlayerId, "skull:start_challenge", {
                        bid: 3,
                    });
                    view = await waitView((view) => view.phase === "auction");
                    for (let pass = 0; pass < 5; pass++) {
                        const cursor = display.cursor();
                        send(view.currentPlayerId, "skull:pass_bid");
                        view = await waitView(() => true, cursor);
                    }
                    expect(view.phase).toBe("attempt");
                    if (!("attempt" in view) || !view.attempt)
                        throw new Error("Missing attempt");
                    expect(view.attempt.revealedCount).toBe(1);
                    const challengerId = view.attempt.challengerId;
                    const hidden = view.players.filter(
                        (player) => player.faceDownCount > 0,
                    );
                    const beforeReveal = display.cursor();
                    send(challengerId, "skull:flip_disc", {
                        ownerId: hidden[0].id,
                    });
                    view = await waitView(
                        (view) =>
                            "attempt" in view &&
                            view.attempt?.revealedCount === 2,
                        beforeReveal,
                    );
                    const beforeResolution = display.cursor();
                    send(challengerId, "skull:flip_disc", {
                        ownerId: hidden[1].id,
                    });
                    view = await waitView(
                        (view) =>
                            "roundNumber" in view && view.roundNumber === 2,
                        beforeResolution,
                    );
                    expect(view.lastPublicResult?.type).toBe(
                        "attempt_succeeded",
                    );
                } else {
                    const privateMessage = await clients[0].waitForMessage(
                        (message) => message.type === "spicy:state",
                    );
                    const privateView = Schema.decodeUnknownSync(
                        spicyPlayerViewSchema,
                    )(privateMessage.data);
                    const card = privateView.myHand[0];
                    send("p0", "spicy:play_card", {
                        cardId: card.id,
                        declaredNumber:
                            card.kind === "standard" && card.number === 1
                                ? 2
                                : 1,
                        declaredSpice: "chili",
                    });
                    view = await waitView(
                        (view) => "stackTop" in view && view.stackTop !== null,
                    );
                    expect(JSON.stringify(view)).not.toContain(card.id);
                    for (const message of display.messages) {
                        expect(message.type).toBe("display:state");
                        expect(JSON.stringify(message)).not.toContain(
                            '"actualCard"',
                        );
                    }
                    send("p1", "spicy:challenge", {
                        trait: card.kind === "wild_number" ? "spice" : "number",
                    });
                    view = await waitView(
                        (view) =>
                            view.lastPublicResult?.type ===
                            "challenge_resolved",
                    );
                    expect(view.lastPublicResult).toMatchObject({
                        actualCard: card,
                    });
                }
                for (const message of display.messages) {
                    expect(message.type).toBe("display:state");
                    for (const key of [
                        '"myHand"',
                        '"myMat"',
                        '"hand"',
                        '"mat"',
                        '"drawPile"',
                        '"stack"',
                        '"discardableDiscIndices"',
                    ])
                        expect(JSON.stringify(message)).not.toContain(key);
                }
                const final = view;
                display.close();
                display = await connectDisplay();
                expect(await waitView(() => true)).toEqual(final);
                clients[0].close();
                const { client: reconnected } = await connectClient(roomId);
                sockets.push(reconnected);
                reconnected.send({
                    type: "identify",
                    playerId: "p0",
                    playerName: "Player 0",
                    data: {},
                });
                const snapshot = await reconnected.waitForMessage(
                    (message) => message.type === `${gameType}:state`,
                );
                const restored =
                    gameType === "skull"
                        ? Schema.decodeUnknownSync(skullPlayerViewSchema)(
                              snapshot.data,
                          )
                        : Schema.decodeUnknownSync(spicyPlayerViewSchema)(
                              snapshot.data,
                          );
                expect(restored.lastPublicResult).toEqual(
                    final.lastPublicResult,
                );
                display.sendRaw({
                    type:
                        gameType === "skull" ? "skull:play_disc" : "spicy:pass",
                    playerId: final.currentPlayerId,
                    playerName: "Imposter",
                    data: gameType === "skull" ? { disc: "skull" } : {},
                });
                await display.waitForClose();
            } finally {
                for (const socket of sockets) socket.close();
            }
        });
    }
});
