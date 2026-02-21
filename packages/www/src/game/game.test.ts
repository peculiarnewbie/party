import { describe, it, expect } from "bun:test";
import { server, messageTypes } from "~/game";
import type { GameState } from "~/game";

describe("Game Logic", () => {
    describe("Player Management", () => {
        it("adds a new player to empty room", () => {
            const state: GameState = { players: [], hostId: null, answers: {} };
            const result = server(state).addPlayer("player-123", "Alice");

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: "player-123",
                name: "Alice",
                score: 0,
            });
        });

        it("updates existing player name on reconnect", () => {
            const state: GameState = {
                players: [{ id: "player-123", name: "Alice", score: 10 }],
                hostId: null,
                answers: {},
            };
            const result = server(state).addPlayer(
                "player-123",
                "Alice Updated",
            );

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Alice Updated");
            expect(result[0].score).toBe(10);
        });

        it("adds new player alongside existing ones", () => {
            const state: GameState = {
                players: [{ id: "player-123", name: "Alice", score: 0 }],
                hostId: null,
                answers: {},
            };
            const result = server(state).addPlayer("player-456", "Bob");

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe("Alice");
            expect(result[1].name).toBe("Bob");
        });

        it("removes player from room", () => {
            const state: GameState = {
                players: [
                    { id: "player-123", name: "Alice", score: 0 },
                    { id: "player-456", name: "Bob", score: 0 },
                ],
                hostId: null,
                answers: {},
            };
            const result = server(state).removePlayer("player-123");

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("player-456");
        });
    });

    describe("Host Assignment", () => {
        it("assigns first player as host", () => {
            const state: GameState = { players: [], hostId: null, answers: {} };
            const hostId = server(state).getOrSetHost("player-123");

            expect(hostId).toBe("player-123");
        });

        it("returns existing host on subsequent calls", () => {
            const state: GameState = {
                players: [],
                hostId: "player-123",
                answers: {},
            };
            const hostId = server(state).getOrSetHost("player-456");

            expect(hostId).toBe("player-123");
        });
    });

    describe("Message Types", () => {
        it("contains all expected message types", () => {
            expect(messageTypes).toContain("join");
            expect(messageTypes).toContain("leave");
            expect(messageTypes).toContain("start");
            expect(messageTypes).toContain("end");
            expect(messageTypes).toContain("info");
            expect(messageTypes).toContain("answer");
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
