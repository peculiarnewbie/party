import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { loadPlayerCapabilityHash } from "./room-storage";
import {
    connectClient,
    withRoom,
    sleep,
    type TestRoomClient,
} from "./test-utils/room-e2e";
import type { GameType } from "~/game";
import type { PokerState } from "~/game/poker/types";

async function join(client: TestRoomClient, id: string) {
    const since = client.cursor();
    client.send({ type: "join", playerId: id, playerName: id, data: {} });
    await client.waitForMessage(
        (message) =>
            message.type === "room_state" &&
            Array.isArray(message.data.players) &&
            message.data.players.some(
                (player: { id: string }) => player.id === id,
            ),
        { since },
    );
}

async function setup(game?: GameType) {
    const id = `recovery-${crypto.randomUUID()}`;
    const { client: host } = await connectClient(id);
    const { client: guest } = await connectClient(id);
    await join(host, "host");
    await join(guest, "guest");
    if (game) {
        host.send({
            type: "select_game",
            playerId: "host",
            playerName: "host",
            data: { gameType: game },
        });
        await host.waitForMessage(
            (message) =>
                message.type === "room_state" &&
                message.data.selectedGameType === game,
        );
        host.send({
            type: "start",
            playerId: "host",
            playerName: "host",
            data: {},
        });
        await host.waitForMessage(
            (message) =>
                message.type === `${game}:state` ||
                message.type === "rps:sync_response",
        );
    }
    return { id, host, guest };
}

async function offline(id: string, playerId: string) {
    for (let attempt = 0; attempt < 100; attempt++) {
        const entry = await withRoom(id, (_, room) =>
            room.state.recovery.offline.find(
                (item) => item.playerId === playerId,
            ),
        );
        if (entry) return entry;
        await sleep(10);
    }
    throw new Error("Player did not become offline");
}

async function expire(id: string, playerId: string) {
    await withRoom(id, async (_, room) => {
        room.state.recovery.offline = room.state.recovery.offline.map(
            (entry) =>
                entry.playerId === playerId
                    ? { ...entry, deadline: Date.now() - 1 }
                    : entry,
        );
        room.persistAllState();
        await room.alarm();
    });
}

async function identify(id: string, playerId: string) {
    const { client } = await connectClient(id);
    client.send({ type: "identify", playerId, playerName: playerId, data: {} });
    await client.waitForMessage((message) => message.type === "room_ready");
    return client;
}

describe("disconnect recovery", () => {
    it("reserves lobby identity, cancels the deadline on return, and survives state reload", async () => {
        const { id, host, guest } = await setup();
        try {
            guest.close();
            const entry = await offline(id, "guest");
            expect(entry.deadline! - entry.since).toBe(60_000);
            host.send({
                type: "select_game",
                playerId: "host",
                playerName: "host",
                data: { gameType: "poker" },
            });
            await host.waitForMessage(
                (message) =>
                    message.type === "room_state" &&
                    message.data.selectedGameType === "poker",
            );
            await withRoom(id, async (ctx, room) => {
                room.loadPersistedState();
                expect(room.state.players).toHaveLength(2);
                expect(room.state.recovery.offline[0]).toEqual(entry);
                expect(
                    await Effect.runPromise(
                        loadPlayerCapabilityHash(ctx, "guest"),
                    ),
                ).not.toBeNull();
            });
            const returning = await identify(id, "guest");
            try {
                await withRoom(id, async (ctx, room) => {
                    expect(room.state.recovery.offline).toEqual([]);
                    await room.alarm();
                    expect(room.state.players).toHaveLength(2);
                    expect(await ctx.storage.getAlarm()).toBeNull();
                });
            } finally {
                returning.close();
            }
        } finally {
            host.close();
            guest.close();
        }
    });

    it("restricts controls to the host and persists indefinite waits and extensions", async () => {
        const { id, host, guest } = await setup();
        try {
            guest.send({
                type: "set_disconnect_grace",
                playerId: "guest",
                playerName: "guest",
                data: { seconds: null },
            });
            guest.send({
                type: "identify",
                playerId: "guest",
                playerName: "guest",
                data: {},
            });
            await guest.waitForMessage(
                (message) => message.type === "room_ready",
            );
            expect(
                await withRoom(
                    id,
                    (_, room) => room.state.recovery.graceSeconds,
                ),
            ).toBe(60);
            host.send({
                type: "set_disconnect_grace",
                playerId: "host",
                playerName: "host",
                data: { seconds: null },
            });
            await host.waitForMessage(
                (message) =>
                    message.type === "room_state" &&
                    (message.data.recovery as { graceSeconds: number | null })
                        .graceSeconds === null,
            );
            guest.close();
            expect((await offline(id, "guest")).deadline).toBeNull();
            const since = host.cursor();
            host.send({
                type: "manage_disconnect",
                playerId: "host",
                playerName: "host",
                data: { playerId: "guest", action: "extend" },
            });
            await host.waitForMessage(
                (message) => message.type === "room_state",
                { since },
            );
            await withRoom(id, async (ctx, room) => {
                room.loadPersistedState();
                const deadline = room.state.recovery.offline[0].deadline;
                expect(deadline).toBeGreaterThan(Date.now());
                expect(await ctx.storage.getAlarm()).toBe(deadline);
            });
        } finally {
            host.close();
            guest.close();
        }
    });

    it("does not disconnect a player when another authenticated tab remains", async () => {
        const { id, host, guest } = await setup("poker");
        const sibling = await identify(id, "guest");
        try {
            guest.close();
            await sleep(30);
            await withRoom(id, (_, room) => {
                expect(room.state.recovery.offline).toEqual([]);
                expect(room.getGameParticipant("guest")?.status).toBe("active");
            });
        } finally {
            host.close();
            guest.close();
            sibling.close();
        }
    });

    it("preserves the acting poker hand through a brief disconnect", async () => {
        const { id, host, guest } = await setup("poker");
        const initial = await withRoom(
            id,
            (_, room) => room.gameStateHolder.current as PokerState,
        );
        const actor = initial.players[initial.actingPlayerIndex!].id;
        const lost = actor === "host" ? host : guest;
        try {
            lost.close();
            await offline(id, actor);
            const held = await withRoom(
                id,
                (_, room) => room.gameStateHolder.current as PokerState,
            );
            expect(held).toEqual(initial);
            const returning = await identify(id, actor);
            try {
                const restored = await withRoom(
                    id,
                    (_, room) => room.gameStateHolder.current as PokerState,
                );
                expect(restored.actingPlayerIndex).toBe(
                    initial.actingPlayerIndex,
                );
                expect(restored.players).toEqual(initial.players);
                await withRoom(id, async (_, room) => {
                    await room.alarm();
                });
                expect(
                    await withRoom(
                        id,
                        (_, room) => room.state.recovery.offline,
                    ),
                ).toEqual([]);
            } finally {
                returning.close();
            }
        } finally {
            host.close();
            guest.close();
        }
    });

    it("expires poker once, transfers the host, and permits authenticated return", async () => {
        const { id, host, guest } = await setup("poker");
        try {
            host.close();
            await offline(id, "host");
            await expire(id, "host");
            const expired = await withRoom(id, (_, room) => ({
                state: room.gameStateHolder.current as PokerState,
                host: room.state.hostId,
            }));
            expect(expired.host).toBe("guest");
            expect(
                expired.state.players.find((player) => player.id === "host")
                    ?.connected,
            ).toBe(false);
            await withRoom(id, async (_, room) => {
                await room.alarm();
            });
            const afterRetry = await withRoom(
                id,
                (_, room) => room.gameStateHolder.current as PokerState,
            );
            expect(afterRetry).toEqual(expired.state);
            const returning = await identify(id, "host");
            try {
                const snapshot = await withRoom(id, (_, room) => ({
                    player: (
                        room.gameStateHolder.current as PokerState
                    ).players.find((player) => player.id === "host"),
                    host: room.state.hostId,
                }));
                expect(snapshot.player?.connected).toBe(true);
                expect(snapshot.host).toBe("guest");
            } finally {
                returning.close();
            }
        } finally {
            host.close();
            guest.close();
        }
    });

    it("suspends a fully disconnected room before changing any poker hands", async () => {
        const { id, host, guest } = await setup("poker");
        const before = await withRoom(
            id,
            (_, room) => room.gameStateHolder.current,
        );
        try {
            host.close();
            guest.close();
            await offline(id, "host");
            await offline(id, "guest");
            await expire(id, "host");
            await withRoom(id, (_, room) => {
                expect(room.state.phase).toBe("hibernated");
                expect(room.gameStateHolder.current).toEqual(before);
                expect(
                    room.state.recovery.offline.every(
                        (entry) => entry.status === "waiting",
                    ),
                ).toBe(true);
            });
            const returning = await identify(id, "host");
            try {
                returning.send({
                    type: "resume_room",
                    playerId: "host",
                    playerName: "host",
                    data: {},
                });
                await returning.waitForMessage(
                    (message) =>
                        message.type === "room_state" &&
                        message.data.phase === "playing",
                );
                await withRoom(id, (_, room) => {
                    expect(
                        room.state.recovery.offline[0].deadline,
                    ).toBeGreaterThan(Date.now());
                    expect(
                        (room.gameStateHolder.current as PokerState).players,
                    ).toEqual((before as PokerState).players);
                });
            } finally {
                returning.close();
            }
        } finally {
            host.close();
            guest.close();
        }
    });

    it("continues other games after expiry without revoking room access", async () => {
        const { id, host, guest } = await setup("yahtzee");
        try {
            guest.close();
            await offline(id, "guest");
            await expire(id, "guest");
            const returning = await identify(id, "guest");
            try {
                await withRoom(id, (_, room) => {
                    expect(room.getGameParticipant("guest")?.status).toBe(
                        "sitting_out",
                    );
                    expect(
                        room.state.players.some(
                            (player) => player.id === "guest",
                        ),
                    ).toBe(true);
                });
            } finally {
                returning.close();
            }
        } finally {
            host.close();
            guest.close();
        }
    });

    it("keeps explicitly departed players out after their socket closes", async () => {
        const { id, host, guest } = await setup("poker");
        try {
            guest.send({
                type: "leave_game",
                playerId: "guest",
                playerName: "guest",
                data: {},
            });
            await guest.waitForMessage(
                (message) =>
                    message.type === "room_state" &&
                    (
                        message.data.gameParticipants as {
                            playerId: string;
                            status: string;
                        }[]
                    ).some(
                        (entry) =>
                            entry.playerId === "guest" &&
                            entry.status === "left_game",
                    ),
            );
            guest.close();
            await offline(id, "guest");
            const returning = await identify(id, "guest");
            try {
                expect(
                    await withRoom(
                        id,
                        (_, room) => room.getGameParticipant("guest")?.status,
                    ),
                ).toBe("left_game");
            } finally {
                returning.close();
            }
        } finally {
            host.close();
            guest.close();
        }
    });
    it("detects silent sockets before starting a full grace period", async () => {
        const { id, host, guest } = await setup("poker");
        try {
            await withRoom(id, async (_, room) => {
                for (const [socket, session] of room.sessions) {
                    if (session.playerId === "guest") {
                        session.lastSeen = Date.now() - 90_001;
                        socket.serializeAttachment(session);
                    }
                }
                await room.alarm();
                const entry = room.state.recovery.offline.find(
                    (item) => item.playerId === "guest",
                );
                expect(entry?.status).toBe("waiting");
                expect(entry?.deadline).toBeGreaterThan(Date.now() + 59_000);
                expect(
                    (room.gameStateHolder.current as PokerState).players.find(
                        (player) => player.id === "guest",
                    )?.status,
                ).toBe("active");
            });
        } finally {
            host.close();
            guest.close();
        }
    });

    it("does not expire an extended deadline when an older alarm fires", async () => {
        const { id, host, guest } = await setup("poker");
        try {
            guest.close();
            await offline(id, "guest");
            const since = host.cursor();
            host.send({
                type: "manage_disconnect",
                playerId: "host",
                playerName: "host",
                data: { playerId: "guest", action: "extend" },
            });
            await host.waitForMessage(
                (message) => message.type === "room_state",
                { since },
            );
            await withRoom(id, async (ctx, room) => {
                room.loadPersistedState();
                const deadline = room.state.recovery.offline[0].deadline;
                expect(deadline).toBeGreaterThan(Date.now() + 80_000);
                await room.alarm();
                expect(room.state.recovery.offline[0].status).toBe("waiting");
                expect(await ctx.storage.getAlarm()).toBe(deadline);
            });
        } finally {
            host.close();
            guest.close();
        }
    });

    it("updates game host authority as well as the room on handover", async () => {
        const { id, host, guest } = await setup();
        const { client: third } = await connectClient(id);
        try {
            await join(third, "third");
            host.send({
                type: "select_game",
                playerId: "host",
                playerName: "host",
                data: { gameType: "flip_7" },
            });
            await host.waitForMessage(
                (message) =>
                    message.type === "room_state" &&
                    message.data.selectedGameType === "flip_7",
            );
            host.send({
                type: "start",
                playerId: "host",
                playerName: "host",
                data: {},
            });
            await host.waitForMessage(
                (message) => message.type === "flip_7:state",
            );
            host.close();
            await offline(id, "host");
            await expire(id, "host");
            await withRoom(id, (_, room) => {
                expect(room.state.hostId).toBe("guest");
                const snapshot = room.getCurrentGameSnapshot();
                expect(snapshot?.gameType).toBe("flip_7");
                if (snapshot?.gameType !== "flip_7")
                    throw new Error("Expected Flip 7");
                expect(snapshot.state.hostId).toBe("guest");
                room.loadPersistedState();
                expect(room.state.hostId).toBe("guest");
            });
        } finally {
            host.close();
            guest.close();
            third.close();
        }
    });
    it("gives a new arrival host control after an empty lobby's host expires", async () => {
        const { id, host, guest } = await setup();
        host.close();
        guest.close();
        await offline(id, "host");
        await offline(id, "guest");
        await expire(id, "host");
        await expire(id, "guest");
        const { client: newcomer } = await connectClient(id);
        try {
            await join(newcomer, "newcomer");
            await newcomer.waitForMessage(
                (message) =>
                    message.type === "room_state" &&
                    message.data.hostId === "newcomer",
            );
            expect(await withRoom(id, (_, room) => room.state.hostId)).toBe(
                "newcomer",
            );
        } finally {
            newcomer.close();
        }
    });
    it("keeps game timers paused during host recovery until the room resumes", async () => {
        const { id, host, guest } = await setup("poker");
        try {
            await withRoom(id, (_, room) => {
                const state = room.gameStateHolder.current as PokerState;
                state.street = "hand_over";
                state.actingPlayerIndex = null;
                room.persistAllState();
            });
            host.close();
            await offline(id, "host");
            await expire(id, "host");
            guest.close();
            await offline(id, "guest");
            const returning = await identify(id, "host");
            try {
                await withRoom(id, (_, room) => {
                    expect(room.state.phase).toBe("hibernated");
                    expect(room.clearGameTimer).toBeNull();
                });
                returning.send({
                    type: "resume_room",
                    playerId: "host",
                    playerName: "host",
                    data: {},
                });
                await returning.waitForMessage(
                    (message) =>
                        message.type === "room_state" &&
                        message.data.phase === "playing",
                );
                await withRoom(id, (_, room) => {
                    expect(room.clearGameTimer).not.toBeNull();
                });
            } finally {
                returning.close();
            }
        } finally {
            host.close();
            guest.close();
        }
    });
});
