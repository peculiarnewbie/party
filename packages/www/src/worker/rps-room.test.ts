import { describe, expect, it } from "vitest";

import type { GameRoom } from "./ws";
import {
    type MessageEnvelope,
    type TestRoomClient,
    connectClient,
    sleep,
    withRoom,
} from "./test-utils/room-e2e";

type RpsState = {
    players: { id: string; name: string; eliminated: boolean }[];
    bestOf: number;
    rounds: {
        roundNumber: number;
        matches: {
            player1Id: string;
            player2Id: string;
            player1Wins: number;
            player2Wins: number;
            winnerId: string | null;
            status: "active" | "complete";
        }[];
        byePlayerId: string | null;
    }[];
    currentRound: number;
    phase: "throwing" | "round_results" | "tournament_over";
    winnerId: string | null;
    totalRounds: number;
};

function isRoomStateMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & { type: "room_state" } {
    return message.type === "room_state";
}

function isRpsSnapshotMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & { type: "rps:snapshot"; index: number; data: RpsState } {
    return message.type === "rps:snapshot";
}

function isRpsEventMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & { type: "rps:event"; data: { type: string } } {
    return message.type === "rps:event";
}

function isRpsGameOverMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & { type: "rps:game_over" } {
    return message.type === "rps:game_over";
}

function isRpsSyncResponseMessage(
    message: MessageEnvelope,
): message is MessageEnvelope & { type: "rps:sync_response"; snapshot: { data: RpsState } } {
    return message.type === "rps:sync_response";
}

function joinRoom(client: TestRoomClient, playerId: string, playerName: string) {
    client.send({ type: "join", playerId, playerName, data: {} });
}

function selectGame(client: TestRoomClient, playerId: string, playerName: string, gameType: string) {
    client.send({ type: "select_game", playerId, playerName, data: { gameType } });
}

function startGame(client: TestRoomClient, playerId: string, playerName: string) {
    client.send({ type: "start", playerId, playerName, data: {} });
}

function sendThrow(client: TestRoomClient, playerId: string, playerName: string, choice: "rock" | "paper" | "scissors") {
    client.send({ type: "rps:throw", playerId, playerName, data: { choice } });
}

function sendNextRound(client: TestRoomClient, playerId: string, playerName: string) {
    client.send({ type: "rps:next_round", playerId, playerName, data: {} });
}

function sendSetBestOf(client: TestRoomClient, playerId: string, playerName: string, bestOf: 1 | 3 | 5) {
    client.send({ type: "rps:set_best_of", playerId, playerName, data: { bestOf } });
}

function getLatestSnapshot(client: TestRoomClient): (MessageEnvelope & { type: "rps:snapshot"; data: RpsState }) | null {
    for (let i = client.messages.length - 1; i >= 0; i--) {
        if (isRpsSnapshotMessage(client.messages[i])) {
            return client.messages[i] as MessageEnvelope & { type: "rps:snapshot"; data: RpsState };
        }
    }
    return null;
}

function getEventsSince(client: TestRoomClient, since: number): MessageEnvelope[] {
    return client.messages.slice(since).filter(isRpsEventMessage);
}

function hasEventType(client: TestRoomClient, eventType: string, since?: number): boolean {
    const events = since !== undefined ? getEventsSince(client, since) : client.messages.filter(isRpsEventMessage);
    return events.some((e) => (e.data as { type: string }).type === eventType);
}

const CHOICES = ["rock", "paper", "scissors"] as const;

function pickWinningChoice(loserChoice: "rock" | "paper" | "scissors"): "rock" | "paper" | "scissors" {
    if (loserChoice === "rock") return "paper";
    if (loserChoice === "paper") return "scissors";
    return "rock";
}

let roomCounter = 0;
function nextRoomId() {
    return `rps-room-${roomCounter++}`;
}

const PLAYER_COUNT = 8;
const PLAYERS = Array.from({ length: PLAYER_COUNT }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
}));

describe("GameRoom RPS sequences", () => {
    it("runs a full 8-player tournament with bestOf=1", { timeout: 15000 }, async () => {
        const roomId = nextRoomId();
        const clients: TestRoomClient[] = [];

        try {
            for (const player of PLAYERS) {
                const { client } = await connectClient(roomId);
                clients.push(client);
                joinRoom(client, player.id, player.name);
                await sleep(50);
            }

            const host = clients[0];
            selectGame(host, "p0", "Player 0", "rps");
            await sleep(100);
            startGame(host, "p0", "Player 0");
            await sleep(500);

            const snapshot = getLatestSnapshot(host);
            expect(snapshot).not.toBeNull();
            expect(snapshot!.data.phase).toBe("throwing");
            expect(snapshot!.data.players).toHaveLength(PLAYER_COUNT);

            const currentRound = snapshot!.data.rounds.find(
                (r) => r.roundNumber === snapshot!.data.currentRound,
            );
            expect(currentRound).toBeDefined();
            expect(currentRound!.matches.length).toBe(4);

            for (const match of currentRound!.matches) {
                const p1Idx = PLAYERS.findIndex((p) => p.id === match.player1Id);
                const p2Idx = PLAYERS.findIndex((p) => p.id === match.player2Id);
                expect(p1Idx).toBeGreaterThanOrEqual(0);
                expect(p2Idx).toBeGreaterThanOrEqual(0);

                sendThrow(clients[p1Idx], PLAYERS[p1Idx].id, PLAYERS[p1Idx].name, "rock");
                await sleep(50);
                sendThrow(clients[p2Idx], PLAYERS[p2Idx].id, PLAYERS[p2Idx].name, "paper");
                await sleep(100);
            }

            await sleep(500);

            const hasEvents = clients.some((c) =>
                c.messages.some((m) => m.type === "rps:event"),
            );
            expect(hasEvents).toBe(true);

            const errors = clients.flatMap((c) =>
                c.messages.filter((m) => m.type === "rps:error"),
            );
            expect(errors).toHaveLength(0);
        } finally {
            for (const client of clients) {
                try { client.close(); } catch {}
            }
        }
    });

    it("handles player disconnect during match", async () => {
        const roomId = nextRoomId();
        const clients: TestRoomClient[] = [];

        try {
            for (const player of PLAYERS.slice(0, 4)) {
                const { client } = await connectClient(roomId);
                clients.push(client);
                joinRoom(client, player.id, player.name);
                await sleep(50);
            }

            const host = clients[0];
            selectGame(host, "p0", "Player 0", "rps");
            await sleep(100);
            startGame(host, "p0", "Player 0");
            await sleep(500);
            sendSetBestOf(host, "p0", "Player 0", 1);
            await sleep(200);

            const snapshot = getLatestSnapshot(host);
            expect(snapshot).not.toBeNull();
            expect(snapshot!.data.phase).toBe("throwing");

            const currentRound = snapshot!.data.rounds.find(
                (r) => r.roundNumber === snapshot!.data.currentRound,
            );
            expect(currentRound).toBeDefined();
            expect(currentRound!.matches.length).toBeGreaterThanOrEqual(1);

            const match = currentRound!.matches[0];
            const p1Index = PLAYERS.findIndex((p) => p.id === match.player1Id);
            const p2Index = PLAYERS.findIndex((p) => p.id === match.player2Id);

            clients[p2Index].close();
            await sleep(500);

            const postDisconnectSnap = getLatestSnapshot(host);
            expect(postDisconnectSnap).not.toBeNull();
        } finally {
            for (const client of clients) {
                try { client.close(); } catch {}
            }
        }
    });

    it("persists game state across reconnection", async () => {
        const roomId = nextRoomId();
        const clients: TestRoomClient[] = [];

        try {
            const { client: alice } = await connectClient(roomId);
            const { client: bob } = await connectClient(roomId);
            clients.push(alice, bob);

            joinRoom(alice, "p1", "Alice");
            joinRoom(bob, "p2", "Bob");
            await sleep(100);

            selectGame(alice, "p1", "Alice", "rps");
            await sleep(100);
            startGame(alice, "p1", "Alice");
            await sleep(500);

            const snapshot = getLatestSnapshot(alice);
            expect(snapshot).not.toBeNull();
            expect(snapshot!.data.phase).toBe("throwing");

            bob.close();
            await sleep(300);

            const { client: bobReconnect } = await connectClient(roomId);
            const identifyCursor = bobReconnect.cursor();
            bobReconnect.send({
                type: "identify",
                playerId: "p2",
                playerName: "Bob",
                data: {},
            });

            const reconnectedSync = await bobReconnect.waitForMessage(
                isRpsSyncResponseMessage,
                { since: identifyCursor, timeoutMs: 5000 },
            );
            expect(reconnectedSync).not.toBeNull();
            expect(reconnectedSync.snapshot.data.phase).toBe("throwing");

            clients.push(bobReconnect);
        } finally {
            for (const client of clients) {
                try { client.close(); } catch {}
            }
        }
    });
});
