import { describe, it, expect } from "bun:test";

describe("Game Logic", () => {
    describe("Player Management", () => {
        it("adds a new player to empty room", async () => {
            const mockStorage = new Map();
            const mockCtx = {
                storage: {
                    get: mockResolvedValue(undefined),
                    put: mockResolvedValue(undefined),
                },
            } as any;

            const { server } = await import("~/game");
            const result = await server(mockCtx).addPlayer(
                "player-123",
                "Alice",
            );

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: "player-123",
                name: "Alice",
                score: 0,
            });
        });

        it("updates existing player name on reconnect", async () => {
            const existingPlayers = [
                { id: "player-123", name: "Alice", score: 10 },
            ];
            const mockStorage = new Map([["players", existingPlayers]]);
            const mockCtx = {
                storage: {
                    get: (key: string) => mockStorage.get(key),
                    put: mockResolvedValue(undefined),
                },
            } as any;

            const { server } = await import("~/game");
            const result = await server(mockCtx).addPlayer(
                "player-123",
                "Alice Updated",
            );

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Alice Updated");
            expect(result[0].score).toBe(10);
        });

        it("adds new player alongside existing ones", async () => {
            const existingPlayers = [
                { id: "player-123", name: "Alice", score: 0 },
            ];
            const mockStorage = new Map([["players", existingPlayers]]);
            const mockCtx = {
                storage: {
                    get: (key: string) => mockStorage.get(key),
                    put: mockResolvedValue(undefined),
                },
            } as any;

            const { server } = await import("~/game");
            const result = await server(mockCtx).addPlayer("player-456", "Bob");

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe("Alice");
            expect(result[1].name).toBe("Bob");
        });

        it("removes player from room", async () => {
            const existingPlayers = [
                { id: "player-123", name: "Alice", score: 0 },
                { id: "player-456", name: "Bob", score: 0 },
            ];
            const mockStorage = new Map([["players", existingPlayers]]);
            const mockCtx = {
                storage: {
                    get: (key: string) => mockStorage.get(key),
                    put: mockResolvedValue(undefined),
                },
            } as any;

            const { server } = await import("~/game");
            const result = await server(mockCtx).removePlayer("player-123");

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("player-456");
        });
    });

    describe("Host Assignment", () => {
        it("assigns first player as host", async () => {
            const mockStorage = new Map();
            const mockCtx = {
                storage: {
                    get: mockResolvedValue(undefined),
                    put: mockResolvedValue(undefined),
                },
            } as any;

            const { server } = await import("~/game");
            const hostId = await server(mockCtx).getOrSetHost("player-123");

            expect(hostId).toBe("player-123");
        });

        it("returns existing host on subsequent calls", async () => {
            const mockStorage = new Map([["hostId", "player-123"]]);
            const mockCtx = {
                storage: {
                    get: (key: string) => mockStorage.get(key),
                    put: mockResolvedValue(undefined),
                },
            } as any;

            const { server } = await import("~/game");
            const hostId = await server(mockCtx).getOrSetHost("player-456");

            expect(hostId).toBe("player-123");
        });
    });

    describe("Message Types", () => {
        it("contains all expected message types", async () => {
            const gameModule = await import("~/game");
            expect(gameModule.messageTypes).toContain("join");
            expect(gameModule.messageTypes).toContain("leave");
            expect(gameModule.messageTypes).toContain("start");
            expect(gameModule.messageTypes).toContain("end");
            expect(gameModule.messageTypes).toContain("info");
            expect(gameModule.messageTypes).toContain("answer");
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

function mockResolvedValue(value: unknown) {
    return () => Promise.resolve(value);
}
