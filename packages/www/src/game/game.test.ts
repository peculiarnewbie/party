import { describe, it, expect } from "bun:test";
import { server, messageTypes } from "~/game";
import type { GameState } from "~/game";

function makeRoomState(overrides?: Partial<GameState>): GameState {
    return {
        players: [],
        hostId: null,
        answers: {},
        phase: "lobby",
        selectedGameType: "quiz",
        activeGameType: null,
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
            expect(messageTypes).toContain("join");
            expect(messageTypes).toContain("leave");
            expect(messageTypes).toContain("select_game");
            expect(messageTypes).toContain("start");
            expect(messageTypes).toContain("end");
            expect(messageTypes).toContain("return_to_lobby");
            expect(messageTypes).toContain("info");
            expect(messageTypes).toContain("answer");
        });
    });

    describe("Room Messages", () => {
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
