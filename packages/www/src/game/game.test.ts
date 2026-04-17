import { describe, it, expect } from "vitest";
import { Effect } from "effect";

import {
    decodeClientMessage,
    encodeServerMessage,
    messageTypes,
    server,
} from "~/game";
import type { GameState } from "~/game";

function makeRoomState(overrides?: Partial<GameState>): GameState {
    return {
        players: [],
        hostId: null,
        answers: {},
        phase: "lobby",
        selectedGameType: "quiz",
        activeGameType: null,
        gameSessionId: null,
        gameParticipants: [],
        ...overrides,
    };
}

describe("Game Logic", () => {
    describe("Player Management", () => {
        it("adds a new player to empty room", () => {
            const state = makeRoomState();
            const result = server(state).addPlayer("player-123", "Alice");

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: "player-123",
                name: "Alice",
                score: 0,
            });
        });

        it("updates existing player name on reconnect", () => {
            const state = makeRoomState({
                players: [{ id: "player-123", name: "Alice", score: 10 }],
            });
            const result = server(state).addPlayer(
                "player-123",
                "Alice Updated",
            );

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Alice Updated");
            expect(result[0].score).toBe(10);
        });

        it("adds new player alongside existing ones", () => {
            const state = makeRoomState({
                players: [{ id: "player-123", name: "Alice", score: 0 }],
            });
            const result = server(state).addPlayer("player-456", "Bob");

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe("Alice");
            expect(result[1].name).toBe("Bob");
        });

        it("removes player from room", () => {
            const state = makeRoomState({
                players: [
                    { id: "player-123", name: "Alice", score: 0 },
                    { id: "player-456", name: "Bob", score: 0 },
                ],
            });
            const result = server(state).removePlayer("player-123");

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("player-456");
        });
    });

    describe("Host Assignment", () => {
        it("assigns first player as host", () => {
            const state = makeRoomState();
            const hostId = server(state).getOrSetHost("player-123");

            expect(hostId).toBe("player-123");
        });

        it("returns existing host on subsequent calls", () => {
            const state = makeRoomState({
                hostId: "player-123",
            });
            const hostId = server(state).getOrSetHost("player-456");

            expect(hostId).toBe("player-123");
        });

        it("reassigns host to next player when host leaves in lobby", () => {
            const state = makeRoomState({
                hostId: "player-123",
                players: [
                    { id: "player-123", name: "Alice", score: 0 },
                    { id: "player-456", name: "Bob", score: 0 },
                ],
            });

            server(state).removePlayer("player-123");

            expect(state.hostId).toBe("player-456");
        });
    });

    describe("Message Types", () => {
        it("contains all expected message types", () => {
            expect(messageTypes).toContain("identify");
            expect(messageTypes).toContain("join");
            expect(messageTypes).toContain("leave");
            expect(messageTypes).toContain("leave_game");
            expect(messageTypes).toContain("resume_room");
            expect(messageTypes).toContain("restart_room");
            expect(messageTypes).toContain("select_game");
            expect(messageTypes).toContain("start");
            expect(messageTypes).toContain("end");
            expect(messageTypes).toContain("return_to_lobby");
            expect(messageTypes).toContain("info");
            expect(messageTypes).toContain("answer");
        });
    });

    describe("Room Messages", () => {
        it("decodes a valid shared client message", async () => {
            const decoded = await Effect.runPromise(
                decodeClientMessage({
                    playerId: "host",
                    playerName: "Host",
                    type: "join",
                    data: {},
                }),
            );

            expect(decoded).toEqual({
                playerId: "host",
                playerName: "Host",
                type: "join",
                data: {},
            });
        });

        it("returns a typed decode error for invalid shared client messages", async () => {
            await expect(
                Effect.runPromise(
                    decodeClientMessage({
                        playerId: "host",
                        playerName: "Host",
                        type: "not-a-real-message",
                        data: {},
                    }),
                ),
            ).rejects.toMatchObject({
                _tag: "RoomMessageDecodeError",
            });
        });

        it("encodes shared server messages with the current wire shape", () => {
            const encoded = encodeServerMessage({
                type: "room_state",
                data: {
                    players: [],
                    hostId: null,
                    phase: "lobby",
                    selectedGameType: "quiz",
                    activeGameType: null,
                    gameSessionId: null,
                    gameParticipants: [],
                },
            });

            expect(JSON.parse(encoded)).toEqual({
                type: "room_state",
                data: {
                    players: [],
                    hostId: null,
                    phase: "lobby",
                    selectedGameType: "quiz",
                    activeGameType: null,
                    gameSessionId: null,
                    gameParticipants: [],
                },
            });
        });

        it("returns none for invalid JSON through the compatibility wrapper", async () => {
            const state = makeRoomState({
                hostId: "host",
                players: [{ id: "host", name: "Host", score: 0 }],
            });

            const result = await server(state).processMessage(
                "{not-valid-json",
                () => undefined,
            );

            expect(result).toEqual({ kind: "none" });
            expect(state.selectedGameType).toBe("quiz");
        });

        it("processes valid raw JSON through the compatibility wrapper", async () => {
            const state = makeRoomState({
                hostId: "host",
                players: [{ id: "host", name: "Host", score: 0 }],
            });

            const result = await server(state).processMessage(
                JSON.stringify({
                    playerId: "host",
                    playerName: "Host",
                    type: "select_game",
                    data: { gameType: "poker" },
                }),
                () => undefined,
            );

            expect(result).toEqual({ kind: "none" });
            expect(state.selectedGameType).toBe("poker");
        });

        it("lets the host change the selected game in lobby", async () => {
            const state = makeRoomState({
                hostId: "host",
                players: [{ id: "host", name: "Host", score: 0 }],
            });

            await server(state).processMessage(
                JSON.stringify({
                    playerId: "host",
                    playerName: "Host",
                    type: "select_game",
                    data: { gameType: "poker" },
                }),
                () => undefined,
            );

            expect(state.selectedGameType).toBe("poker");
        });

        it("allows selecting backwards poker as a distinct game", async () => {
            const state = makeRoomState({
                hostId: "host",
                players: [{ id: "host", name: "Host", score: 0 }],
            });

            await server(state).processMessage(
                JSON.stringify({
                    playerId: "host",
                    playerName: "Host",
                    type: "select_game",
                    data: { gameType: "backwards_poker" },
                }),
                () => undefined,
            );

            expect(state.selectedGameType).toBe("backwards_poker");
        });

        it("allows selecting lying yahtzee as a distinct game", async () => {
            const state = makeRoomState({
                hostId: "host",
                players: [{ id: "host", name: "Host", score: 0 }],
            });

            await server(state).processMessage(
                JSON.stringify({
                    playerId: "host",
                    playerName: "Host",
                    type: "select_game",
                    data: { gameType: "lying_yahtzee" },
                }),
                () => undefined,
            );

            expect(state.selectedGameType).toBe("lying_yahtzee");
        });

        it("allows selecting spicy as a distinct game", async () => {
            const state = makeRoomState({
                hostId: "host",
                players: [{ id: "host", name: "Host", score: 0 }],
            });

            await server(state).processMessage(
                JSON.stringify({
                    playerId: "host",
                    playerName: "Host",
                    type: "select_game",
                    data: { gameType: "spicy" },
                }),
                () => undefined,
            );

            expect(state.selectedGameType).toBe("spicy");
        });

        it("ignores game selection from non-hosts", async () => {
            const state = makeRoomState({
                hostId: "host",
                players: [
                    { id: "host", name: "Host", score: 0 },
                    { id: "guest", name: "Guest", score: 0 },
                ],
            });

            await server(state).processMessage(
                JSON.stringify({
                    playerId: "guest",
                    playerName: "Guest",
                    type: "select_game",
                    data: { gameType: "poker" },
                }),
                () => undefined,
            );

            expect(state.selectedGameType).toBe("quiz");
        });

        it("does not let the host change the selected game while hibernated", async () => {
            const state = makeRoomState({
                hostId: "host",
                phase: "hibernated",
                players: [{ id: "host", name: "Host", score: 0 }],
            });

            await server(state).processMessage(
                JSON.stringify({
                    playerId: "host",
                    playerName: "Host",
                    type: "select_game",
                    data: { gameType: "poker" },
                }),
                () => undefined,
            );

            expect(state.selectedGameType).toBe("quiz");
        });

        it("starts the selected game instead of trusting the client payload", async () => {
            const state = makeRoomState({
                hostId: "host",
                players: [
                    { id: "host", name: "Host", score: 0 },
                    { id: "guest", name: "Guest", score: 0 },
                ],
                selectedGameType: "poker",
            });

            const result = await server(state).processMessage(
                JSON.stringify({
                    playerId: "host",
                    playerName: "Host",
                    type: "start",
                    data: { gameType: "quiz" },
                }),
                () => undefined,
            );

            expect(result).toEqual({ kind: "start", gameType: "poker" });
            expect(state.activeGameType).toBe("poker");
            expect(state.phase).toBe("playing");
        });

        it("does not let the host start a hibernated room", async () => {
            const state = makeRoomState({
                hostId: "host",
                phase: "hibernated",
                players: [
                    { id: "host", name: "Host", score: 0 },
                    { id: "guest", name: "Guest", score: 0 },
                ],
                selectedGameType: "poker",
            });

            const result = await server(state).processMessage(
                JSON.stringify({
                    playerId: "host",
                    playerName: "Host",
                    type: "start",
                    data: {},
                }),
                () => undefined,
            );

            expect(result).toEqual({ kind: "none" });
            expect(state.phase).toBe("hibernated");
            expect(state.activeGameType).toBeNull();
        });

        it("marks a player as having left the active game", async () => {
            const state = makeRoomState({
                hostId: "host",
                phase: "playing",
                activeGameType: "yahtzee",
                gameSessionId: "session-1",
                gameParticipants: [
                    { playerId: "host", status: "active" },
                    { playerId: "guest", status: "active" },
                ],
            });

            const result = await server(state).processMessage(
                JSON.stringify({
                    playerId: "guest",
                    playerName: "Guest",
                    type: "leave_game",
                    data: {},
                }),
                () => undefined,
            );

            expect(result).toEqual({
                kind: "leave_game",
                gameType: "yahtzee",
                playerId: "guest",
            });
            expect(state.gameParticipants).toEqual([
                { playerId: "host", status: "active" },
                { playerId: "guest", status: "left_game" },
            ]);
        });

        it("does not start poker above the max player count", async () => {
            const state = makeRoomState({
                hostId: "host",
                selectedGameType: "poker",
                players: Array.from({ length: 9 }, (_, index) => ({
                    id: `p${index}`,
                    name: `P${index}`,
                    score: 0,
                })),
            });

            const result = await server(state).processMessage(
                JSON.stringify({
                    playerId: "host",
                    playerName: "Host",
                    type: "start",
                    data: {},
                }),
                () => undefined,
            );

            expect(result).toEqual({ kind: "none" });
            expect(state.phase).toBe("lobby");
            expect(state.activeGameType).toBeNull();
        });

        it("starts backwards poker using the selected game type", async () => {
            const state = makeRoomState({
                hostId: "host",
                players: [
                    { id: "host", name: "Host", score: 0 },
                    { id: "guest", name: "Guest", score: 0 },
                ],
                selectedGameType: "backwards_poker",
            });

            const result = await server(state).processMessage(
                JSON.stringify({
                    playerId: "host",
                    playerName: "Host",
                    type: "start",
                    data: {},
                }),
                () => undefined,
            );

            expect(result).toEqual({
                kind: "start",
                gameType: "backwards_poker",
            });
            expect(state.activeGameType).toBe("backwards_poker");
            expect(state.phase).toBe("playing");
        });

        it("starts lying yahtzee using the selected game type", async () => {
            const state = makeRoomState({
                hostId: "host",
                players: [
                    { id: "host", name: "Host", score: 0 },
                    { id: "guest", name: "Guest", score: 0 },
                ],
                selectedGameType: "lying_yahtzee",
            });

            const result = await server(state).processMessage(
                JSON.stringify({
                    playerId: "host",
                    playerName: "Host",
                    type: "start",
                    data: {},
                }),
                () => undefined,
            );

            expect(result).toEqual({
                kind: "start",
                gameType: "lying_yahtzee",
            });
            expect(state.activeGameType).toBe("lying_yahtzee");
            expect(state.phase).toBe("playing");
        });

        it("does not start lying yahtzee above two players", async () => {
            const state = makeRoomState({
                hostId: "host",
                selectedGameType: "lying_yahtzee",
                players: [
                    { id: "host", name: "Host", score: 0 },
                    { id: "guest-1", name: "Guest 1", score: 0 },
                    { id: "guest-2", name: "Guest 2", score: 0 },
                ],
            });

            const result = await server(state).processMessage(
                JSON.stringify({
                    playerId: "host",
                    playerName: "Host",
                    type: "start",
                    data: {},
                }),
                () => undefined,
            );

            expect(result).toEqual({ kind: "none" });
            expect(state.phase).toBe("lobby");
            expect(state.activeGameType).toBeNull();
        });
    });
});

describe("Quiz Questions Schema", () => {
    it("validates correct question structure", async () => {
        const { z } = await import("zod");
        const questionSchema = z.object({
            id: z.number(),
            text: z.string().min(1),
            options: z.array(z.string()).length(4),
            correctIndex: z.number().min(0).max(3),
            timerSeconds: z.number().min(5).max(60).default(10),
        });

        const validQuestion = {
            id: 1,
            text: "What is 2 + 2?",
            options: ["3", "4", "5", "6"],
            correctIndex: 1,
            timerSeconds: 15,
        };

        const result = questionSchema.parse(validQuestion);
        expect(result.text).toBe("What is 2 + 2?");
        expect(result.options).toHaveLength(4);
    });

    it("rejects invalid correctIndex", async () => {
        const { z } = await import("zod");
        const questionSchema = z.object({
            id: z.number(),
            text: z.string(),
            options: z.array(z.string()).length(4),
            correctIndex: z.number().min(0).max(3),
        });

        expect(() =>
            questionSchema.parse({
                id: 1,
                text: "Test",
                options: ["a", "b", "c", "d"],
                correctIndex: 5,
            }),
        ).toThrow();
    });
});
