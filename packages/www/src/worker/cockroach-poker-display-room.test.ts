import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { displayMessageSchema } from "~/room/display-protocol";
import { cockroachPokerPlayerViewSchema } from "~/game/cockroach-poker/schemas";
import type { CockroachPokerTableView } from "~/game/cockroach-poker/table-view";
import {
    connectClient,
    createRoomStub,
    TestRoomClient,
} from "./test-utils/room-e2e";

describe("Cockroach Poker Party sockets", () => {
    it("keeps peeks private through reconnect and a six-player pass chain, then broadcasts the reveal", async () => {
        const roomId = `cockroach-display-${crypto.randomUUID()}`;
        const clients: TestRoomClient[] = [];
        const sockets: TestRoomClient[] = [];
        const connectDisplay = async () => {
            const response = await createRoomStub(roomId).fetch(
                new Request(`http://example.com/rooms/${roomId}?view=display`, {
                    headers: { Upgrade: "websocket" },
                }),
            );
            if (!response.webSocket) throw new Error("Missing display socket");
            const client = new TestRoomClient(roomId, response.webSocket);
            sockets.push(client);
            await client.waitForMessage(
                (message) => message.type === "display:state",
            );
            return client;
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
            let display = await connectDisplay();
            const displays = [display];
            const send = (
                index: number,
                type: string,
                data: Record<string, unknown> = {},
            ) =>
                clients[index].send({
                    type,
                    playerId: `p${index}`,
                    playerName: `Player ${index}`,
                    data,
                });
            const waitView = async (
                predicate: (view: CockroachPokerTableView) => boolean,
                since = 0,
            ) => {
                const message = await display.waitForMessage(
                    (message) => {
                        const game =
                            Schema.decodeUnknownSync(displayMessageSchema)(
                                message,
                            ).data.game;
                        return (
                            game?.type === "cockroach_poker" &&
                            predicate(game.view)
                        );
                    },
                    { since },
                );
                const game =
                    Schema.decodeUnknownSync(displayMessageSchema)(message).data
                        .game;
                if (game?.type !== "cockroach_poker")
                    throw new Error("Expected Cockroach Poker");
                return game.view;
            };
            const privateView = async (index: number, since = 0) =>
                Schema.decodeUnknownSync(cockroachPokerPlayerViewSchema)(
                    (
                        await clients[index].waitForMessage(
                            (message) =>
                                message.type === "cockroach_poker:state",
                            { since },
                        )
                    ).data,
                );
            send(0, "select_game", { gameType: "cockroach_poker" });
            await clients[0].waitForMessage(
                (message) =>
                    message.type === "room_state" &&
                    message.data.selectedGameType === "cockroach_poker",
            );
            send(0, "start");
            const opening = await waitView((view) => view.phase === "offering");
            expect(opening.players).toHaveLength(6);
            const actualCard = (await privateView(0)).myHand[0];
            send(0, "cockroach_poker:offer_card", {
                targetId: "p1",
                cardIndex: 0,
                claim: "fly",
            });
            await waitView(
                (view) => view.offerChain?.currentReceiverId === "p1",
            );
            const cursor = clients[1].cursor();
            send(1, "cockroach_poker:peek_card");
            const peeked = await waitView(
                (view) => view.offerChain?.receiverPeeked === true,
            );
            expect((await privateView(1, cursor)).offerChain?.peekedCard).toBe(
                actualCard,
            );
            display.close();
            display = await connectDisplay();
            displays.push(display);
            expect(
                await waitView(
                    (view) => view.offerChain?.receiverPeeked === true,
                ),
            ).toEqual(peeked);
            clients[1].close();
            const { client: reconnected } = await connectClient(roomId);
            clients[1] = reconnected;
            sockets.push(reconnected);
            reconnected.send({
                type: "identify",
                playerId: "p1",
                playerName: "Player 1",
                data: {},
            });
            expect((await privateView(1)).offerChain?.peekedCard).toBe(
                actualCard,
            );
            send(1, "cockroach_poker:call_true");
            await reconnected.waitForMessage(
                (message) =>
                    message.type === "cockroach_poker:error" &&
                    String(message.data.message).includes("must pass"),
            );
            for (let index = 1; index < 5; index++) {
                if (index > 1) {
                    const cursor = clients[index].cursor();
                    send(index, "cockroach_poker:peek_card");
                    await waitView(
                        (view) =>
                            view.offerChain?.currentReceiverId ===
                                `p${index}` && view.offerChain.receiverPeeked,
                    );
                    expect(
                        (await privateView(index, cursor)).offerChain
                            ?.peekedCard,
                    ).toBe(actualCard);
                }
                send(index, "cockroach_poker:peek_and_pass", {
                    targetId: `p${index + 1}`,
                    newClaim: "spider",
                });
                await waitView(
                    (view) =>
                        view.offerChain?.currentReceiverId === `p${index + 1}`,
                );
            }
            for (const socket of displays) {
                for (const message of socket.messages) {
                    expect(message.type).toBe("display:state");
                    const wire = JSON.stringify(message);
                    for (const key of [
                        "myHand",
                        "cardValue",
                        "peekedCard",
                        "actualCard",
                    ])
                        expect(wire).not.toContain(key);
                }
            }
            const final = await privateView(5, 1);
            const finalState = clients[5].messages
                .filter((message) => message.type === "cockroach_poker:state")
                .at(-1)!;
            expect(
                Schema.decodeUnknownSync(cockroachPokerPlayerViewSchema)(
                    finalState.data,
                ).offerChain,
            ).toMatchObject({ peekedCard: null, mustAccept: true });
            expect(final.myId).toBe("p5");
            send(5, "cockroach_poker:peek_card");
            await clients[5].waitForMessage(
                (message) => message.type === "cockroach_poker:error",
            );
            send(5, "cockroach_poker:call_false");
            const revealed = await waitView(
                (view) =>
                    view.phase === "offering" &&
                    view.lastResult?.type === "call_resolved",
            );
            expect(revealed.lastResult).toMatchObject({ actualCard });
            expect(
                revealed.players.flatMap((player) => player.faceUpCards),
            ).toEqual([actualCard]);
            display.close();
            display = await connectDisplay();
            expect(await waitView((view) => view.phase === "offering")).toEqual(
                revealed,
            );
            const cursorDisplay = display.cursor();
            display.sendRaw({
                type: "cockroach_poker:offer_card",
                playerId: revealed.activePlayerId,
                playerName: "Imposter",
                data: { targetId: "p0", cardIndex: 0, claim: "bat" },
            });
            await display.waitForClose();
            expect(
                display.messages
                    .slice(cursorDisplay)
                    .every((message) => message.type === "display:state"),
            ).toBe(true);
        } finally {
            for (const client of sockets) client.close();
        }
    });
});
