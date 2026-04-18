import {
    runDurableObjectAlarm,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { RoomStatePayload } from "~/game";
import type {
    PokerEvent,
    PokerPlayerView,
    PokerState,
} from "~/game/poker";

import {
    type MessageEnvelope,
    type TestRoomClient,
    connectClient,
    sleep,
    withRoom,
} from "./test-utils/room-e2e";

type PokerStatePayload = PokerPlayerView;
type PokerEventPayload = PokerEvent;
type PokerActionResultPayload = {
    error?: string;
};
type PokerGameOverPayload = {
    winnerIds: string[] | null;
    endedByHost: boolean;
};

function isRoomStateMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & { type: "room_state"; data: RoomStatePayload } {
    return message.type === "room_state";
}

function isPokerStateMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & {
    type: "poker:state";
    data: PokerStatePayload;
} {
    return message.type === "poker:state";
}

function isPokerEventMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & {
    type: "poker:event";
    data: PokerEventPayload;
} {
    return message.type === "poker:event";
}

function isPokerActionResultMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & {
    type: "poker:action_result";
    data: PokerActionResultPayload;
} {
    return message.type === "poker:action_result";
}

function isPokerGameOverMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & {
    type: "poker:game_over";
    data: PokerGameOverPayload;
} {
    return message.type === "poker:game_over";
}

function joinRoom(client: TestRoomClient, playerId: string, playerName: string) {
    client.send({
        type: "join",
        playerId,
        playerName,
        data: {},
    });
}

function identify(client: TestRoomClient, playerId: string, playerName: string) {
    client.send({
        type: "identify",
        playerId,
        playerName,
        data: {},
    });
}

function selectGame(
    client: TestRoomClient,
    playerId: string,
    playerName: string,
    gameType: "poker" | "backwards_poker",
) {
    client.send({
        type: "select_game",
        playerId,
        playerName,
        data: { gameType },
    });
}

function startGame(client: TestRoomClient, playerId: string, playerName: string) {
    client.send({
        type: "start",
        playerId,
        playerName,
        data: {},
    });
}

function resumeRoom(client: TestRoomClient, playerId: string, playerName: string) {
    client.send({
        type: "resume_room",
        playerId,
        playerName,
        data: {},
    });
}

function endGame(client: TestRoomClient, playerId: string, playerName: string) {
    client.send({
        type: "end",
        playerId,
        playerName,
        data: {},
    });
}

function returnToLobby(
    client: TestRoomClient,
    playerId: string,
    playerName: string,
) {
    client.send({
        type: "return_to_lobby",
        playerId,
        playerName,
        data: {},
    });
}

function actFold(client: TestRoomClient, playerId: string, playerName: string) {
    client.send({
        type: "poker:act",
        playerId,
        playerName,
        data: { type: "fold" },
    });
}

function actCheck(client: TestRoomClient, playerId: string, playerName: string) {
    client.send({
        type: "poker:act",
        playerId,
        playerName,
        data: { type: "check" },
    });
}

function actCall(client: TestRoomClient, playerId: string, playerName: string) {
    client.send({
        type: "poker:act",
        playerId,
        playerName,
        data: { type: "call" },
    });
}

function actAllIn(client: TestRoomClient, playerId: string, playerName: string) {
    client.send({
        type: "poker:act",
        playerId,
        playerName,
        data: { type: "all_in" },
    });
}

async function waitForPokerState(
    client: TestRoomClient,
    playerId: string,
    predicate?: (state: PokerStatePayload) => boolean,
    options?: { since?: number; timeoutMs?: number },
) {
    return client.waitForMessage(
        (message): message is MessageEnvelope & {
            type: "poker:state";
            data: PokerStatePayload;
        } =>
            isPokerStateMessage(message) &&
            message.data.players.some((player) => player.id === playerId) &&
            (predicate ? predicate(message.data) : true),
        options,
    );
}

async function waitForRoomCondition<T>(
    roomId: string,
    getValue: (instance: {
        state: {
            phase: string;
        };
    } & Record<string, unknown>) => T | null,
    timeoutMs = 5_000,
) {
    return withRoom(roomId, async (_, instance) => {
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            const value = getValue(instance as unknown as {
                state: {
                    phase: string;
                };
            } & Record<string, unknown>);
            if (value !== null) {
                return value;
            }

            await sleep(20);
        }

        throw new Error(
            `Timed out waiting for room condition.\nState:\n${JSON.stringify(
                {
                    phase: instance.state.phase,
                    activeGameType: instance.state.activeGameType,
                    participants: instance.state.gameParticipants,
                    pokerStreet: instance.pokerState.current?.street ?? null,
                },
                null,
                2,
            )}`,
        );
    });
}

let roomCounter = 0;

function nextRoomId() {
    return `poker-room-worker-${roomCounter++}`;
}

describe("GameRoom poker sequences", () => {
    it("runs a real standard poker room flow with personalized state and persistence", async () => {
        const roomId = nextRoomId();
        const { client: alice } = await connectClient(roomId);
        const { client: bob } = await connectClient(roomId);
        const { client: cara } = await connectClient(roomId);

        try {
            const aliceJoinCursor = alice.cursor();
            const bobJoinCursor = bob.cursor();
            const caraJoinCursor = cara.cursor();
            joinRoom(alice, "p1", "Alice");
            joinRoom(bob, "p2", "Bob");
            joinRoom(cara, "p3", "Cara");

            await alice.waitForMessage(
                (message) =>
                    isRoomStateMessage(message) &&
                    message.data.players.length === 3 &&
                    message.data.hostId === "p1" &&
                    message.data.phase === "lobby",
                { since: aliceJoinCursor },
            );
            await bob.waitForMessage(
                (message) =>
                    isRoomStateMessage(message) &&
                    message.data.players.length === 3 &&
                    message.data.hostId === "p1",
                { since: bobJoinCursor },
            );
            await cara.waitForMessage(
                (message) =>
                    isRoomStateMessage(message) &&
                    message.data.players.length === 3 &&
                    message.data.hostId === "p1",
                { since: caraJoinCursor },
            );

            const selectCursor = alice.cursor();
            selectGame(alice, "p1", "Alice", "poker");
            await alice.waitForMessage(
                (message) =>
                    isRoomStateMessage(message) &&
                    message.data.selectedGameType === "poker" &&
                    message.data.phase === "lobby",
                { since: selectCursor },
            );

            const startCursorAlice = alice.cursor();
            const startCursorBob = bob.cursor();
            const startCursorCara = cara.cursor();
            startGame(alice, "p1", "Alice");

            const roomState = await alice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "room_state";
                    data: RoomStatePayload;
                } =>
                    isRoomStateMessage(message) &&
                    message.data.phase === "playing" &&
                    message.data.activeGameType === "poker" &&
                    message.data.gameSessionId !== null &&
                    message.data.gameParticipants.length === 3 &&
                    message.data.gameParticipants.every(
                        (participant) => participant.status === "active",
                    ),
                { since: startCursorAlice },
            );

            const aliceState = await waitForPokerState(
                alice,
                "p1",
                (state) =>
                    !state.isSpectator &&
                    state.myStatus === "active" &&
                    state.myHoleCards.length === 2,
                { since: startCursorAlice },
            );
            const bobState = await waitForPokerState(
                bob,
                "p2",
                (state) =>
                    !state.isSpectator &&
                    state.myStatus === "active" &&
                    state.myHoleCards.length === 2,
                { since: startCursorBob },
            );
            const caraState = await waitForPokerState(
                cara,
                "p3",
                (state) =>
                    !state.isSpectator &&
                    state.myStatus === "active" &&
                    state.myHoleCards.length === 2,
                { since: startCursorCara },
            );
            const startupEvent = await alice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "poker:event";
                    data: PokerEventPayload;
                } =>
                    isPokerEventMessage(message) &&
                    message.data.type === "hand_started",
                { since: startCursorAlice },
            );

            expect(roomState.data.gameParticipants).toEqual([
                { playerId: "p1", status: "active" },
                { playerId: "p2", status: "active" },
                { playerId: "p3", status: "active" },
            ]);
            expect(
                aliceState.data.players
                    .filter((player) => player.id !== "p1")
                    .every(
                        (player) =>
                            player.holeCardCount === 2 &&
                            player.visibleHoleCards.length === 0,
                    ),
            ).toBe(true);
            expect(
                bobState.data.players
                    .filter((player) => player.id !== "p2")
                    .every(
                        (player) =>
                            player.holeCardCount === 2 &&
                            player.visibleHoleCards.length === 0,
                    ),
            ).toBe(true);
            expect(
                caraState.data.players
                    .filter((player) => player.id !== "p3")
                    .every(
                        (player) =>
                            player.holeCardCount === 2 &&
                            player.visibleHoleCards.length === 0,
                    ),
            ).toBe(true);
            expect(startupEvent.data.message).toContain("Hand 1 started");

            const persisted = await withRoom(roomId, async (_, instance) => {
                return {
                    pokerState: instance.pokerState.current,
                    phase: instance.state.phase,
                };
            });

            expect(persisted.phase).toBe("playing");
            expect(persisted.pokerState).not.toBeNull();
        } finally {
            alice.close();
            bob.close();
            cara.close();
        }
    });

    it("adds late joiners as spectators instead of seated participants", async () => {
        const roomId = nextRoomId();
        const { client: alice } = await connectClient(roomId);
        const { client: bob } = await connectClient(roomId);

        try {
            joinRoom(alice, "p1", "Alice");
            joinRoom(bob, "p2", "Bob");
            selectGame(alice, "p1", "Alice", "poker");
            startGame(alice, "p1", "Alice");

            await waitForPokerState(alice, "p1", (state) => state.myHoleCards.length === 2);
            await waitForPokerState(bob, "p2", (state) => state.myHoleCards.length === 2);

            const { client: dana } = await connectClient(roomId);
            try {
                const joinCursor = dana.cursor();
                joinRoom(dana, "p4", "Dana");

                await dana.waitForMessage(
                    (message) =>
                        isRoomStateMessage(message) &&
                        message.data.phase === "playing" &&
                        message.data.activeGameType === "poker" &&
                        !message.data.gameParticipants.some(
                            (participant) => participant.playerId === "p4",
                        ),
                    { since: joinCursor },
                );
                const danaState = await waitForPokerState(
                    dana,
                    "p1",
                    (state) =>
                        state.isSpectator &&
                        state.myStatus === "spectator" &&
                        state.myHoleCards.length === 0 &&
                        state.players.every(
                            (player) => player.visibleHoleCards.length === 0,
                        ),
                    { since: joinCursor },
                );

                expect(danaState.data.spectators).toContainEqual({
                    id: "p4",
                    name: "Dana",
                });

                const persisted = await withRoom(roomId, async (_, instance) => {
                    return {
                        participants: instance.state.gameParticipants,
                        spectators: instance.pokerState.current?.spectators ?? [],
                    };
                });

                expect(persisted.participants).toEqual([
                    { playerId: "p1", status: "active" },
                    { playerId: "p2", status: "active" },
                ]);
                expect(persisted.spectators).toContainEqual({
                    id: "p4",
                    name: "Dana",
                });
            } finally {
                dana.close();
            }
        } finally {
            alice.close();
            bob.close();
        }
    });

    it("disconnects the acting player, folds the hand, and schedules the next hand", async () => {
        const roomId = nextRoomId();
        const { client: alice } = await connectClient(roomId);
        const { client: bob } = await connectClient(roomId);

        try {
            joinRoom(alice, "p1", "Alice");
            joinRoom(bob, "p2", "Bob");
            selectGame(alice, "p1", "Alice", "poker");
            startGame(alice, "p1", "Alice");

            const aliceState = await waitForPokerState(alice, "p1");
            const bobState = await waitForPokerState(bob, "p2");
            const actingPlayerId = aliceState.data.actingPlayerId;

            expect(actingPlayerId).toBe(bobState.data.actingPlayerId);

            if (actingPlayerId === "p1") {
                alice.close();
            } else {
                bob.close();
            }

            const observer = actingPlayerId === "p1" ? bob : alice;
            const observerId = actingPlayerId === "p1" ? "p2" : "p1";
            const observerCursor = observer.cursor();

            const updatedState = await waitForPokerState(
                observer,
                observerId,
                (state) =>
                    state.street === "hand_over" &&
                    state.eventLog.some(
                        (event) =>
                            event.type === "player_disconnected" &&
                            event.playerId === actingPlayerId,
                    ),
                { since: observerCursor },
            );

            await observer.waitForMessage(
                (message) =>
                    isRoomStateMessage(message) &&
                    message.data.gameParticipants.some(
                        (participant) =>
                            participant.playerId === actingPlayerId &&
                            participant.status === "disconnected",
                    ),
                { since: observerCursor },
            );

            expect(updatedState.data.players.find((player) => player.id === actingPlayerId)?.status).toBe(
                "disconnected",
            );

            const persisted = await waitForRoomCondition(roomId, (instance) => {
                const participant = instance.state.gameParticipants.find(
                    (entry) => entry.playerId === actingPlayerId,
                );
                const street = (instance.pokerState.current as PokerState | null)?.street;
                const nextHandTimer = instance.nextHandTimer;

                if (
                    participant?.status === "disconnected" &&
                    street === "hand_over" &&
                    nextHandTimer !== null
                ) {
                    return {
                        phase: instance.state.phase,
                        participant,
                        street,
                        nextHandTimer,
                    };
                }

                return null;
            });

            expect(persisted.phase).toBe("playing");
            expect(persisted.participant).toEqual({
                playerId: actingPlayerId,
                status: "disconnected",
            });
        } finally {
            alice.close();
            bob.close();
        }
    });

    it("rehydrates a disconnected seated player on identify without turning them into a spectator", async () => {
        const roomId = nextRoomId();
        const { client: alice } = await connectClient(roomId);
        const { client: bob } = await connectClient(roomId);
        const { client: cara } = await connectClient(roomId);

        try {
            joinRoom(alice, "p1", "Alice");
            joinRoom(bob, "p2", "Bob");
            joinRoom(cara, "p3", "Cara");
            selectGame(alice, "p1", "Alice", "poker");
            startGame(alice, "p1", "Alice");

            await waitForPokerState(alice, "p1");
            await waitForPokerState(bob, "p2");
            await waitForPokerState(cara, "p3");

            bob.close();

            await waitForRoomCondition(roomId, (instance) => {
                const participant = instance.state.gameParticipants.find(
                    (entry) => entry.playerId === "p2",
                );
                return participant?.status === "disconnected" ? participant : null;
            });

            const { client: bobReconnect } = await connectClient(roomId);
            try {
                const identifyCursor = bobReconnect.cursor();
                identify(bobReconnect, "p2", "Bob");

                await bobReconnect.waitForMessage(
                    (message) =>
                        isRoomStateMessage(message) &&
                        message.data.phase === "playing" &&
                        message.data.gameParticipants.some(
                            (participant) =>
                                participant.playerId === "p2" &&
                                participant.status === "active",
                        ),
                    { since: identifyCursor },
                );

                const rehydratedState = await waitForPokerState(
                    bobReconnect,
                    "p2",
                    (state) =>
                        !state.isSpectator &&
                        state.myHoleCards.length === 2 &&
                        state.players
                            .filter((player) => player.id !== "p2")
                            .every(
                                (player) => player.visibleHoleCards.length === 0,
                            ) &&
                        state.eventLog.some(
                            (event) =>
                                event.type === "player_reconnected" &&
                                event.playerId === "p2",
                        ),
                    { since: identifyCursor },
                );

                expect(rehydratedState.data.isSpectator).toBe(false);
                expect(rehydratedState.data.spectators).not.toContainEqual({
                    id: "p2",
                    name: "Bob",
                });
            } finally {
                bobReconnect.close();
            }
        } finally {
            alice.close();
            bob.close();
            cara.close();
        }
    });

    it("applies backwards-poker visibility rules for seated players and spectators", async () => {
        const roomId = nextRoomId();
        const { client: alice } = await connectClient(roomId);
        const { client: bob } = await connectClient(roomId);
        const { client: cara } = await connectClient(roomId);

        try {
            joinRoom(alice, "p1", "Alice");
            joinRoom(bob, "p2", "Bob");
            joinRoom(cara, "p3", "Cara");
            selectGame(alice, "p1", "Alice", "backwards_poker");

            const startCursor = alice.cursor();
            startGame(alice, "p1", "Alice");

            await alice.waitForMessage(
                (message) =>
                    isRoomStateMessage(message) &&
                    message.data.phase === "playing" &&
                    message.data.activeGameType === "backwards_poker",
                { since: startCursor },
            );
            const seatedState = await waitForPokerState(
                alice,
                "p1",
                (state) =>
                    state.myHoleCards.length === 0 &&
                    state.players.some(
                        (player) =>
                            player.id !== "p1" &&
                            player.visibleHoleCards.length === 2,
                    ),
                { since: startCursor },
            );

            expect(
                seatedState.data.players.find((player) => player.id === "p1")?.visibleHoleCards,
            ).toEqual([]);

            const { client: dana } = await connectClient(roomId);
            try {
                const joinCursor = dana.cursor();
                joinRoom(dana, "p4", "Dana");

                const spectatorState = await waitForPokerState(
                    dana,
                    "p1",
                    (state) =>
                        state.isSpectator &&
                        state.myHoleCards.length === 0 &&
                        state.players.every(
                            (player) => player.visibleHoleCards.length === 0,
                        ),
                    { since: joinCursor },
                );

                expect(spectatorState.data.myStatus).toBe("spectator");
            } finally {
                dana.close();
            }
        } finally {
            alice.close();
            bob.close();
            cara.close();
        }
    });

    it("lets the host end poker and then return the room to the lobby", async () => {
        const roomId = nextRoomId();
        const { client: alice } = await connectClient(roomId);
        const { client: bob } = await connectClient(roomId);

        try {
            joinRoom(alice, "p1", "Alice");
            joinRoom(bob, "p2", "Bob");
            selectGame(alice, "p1", "Alice", "poker");
            startGame(alice, "p1", "Alice");

            await waitForPokerState(alice, "p1");
            await waitForPokerState(bob, "p2");

            const endCursorAlice = alice.cursor();
            const endCursorBob = bob.cursor();
            endGame(alice, "p1", "Alice");

            const endedState = await waitForPokerState(
                alice,
                "p1",
                (state) => state.street === "tournament_over" && state.endedByHost,
                { since: endCursorAlice },
            );
            const gameOver = await alice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "poker:game_over";
                    data: PokerGameOverPayload;
                } =>
                    isPokerGameOverMessage(message) &&
                    message.data.endedByHost === true,
                { since: endCursorAlice },
            );
            await bob.waitForMessage(
                (message) =>
                    isPokerGameOverMessage(message) &&
                    message.data.endedByHost === true,
                { since: endCursorBob },
            );

            expect(endedState.data.winnerIds).toEqual(gameOver.data.winnerIds);

            const lobbyCursor = alice.cursor();
            returnToLobby(alice, "p1", "Alice");

            const lobbyState = await alice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "room_state";
                    data: RoomStatePayload;
                } =>
                    isRoomStateMessage(message) &&
                    message.data.phase === "lobby" &&
                    message.data.activeGameType === null &&
                    message.data.gameSessionId === null &&
                    message.data.gameParticipants.length === 0,
                { since: lobbyCursor },
            );

            expect(lobbyState.data.players).toHaveLength(2);

            const persisted = await withRoom(roomId, async (_, instance) => {
                return {
                    phase: instance.state.phase,
                    activeGameType: instance.state.activeGameType,
                    gameSessionId: instance.state.gameSessionId,
                    participants: instance.state.gameParticipants,
                    pokerState: instance.pokerState.current,
                };
            });

            expect(persisted).toEqual({
                phase: "lobby",
                activeGameType: null,
                gameSessionId: null,
                participants: [],
                pokerState: null,
            });
        } finally {
            alice.close();
            bob.close();
        }
    });

    it("hibernates, resumes, and clears abandoned poker rooms via alarms", async () => {
        const roomId = nextRoomId();
        const { stub, client: alice } = await connectClient(roomId);
        const { client: bob } = await connectClient(roomId);

        try {
            joinRoom(alice, "p1", "Alice");
            joinRoom(bob, "p2", "Bob");
            selectGame(alice, "p1", "Alice", "poker");
            startGame(alice, "p1", "Alice");

            const initialState = await waitForPokerState(
                alice,
                "p1",
                (state) => state.myHoleCards.length === 2,
            );
            await waitForPokerState(bob, "p2");

            alice.close();
            bob.close();

            await waitForRoomCondition(roomId, (instance) => {
                return instance.state.phase === "hibernated"
                    ? {
                          phase: instance.state.phase,
                          participants: instance.state.gameParticipants,
                          street:
                              (instance.pokerState.current as PokerState | null)
                                  ?.street ?? null,
                      }
                    : null;
            });

            const hibernatedSnapshot = await withRoom(roomId, async (ctx, instance) => {
                return {
                    alarm: await ctx.storage.getAlarm(),
                    phase: instance.state.phase,
                    participants: instance.state.gameParticipants,
                    pokerState: instance.pokerState.current,
                };
            });

            expect(hibernatedSnapshot.phase).toBe("hibernated");
            expect(hibernatedSnapshot.alarm).not.toBeNull();
            expect(hibernatedSnapshot.participants).toEqual([
                { playerId: "p1", status: "disconnected" },
                { playerId: "p2", status: "disconnected" },
            ]);
            expect((hibernatedSnapshot.pokerState as PokerState).street).toMatch(
                /^(preflop|flop|turn|river|showdown|hand_over)$/,
            );

            const { client: resumedAlice } = await connectClient(roomId);
            try {
                const identifyCursor = resumedAlice.cursor();
                identify(resumedAlice, "p1", "Alice");

                await resumedAlice.waitForMessage(
                    (message) =>
                        isRoomStateMessage(message) &&
                        message.data.phase === "hibernated",
                    { since: identifyCursor },
                );

                const resumeCursor = resumedAlice.cursor();
                resumeRoom(resumedAlice, "p1", "Alice");

                await resumedAlice.waitForMessage(
                    (message) =>
                        isRoomStateMessage(message) &&
                        message.data.phase === "playing" &&
                        message.data.gameParticipants.some(
                            (participant) =>
                                participant.playerId === "p1" &&
                                participant.status === "active",
                        ),
                    { since: resumeCursor },
                );
                const resumedState = await waitForPokerState(
                    resumedAlice,
                    "p1",
                    (state) =>
                        !state.isSpectator &&
                        state.myHoleCards.length === 2 &&
                        state.eventLog.some(
                            (event) =>
                                event.type === "player_reconnected" &&
                                event.playerId === "p1",
                        ),
                    { since: resumeCursor },
                );

                expect(resumedState.data.street).toBe(
                    (hibernatedSnapshot.pokerState as PokerState).street,
                );
                resumedAlice.close();
            } finally {
                resumedAlice.close();
            }

            await waitForRoomCondition(roomId, (instance) => {
                return instance.state.phase === "hibernated"
                    ? instance.state.phase
                    : null;
            });

            const ranResetAlarm = await runDurableObjectAlarm(stub);
            expect(ranResetAlarm).toBe(true);

            const resetSnapshot = await withRoom(roomId, async (_, instance) => {
                return {
                    phase: instance.state.phase,
                    players: instance.state.players,
                    hostId: instance.state.hostId,
                    activeGameType: instance.state.activeGameType,
                    participants: instance.state.gameParticipants,
                    pokerState: instance.pokerState.current,
                };
            });

            expect(resetSnapshot).toEqual({
                phase: "lobby",
                players: [],
                hostId: null,
                activeGameType: null,
                participants: [],
                pokerState: null,
            });
        } finally {
            alice.close();
            bob.close();
        }
    });
});
