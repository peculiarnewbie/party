import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { displayMessageSchema } from "~/room/display-protocol";
import { cheeseThiefPlayerViewSchema } from "~/game/cheese-thief/schemas";
import type { CheeseThiefTableView } from "~/game/cheese-thief/table-view";
import {
    connectClient,
    createRoomStub,
    TestRoomClient,
} from "./test-utils/room-e2e";

describe("Cheese Thief Party display", () => {
    it("keeps secrets off real display sockets, reconnects at the reveal and clears results for the next round", async () => {
        const roomId = `cheese-display-${crypto.randomUUID()}`;
        const clients: TestRoomClient[] = [];
        const displays: TestRoomClient[] = [];
        const connectDisplay = async () => {
            const response = await createRoomStub(roomId).fetch(
                new Request(`http://example.com/rooms/${roomId}?view=display`, {
                    headers: { Upgrade: "websocket" },
                }),
            );
            if (!response.webSocket) throw new Error("Missing display socket");
            const client = new TestRoomClient(roomId, response.webSocket);
            displays.push(client);
            await client.waitForMessage(
                (message) => message.type === "display:state",
            );
            return client;
        };
        try {
            for (let index = 0; index < 4; index++) {
                const { client } = await connectClient(roomId);
                clients.push(client);
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
                index = 0,
            ) =>
                clients[index].send({
                    type,
                    playerId: `p${index}`,
                    playerName: `Player ${index}`,
                    data,
                });
            const waitView = async (
                predicate: (view: CheeseThiefTableView) => boolean,
                since = 0,
            ) => {
                const message = await display.waitForMessage(
                    (message) => {
                        const game =
                            Schema.decodeUnknownSync(displayMessageSchema)(
                                message,
                            ).data.game;
                        return (
                            game?.type === "cheese_thief" &&
                            predicate(game.view)
                        );
                    },
                    { since },
                );
                const game =
                    Schema.decodeUnknownSync(displayMessageSchema)(message).data
                        .game;
                if (game?.type !== "cheese_thief")
                    throw new Error("Expected Cheese Thief");
                return game.view;
            };
            send("select_game", { gameType: "cheese_thief" });
            await clients[0].waitForMessage(
                (message) =>
                    message.type === "room_state" &&
                    message.data.selectedGameType === "cheese_thief",
            );
            send("start");
            const night = await waitView((view) => view.phase === "night");
            expect(night.result).toBeNull();
            const views = await Promise.all(
                clients.map(async (client) =>
                    Schema.decodeUnknownSync(cheeseThiefPlayerViewSchema)(
                        (
                            await client.waitForMessage(
                                (message) =>
                                    message.type === "cheese_thief:state",
                            )
                        ).data,
                    ),
                ),
            );
            const thief = views.find((view) => view.myRole === "thief")!;
            send("cheese_thief:start_day");
            await waitView((view) => view.phase === "day");
            send("cheese_thief:start_voting");
            await waitView((view) => view.phase === "voting");
            for (let index = 0; index < clients.length; index++)
                send(
                    "cheese_thief:cast_vote",
                    {
                        targetId:
                            `p${index}` === thief.myId
                                ? views.find(
                                      (view) => view.myId !== thief.myId,
                                  )!.myId
                                : thief.myId,
                    },
                    index,
                );
            const voting = await waitView((view) => view.votedCount === 4);
            expect(voting.result).toBeNull();
            for (const message of display.messages) {
                expect(message.type).toBe("display:state");
                const wire = JSON.stringify(message);
                for (const key of [
                    "myRole",
                    "dieValue",
                    "observedPlayer",
                    "thiefId",
                    "followerIds",
                    '"votes"',
                ])
                    expect(wire).not.toContain(key);
            }
            display.close();
            display = await connectDisplay();
            expect(await waitView((view) => view.votedCount === 4)).toEqual(
                voting,
            );
            send("cheese_thief:reveal_votes");
            const revealed = await waitView((view) => view.phase === "reveal");
            expect(revealed.result).toMatchObject({
                thiefId: thief.myId,
                thiefCaught: true,
            });
            expect(revealed.result?.voteCounts[thief.myId]).toBe(3);
            display.close();
            display = await connectDisplay();
            expect(await waitView((view) => view.phase === "reveal")).toEqual(
                revealed,
            );
            const cursor = display.cursor();
            send("cheese_thief:next_round");
            expect(
                await waitView((view) => view.round === 2, cursor),
            ).toMatchObject({
                phase: "night",
                round: 2,
                result: null,
                votedCount: 0,
            });
        } finally {
            for (const client of [...clients, ...displays]) client.close();
        }
    });
});
