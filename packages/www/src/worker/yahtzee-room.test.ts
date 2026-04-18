import {
    env,
    runDurableObjectAlarm,
    runInDurableObject,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { GameParticipantStatus, RoomPhase } from "~/game";
import type { YahtzeeState } from "~/game/yahtzee";

import type { GameRoom } from "./ws";

type PlayerRecord = {
    id: string;
    name: string;
    score?: number;
};

type RoomParticipant = {
    playerId: string;
    status: GameParticipantStatus;
};

type RoomStatePayload = {
    players: PlayerRecord[];
    hostId: string | null;
    phase: RoomPhase;
    selectedGameType: string;
    activeGameType: string | null;
    gameSessionId: string | null;
    gameParticipants: RoomParticipant[];
};

type YahtzeePlayerView = {
    id: string;
    name: string;
    scorecard: Partial<Record<string, number>>;
    penaltyPoints: number;
    totalScore: number;
};

type PendingClaimView = {
    playerId: string;
    category: string;
    claimedDice: number[];
    claimedPoints: number;
};

type LastTurnRevealView = {
    outcome: "accepted" | "truthful_challenge" | "caught_lying";
    penaltyPlayerId: string | null;
    penaltyPoints: number;
    actualDice: number[];
    claimedDice: number[];
};

type YahtzeeStatePayload = {
    myId: string;
    mode: "standard" | "lying";
    phase: string;
    round: number;
    dice: number[];
    held: boolean[];
    currentPlayerId: string;
    isMyTurn: boolean;
    canRoll: boolean;
    canScore: boolean;
    canClaim: boolean;
    canAcceptClaim: boolean;
    canChallengeClaim: boolean;
    pendingClaim: PendingClaimView | null;
    lastTurnReveal: LastTurnRevealView | null;
    players: YahtzeePlayerView[];
};

type YahtzeeActionPayload = {
    type: string;
    playerId: string;
    category?: string;
    points?: number;
    claimedDice?: number[];
    claimedPoints?: number;
    outcome?: "accepted" | "truthful_challenge" | "caught_lying";
};

type MessageEnvelope = {
    type: string;
    data: Record<string, unknown>;
};

class TestRoomClient {
    readonly messages: MessageEnvelope[] = [];

    constructor(readonly socket: WebSocket) {
        socket.accept();
        socket.addEventListener("message", (event) => {
            this.messages.push(parseMessage(event.data));
        });
    }

    cursor() {
        return this.messages.length;
    }

    send(message: Record<string, unknown>) {
        this.socket.send(JSON.stringify(message));
    }

    close(code = 1000, reason = "test complete") {
        this.socket.close(code, reason);
    }

    async waitForMessage<T extends MessageEnvelope = MessageEnvelope>(
        predicate: (message: MessageEnvelope) => message is T,
        options?: { since?: number; timeoutMs?: number },
    ): Promise<T>;
    async waitForMessage(
        predicate: (message: MessageEnvelope) => boolean,
        options?: { since?: number; timeoutMs?: number },
    ): Promise<MessageEnvelope>;
    async waitForMessage(
        predicate: (message: MessageEnvelope) => boolean,
        options: { since?: number; timeoutMs?: number } = {},
    ) {
        const since = options.since ?? 0;
        const timeoutAt = Date.now() + (options.timeoutMs ?? 5_000);

        while (Date.now() < timeoutAt) {
            for (let index = since; index < this.messages.length; index++) {
                const message = this.messages[index];
                if (predicate(message)) {
                    return message;
                }
            }

            await sleep(20);
        }

        throw new Error(
            `Timed out waiting for websocket message.\nMessages:\n${JSON.stringify(
                this.messages,
                null,
                2,
            )}`,
        );
    }
}

function parseMessage(raw: unknown): MessageEnvelope {
    if (typeof raw === "string") {
        return JSON.parse(raw) as MessageEnvelope;
    }

    if (raw instanceof ArrayBuffer) {
        return JSON.parse(new TextDecoder().decode(raw)) as MessageEnvelope;
    }

    return JSON.parse(String(raw)) as MessageEnvelope;
}

function isRoomStateMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & { type: "room_state"; data: RoomStatePayload } {
    return message.type === "room_state";
}

function isYahtzeeStateMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & {
    type: "yahtzee:state";
    data: YahtzeeStatePayload;
} {
    return message.type === "yahtzee:state";
}

function isYahtzeeActionMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & {
    type: "yahtzee:action";
    data: YahtzeeActionPayload;
} {
    return message.type === "yahtzee:action";
}

function createRoomStub(roomId: string) {
    return env.WS.getByName(roomId);
}

async function connectClient(roomId: string) {
    const stub = createRoomStub(roomId);
    const response = await stub.fetch(
        new Request(`http://example.com/rooms/${roomId}`, {
            headers: {
                Upgrade: "websocket",
            },
        }),
    );

    expect(response.status).toBe(101);
    expect(response.webSocket).toBeDefined();

    const client = new TestRoomClient(response.webSocket as WebSocket);
    await client.waitForMessage(isRoomStateMessage);
    return { stub, client };
}

async function withRoom<R>(
    roomId: string,
    callback: (ctx: DurableObjectState, instance: GameRoom) => Promise<R> | R,
) {
    const stub = createRoomStub(roomId);
    return runInDurableObject(stub, async (instance, ctx) => {
        await instance.ready;
        return callback(ctx, instance);
    });
}

async function sleep(intervalMs: number) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
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
    gameType: "yahtzee" | "lying_yahtzee",
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

function roll(client: TestRoomClient, playerId: string, playerName: string) {
    client.send({
        type: "yahtzee:roll",
        playerId,
        playerName,
        data: {},
    });
}

function toggleHold(
    client: TestRoomClient,
    playerId: string,
    playerName: string,
    diceIndex: number,
) {
    client.send({
        type: "yahtzee:toggle_hold",
        playerId,
        playerName,
        data: { diceIndex },
    });
}

function score(
    client: TestRoomClient,
    playerId: string,
    playerName: string,
    category: string,
) {
    client.send({
        type: "yahtzee:score",
        playerId,
        playerName,
        data: { category },
    });
}

function claim(
    client: TestRoomClient,
    playerId: string,
    playerName: string,
    category: string,
    claimedDice: number[],
) {
    client.send({
        type: "yahtzee:claim",
        playerId,
        playerName,
        data: { category, claimedDice },
    });
}

function challengeClaim(
    client: TestRoomClient,
    playerId: string,
    playerName: string,
) {
    client.send({
        type: "yahtzee:challenge_claim",
        playerId,
        playerName,
        data: {},
    });
}

function findPlayerScore(
    state: YahtzeeStatePayload,
    playerId: string,
    category: string,
) {
    return state.players.find((player) => player.id === playerId)?.scorecard[
        category
    ];
}

let roomCounter = 0;
function nextRoomId() {
    return `yahtzee-room-worker-${roomCounter++}`;
}

describe("GameRoom yahtzee sequences", () => {
    it("runs a real standard yahtzee room flow with personalized state and persistence", async () => {
        const roomId = nextRoomId();
        const { client: alice } = await connectClient(roomId);
        const { client: bob } = await connectClient(roomId);

        try {
            const aliceJoinCursor = alice.cursor();
            const bobJoinCursor = bob.cursor();
            await joinRoom(alice, "p1", "Alice");
            await joinRoom(bob, "p2", "Bob");

            const roomState = await alice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "room_state";
                    data: RoomStatePayload;
                } =>
                    isRoomStateMessage(message) &&
                    message.data.players.length === 2 &&
                    message.data.hostId === "p1" &&
                    message.data.phase === "lobby",
                { since: aliceJoinCursor },
            );
            await bob.waitForMessage(
                (message) =>
                    isRoomStateMessage(message) &&
                    message.data.players.length === 2 &&
                    message.data.hostId === "p1",
                { since: bobJoinCursor },
            );

            expect(roomState.data.selectedGameType).toBe("quiz");

            const selectCursor = alice.cursor();
            selectGame(alice, "p1", "Alice", "yahtzee");
            await alice.waitForMessage(
                (message) =>
                    isRoomStateMessage(message) &&
                    message.data.selectedGameType === "yahtzee" &&
                    message.data.phase === "lobby",
                { since: selectCursor },
            );

            const startCursorAlice = alice.cursor();
            const startCursorBob = bob.cursor();
            startGame(alice, "p1", "Alice");

            await alice.waitForMessage(
                (message) =>
                    isRoomStateMessage(message) &&
                    message.data.phase === "playing" &&
                    message.data.activeGameType === "yahtzee" &&
                    message.data.gameSessionId !== null &&
                    message.data.gameParticipants.length === 2,
                { since: startCursorAlice },
            );
            const aliceInitialState = await alice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:state";
                    data: YahtzeeStatePayload;
                } =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p1" &&
                    message.data.mode === "standard" &&
                    message.data.isMyTurn &&
                    message.data.canRoll,
                { since: startCursorAlice },
            );
            const bobInitialState = await bob.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:state";
                    data: YahtzeeStatePayload;
                } =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p2" &&
                    !message.data.isMyTurn &&
                    !message.data.canRoll,
                { since: startCursorBob },
            );

            expect(aliceInitialState.data.currentPlayerId).toBe("p1");
            expect(bobInitialState.data.currentPlayerId).toBe("p1");

            const rollCursorAlice = alice.cursor();
            const rollCursorBob = bob.cursor();
            roll(alice, "p1", "Alice");

            const rollAction = await alice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:action";
                    data: YahtzeeActionPayload;
                } =>
                    isYahtzeeActionMessage(message) &&
                    message.data.type === "rolled" &&
                    message.data.playerId === "p1",
                { since: rollCursorAlice },
            );
            const aliceRolledState = await alice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:state";
                    data: YahtzeeStatePayload;
                } =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p1" &&
                    message.data.phase === "mid_turn" &&
                    message.data.canScore &&
                    message.data.dice.every((die) => die >= 1 && die <= 6),
                { since: rollCursorAlice },
            );
            const bobObservedState = await bob.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:state";
                    data: YahtzeeStatePayload;
                } =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p2" &&
                    message.data.phase === "mid_turn" &&
                    !message.data.isMyTurn &&
                    !message.data.canScore,
                { since: rollCursorBob },
            );

            expect(rollAction.data.type).toBe("rolled");
            expect(aliceRolledState.data.dice).toHaveLength(5);
            expect(bobObservedState.data.dice).toHaveLength(5);

            const scoreCursorAlice = alice.cursor();
            const scoreCursorBob = bob.cursor();
            score(alice, "p1", "Alice", "chance");

            await alice.waitForMessage(
                (message) =>
                    isYahtzeeActionMessage(message) &&
                    message.data.type === "scored" &&
                    message.data.playerId === "p1" &&
                    message.data.category === "chance",
                { since: scoreCursorAlice },
            );
            const aliceAfterScore = await alice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:state";
                    data: YahtzeeStatePayload;
                } =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p1" &&
                    !message.data.isMyTurn &&
                    message.data.currentPlayerId === "p2" &&
                    findPlayerScore(message.data, "p1", "chance") !==
                        undefined,
                { since: scoreCursorAlice },
            );
            const bobAfterScore = await bob.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:state";
                    data: YahtzeeStatePayload;
                } =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p2" &&
                    message.data.isMyTurn &&
                    message.data.canRoll &&
                    message.data.currentPlayerId === "p2",
                { since: scoreCursorBob },
            );

            expect(findPlayerScore(aliceAfterScore.data, "p1", "chance")).toBe(
                findPlayerScore(bobAfterScore.data, "p1", "chance"),
            );

            const persisted = await withRoom(roomId, async (_, instance) => {
                return {
                    roomPhase: instance.state.phase,
                    activeGameType: instance.state.activeGameType,
                    participants: instance.state.gameParticipants,
                    yahtzeeState: instance.yahtzeeState.current,
                };
            });

            expect(persisted.roomPhase).toBe("playing");
            expect(persisted.activeGameType).toBe("yahtzee");
            expect(persisted.participants).toEqual([
                { playerId: "p1", status: "active" },
                { playerId: "p2", status: "active" },
            ]);
            expect(persisted.yahtzeeState).not.toBeNull();
            expect((persisted.yahtzeeState as YahtzeeState).currentPlayerIndex).toBe(
                1,
            );
        } finally {
            alice.close();
            bob.close();
        }
    });

    it("resolves a lying yahtzee challenge over the real room transport", async () => {
        const roomId = nextRoomId();
        const { client: alice } = await connectClient(roomId);
        const { client: bob } = await connectClient(roomId);

        try {
            await joinRoom(alice, "p1", "Alice");
            await joinRoom(bob, "p2", "Bob");
            selectGame(alice, "p1", "Alice", "lying_yahtzee");
            startGame(alice, "p1", "Alice");

            await alice.waitForMessage(
                (message) =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p1" &&
                    message.data.mode === "lying" &&
                    message.data.canRoll,
            );
            await bob.waitForMessage(
                (message) =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p2" &&
                    message.data.mode === "lying",
            );

            const rollCursor = alice.cursor();
            roll(alice, "p1", "Alice");
            const rolledState = await alice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:state";
                    data: YahtzeeStatePayload;
                } =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p1" &&
                    message.data.phase === "mid_turn" &&
                    message.data.canClaim,
                { since: rollCursor },
            );

            const claimedDice = [...rolledState.data.dice];
            claimedDice[0] = claimedDice[0] === 6 ? 5 : claimedDice[0] + 1;

            const claimCursorAlice = alice.cursor();
            const claimCursorBob = bob.cursor();
            claim(alice, "p1", "Alice", "chance", claimedDice);

            await alice.waitForMessage(
                (message) =>
                    isYahtzeeActionMessage(message) &&
                    message.data.type === "claim_submitted" &&
                    message.data.playerId === "p1" &&
                    message.data.category === "chance",
                { since: claimCursorAlice },
            );
            const bobPendingClaim = await bob.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:state";
                    data: YahtzeeStatePayload;
                } =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p2" &&
                    message.data.phase === "awaiting_response" &&
                    message.data.canAcceptClaim &&
                    message.data.canChallengeClaim &&
                    message.data.pendingClaim?.playerId === "p1",
                { since: claimCursorBob },
            );

            expect(bobPendingClaim.data.pendingClaim?.claimedPoints).toBeGreaterThan(
                0,
            );

            const resolveCursorAlice = alice.cursor();
            const resolveCursorBob = bob.cursor();
            challengeClaim(bob, "p2", "Bob");

            const resolution = await alice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:action";
                    data: YahtzeeActionPayload;
                } =>
                    isYahtzeeActionMessage(message) &&
                    message.data.type === "claim_resolved" &&
                    message.data.playerId === "p1" &&
                    message.data.outcome === "caught_lying",
                { since: resolveCursorAlice },
            );
            const bobAfterChallenge = await bob.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:state";
                    data: YahtzeeStatePayload;
                } =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p2" &&
                    message.data.currentPlayerId === "p2" &&
                    message.data.isMyTurn &&
                    message.data.canRoll &&
                    message.data.lastTurnReveal?.outcome === "caught_lying",
                { since: resolveCursorBob },
            );

            expect(resolution.data.points).toBeLessThan(0);
            expect(bobAfterChallenge.data.lastTurnReveal).toMatchObject({
                outcome: "caught_lying",
                penaltyPlayerId: "p1",
            });
            expect(
                findPlayerScore(bobAfterChallenge.data, "p1", "chance"),
            ).toBeLessThan(0);
        } finally {
            alice.close();
            bob.close();
        }
    });

    it("rehydrates a disconnected player into an active yahtzee game", async () => {
        const roomId = nextRoomId();
        const { client: alice } = await connectClient(roomId);
        const { client: bob } = await connectClient(roomId);

        try {
            await joinRoom(alice, "p1", "Alice");
            await joinRoom(bob, "p2", "Bob");
            selectGame(alice, "p1", "Alice", "yahtzee");
            startGame(alice, "p1", "Alice");
            await alice.waitForMessage(
                (message) =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p1" &&
                    message.data.canRoll,
            );
            await bob.waitForMessage(
                (message) =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p2",
            );

            roll(alice, "p1", "Alice");
            await alice.waitForMessage(
                (message) =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p1" &&
                    message.data.phase === "mid_turn",
            );

            const disconnectCursor = alice.cursor();
            bob.close();
            await alice.waitForMessage(
                (message) =>
                    isRoomStateMessage(message) &&
                    message.data.phase === "playing" &&
                    message.data.gameParticipants.some(
                        (participant) =>
                            participant.playerId === "p2" &&
                            participant.status === "disconnected",
                    ),
                { since: disconnectCursor },
            );

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
                const rehydratedState = await bobReconnect.waitForMessage(
                    (message): message is MessageEnvelope & {
                        type: "yahtzee:state";
                        data: YahtzeeStatePayload;
                    } =>
                        isYahtzeeStateMessage(message) &&
                        message.data.myId === "p2" &&
                        message.data.phase === "mid_turn" &&
                        message.data.currentPlayerId === "p1" &&
                        !message.data.isMyTurn &&
                        !message.data.canRoll,
                    { since: identifyCursor },
                );

                expect(rehydratedState.data.players).toHaveLength(2);
                expect(rehydratedState.data.dice.every((die) => die >= 1)).toBe(
                    true,
                );
            } finally {
                bobReconnect.close();
            }
        } finally {
            alice.close();
        }
    });

    it("hibernates, resumes, and resets abandoned yahtzee rooms via alarms", async () => {
        const roomId = nextRoomId();
        const { stub, client: alice } = await connectClient(roomId);
        const { client: bob } = await connectClient(roomId);

        try {
            await joinRoom(alice, "p1", "Alice");
            await joinRoom(bob, "p2", "Bob");
            selectGame(alice, "p1", "Alice", "yahtzee");
            startGame(alice, "p1", "Alice");
            await alice.waitForMessage(
                (message) =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p1" &&
                    message.data.canRoll,
            );
            await bob.waitForMessage(
                (message) =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p2",
            );

            roll(alice, "p1", "Alice");
            const rolledState = await alice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:state";
                    data: YahtzeeStatePayload;
                } =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p1" &&
                    message.data.phase === "mid_turn",
            );

            const holdCursor = alice.cursor();
            toggleHold(alice, "p1", "Alice", 0);
            const heldState = await alice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:state";
                    data: YahtzeeStatePayload;
                } =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p1" &&
                    message.data.phase === "mid_turn" &&
                    message.data.held[0] === true,
                { since: holdCursor },
            );

            alice.close();
            bob.close();

            await withRoom(roomId, async (ctx, instance) => {
                const timeoutAt = Date.now() + 5_000;

                while (Date.now() < timeoutAt) {
                    if (instance.state.phase === "hibernated") {
                        return;
                    }

                    await new Promise((resolve) => setTimeout(resolve, 20));
                }

                throw new Error(
                    `Room did not hibernate. State: ${JSON.stringify(
                        {
                            phase: instance.state.phase,
                            participants: instance.state.gameParticipants,
                        },
                        null,
                        2,
                    )}`,
                );
            });

            const hibernatedSnapshot = await withRoom(roomId, async (ctx, instance) => {
                return {
                    alarm: await ctx.storage.getAlarm(),
                    phase: instance.state.phase,
                    participants: instance.state.gameParticipants,
                    yahtzeeState: instance.yahtzeeState.current,
                };
            });

            expect(hibernatedSnapshot.phase).toBe("hibernated");
            expect(hibernatedSnapshot.alarm).not.toBeNull();
            expect(hibernatedSnapshot.participants).toEqual([
                { playerId: "p1", status: "disconnected" },
                { playerId: "p2", status: "disconnected" },
            ]);
            expect((hibernatedSnapshot.yahtzeeState as YahtzeeState).held[0]).toBe(
                true,
            );
            expect((hibernatedSnapshot.yahtzeeState as YahtzeeState).dice).toEqual(
                rolledState.data.dice,
            );

            const { client: resumedAlice } = await connectClient(roomId);
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
            const resumedState = await resumedAlice.waitForMessage(
                (message): message is MessageEnvelope & {
                    type: "yahtzee:state";
                    data: YahtzeeStatePayload;
                } =>
                    isYahtzeeStateMessage(message) &&
                    message.data.myId === "p1" &&
                    message.data.phase === "mid_turn" &&
                    message.data.held[0] === true,
                { since: resumeCursor },
            );

            expect(resumedState.data.dice).toEqual(heldState.data.dice);
            resumedAlice.close();

            await withRoom(roomId, async (_, instance) => {
                const timeoutAt = Date.now() + 5_000;

                while (Date.now() < timeoutAt) {
                    if (instance.state.phase === "hibernated") {
                        return;
                    }

                    await sleep(20);
                }

                throw new Error(
                    `Room did not re-enter hibernation. State: ${JSON.stringify(
                        {
                            phase: instance.state.phase,
                            participants: instance.state.gameParticipants,
                        },
                        null,
                        2,
                    )}`,
                );
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
                    yahtzeeState: instance.yahtzeeState.current,
                };
            });

            expect(resetSnapshot).toEqual({
                phase: "lobby",
                players: [],
                hostId: null,
                activeGameType: null,
                participants: [],
                yahtzeeState: null,
            });

            const { client: freshClient } = await connectClient(roomId);
            try {
                const freshState = await freshClient.waitForMessage(
                    (message): message is MessageEnvelope & {
                        type: "room_state";
                        data: RoomStatePayload;
                    } =>
                        isRoomStateMessage(message) &&
                        message.data.phase === "lobby" &&
                        message.data.players.length === 0 &&
                        message.data.activeGameType === null,
                );

                expect(freshState.data.hostId).toBeNull();
            } finally {
                freshClient.close();
            }
        } finally {
            try {
                alice.close();
            } catch {}
            try {
                bob.close();
            } catch {}
        }
    });
});
