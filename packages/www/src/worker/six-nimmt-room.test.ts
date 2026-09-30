import { expect, it } from "vitest";
import { Schema } from "effect";
import {
    sixNimmtPlayerViewSchema,
    sixNimmtStateSchema,
} from "~/game/six-nimmt/schemas";
import { displayMessageSchema } from "~/room/display-protocol";
import { describeGameRoomSmoke } from "./test-utils/game-room-smoke";
import {
    connectClient,
    createRoomStub,
    TestRoomClient,
    withRoom,
} from "./test-utils/room-e2e";

describeGameRoomSmoke({
    gameType: "six_nimmt",
    playerCount: 3,
    initialMessageType: "six_nimmt:state",
});

it("persists secret locks, restores reconnects, keeps display public and resolves simultaneous plays", async () => {
    const roomId = `six-${crypto.randomUUID()}`;
    const clients: TestRoomClient[] = [];
    const view = (message: { data: unknown }) =>
        Schema.decodeUnknownSync(sixNimmtPlayerViewSchema)(message.data);
    try {
        for (const id of ["a", "b"]) {
            const { client } = await connectClient(roomId);
            clients.push(client);
            client.send({
                type: "join",
                playerId: id,
                playerName: id,
                data: {},
            });
            await client.waitForMessage((m) => m.type === "room_session");
        }
        const [alice, bob] = clients;
        if (!alice || !bob) throw new Error("Missing players");
        alice.send({
            type: "select_game",
            playerId: "a",
            playerName: "a",
            data: { gameType: "six_nimmt" },
        });
        await alice.waitForMessage(
            (m) =>
                m.type === "room_state" &&
                m.data.selectedGameType === "six_nimmt",
        );
        alice.send({ type: "start", playerId: "a", playerName: "a", data: {} });
        const a = view(
            await alice.waitForMessage((m) => m.type === "six_nimmt:state"),
        );
        const b = view(
            await bob.waitForMessage((m) => m.type === "six_nimmt:state"),
        );
        const response = await createRoomStub(roomId).fetch(
            new Request(`http://example.com/rooms/${roomId}?view=display`, {
                headers: { Upgrade: "websocket" },
            }),
        );
        if (!response.webSocket) throw new Error("Missing display");
        const display = new TestRoomClient(roomId, response.webSocket);
        clients.push(display);
        await display.waitForMessage((m) => m.type === "display:state");
        const cursor = display.cursor();
        alice.send({
            type: "six_nimmt:lock",
            playerId: "a",
            playerName: "a",
            data: { round: 1, turn: 1, card: a.myHand[0] },
        });
        await alice.waitForMessage(
            (m) =>
                m.type === "six_nimmt:state" &&
                view(m).selected === a.myHand[0],
        );
        const publicMessage = Schema.decodeUnknownSync(displayMessageSchema)(
            await display.waitForMessage(
                (m) => {
                    const state =
                        Schema.decodeUnknownSync(displayMessageSchema)(m).data;
                    return (
                        state.game?.type === "six_nimmt" &&
                        state.game.view.players.some((p) => p.ready)
                    );
                },
                { since: cursor },
            ),
        );
        expect(publicMessage.data.game).not.toHaveProperty("view.myHand");
        expect(publicMessage.data.game).not.toHaveProperty("view.selected");
        expect(publicMessage.data.game?.view).toHaveProperty("revealed", []);
        const stored = await withRoom(roomId, (_ctx, room) =>
            room.getCurrentGameSnapshot(),
        );
        expect(stored?.gameType).toBe("six_nimmt");
        expect(
            Schema.decodeUnknownSync(sixNimmtStateSchema)(stored?.state)
                .players[0]!.selected,
        ).toBe(a.myHand[0]);
        const { client: reconnected } = await connectClient(roomId);
        clients.push(reconnected);
        reconnected.send({
            type: "identify",
            playerId: "a",
            playerName: "a",
            data: {},
        });
        const restored = view(
            await reconnected.waitForMessage(
                (m) => m.type === "six_nimmt:state",
            ),
        );
        expect(restored.selected).toBe(a.myHand[0]);
        expect(restored.myHand).toEqual(a.myHand);
        bob.send({
            type: "six_nimmt:lock",
            playerId: "b",
            playerName: "b",
            data: { round: 1, turn: 1, card: b.myHand[0] },
        });
        const reveal = view(
            await bob.waitForMessage(
                (m) =>
                    m.type === "six_nimmt:state" &&
                    view(m).stage.type === "resolving",
            ),
        );
        expect(reveal.revealed.map((p) => p.card)).toEqual(
            [a.myHand[0], b.myHand[0]].sort((x, y) => x! - y!),
        );
        await withRoom(roomId, (_ctx, room) => {
            room.clearCachedAdapter();
            room.loadPersistedState();
            room.createSocketOperations().getAdapter();
        });
        for (let step = 0; step < 4; step++) {
            const current = view(
                await bob.waitForMessage(
                    (m) =>
                        m.type === "six_nimmt:state" &&
                        (view(m).stage.type === "choosing" ||
                            view(m).turn === 2),
                    { since: bob.cursor(), timeoutMs: 7000 },
                ),
            );
            if (current.turn === 2) break;
            const stage = current.stage;
            if (stage.type !== "choosing")
                throw new Error("Expected a row choice");
            const client = stage.playerId === "a" ? reconnected : bob;
            client.send({
                type: "six_nimmt:choose_row",
                playerId: stage.playerId,
                playerName: stage.playerId,
                data: { round: 1, turn: 1, row: 0 },
            });
        }
        const end = await withRoom(roomId, (_ctx, room) =>
            room.getCurrentGameSnapshot(),
        );
        expect(
            Schema.decodeUnknownSync(sixNimmtStateSchema)(end?.state).turn,
        ).toBe(2);
    } finally {
        for (const client of clients) client.close();
    }
});
