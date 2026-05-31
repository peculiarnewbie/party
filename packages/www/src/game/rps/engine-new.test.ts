import { describe, it, expect, vi } from "vitest";
import { createRpsEngine } from "./engine-new";

function setup() {
    const broadcast = vi.fn();
    const sendTo = vi.fn();
    const engine = createRpsEngine({ broadcast, sendTo });
    return { engine, broadcast, sendTo };
}

function parseMessages(calls: string[]) {
    return calls.map((c) => JSON.parse(c));
}

function findMessage(calls: string[], type: string) {
    return parseMessages(calls).find((m) => m.type === type);
}

function findMessages(calls: string[], type: string) {
    return parseMessages(calls).filter((m) => m.type === type);
}

function getEventTypes(broadcast: { mock: { calls: string[][] } }) {
    const allMsgs = parseMessages(broadcast.mock.calls.map((c: string[]) => c[0]));
    return allMsgs.filter((m: { type: string }) => m.type === "rps:event").map((m: { data: { type: string } }) => m.data.type);
}

describe("RpsEngine", () => {
    it("initGame broadcasts initial snapshot", () => {
        const { engine, broadcast } = setup();

        engine.initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            null,
        );

        const snapshot = findMessage(broadcast.mock.calls.map((c) => c[0]), "rps:snapshot");
        expect(snapshot).toBeDefined();
        expect(snapshot.index).toBe(0);
        expect(snapshot.data.phase).toBe("throwing");
    });

    it("processMessage handles throw action", () => {
        const { engine, broadcast, sendTo } = setup();

        engine.initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            null,
        );

        broadcast.mockClear();
        sendTo.mockClear();

        engine.processMessage(
            JSON.stringify({
                type: "rps:throw",
                playerId: "a",
                playerName: "Alice",
                data: { choice: "rock" },
            }),
        );

        const events = findMessages(broadcast.mock.calls.map((c) => c[0]), "rps:event");
        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(events[0].data.type).toBe("throw_registered");
        expect(events[0].data.playerId).toBe("a");

        const hidden = findMessages(sendTo.mock.calls.map((c) => c[1]), "rps:hidden");
        expect(hidden).toHaveLength(1);
        expect(hidden[0].data.choice).toBe("rock");
    });

    it("processMessage resolves match when both throw (bo1)", () => {
        const { engine, broadcast, sendTo } = setup();

        engine.initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            null,
        );

        engine.processMessage(JSON.stringify({
            type: "rps:set_best_of",
            playerId: "a",
            playerName: "Alice",
            data: { bestOf: 1 },
        }));

        broadcast.mockClear();
        sendTo.mockClear();

        engine.processMessage(
            JSON.stringify({
                type: "rps:throw",
                playerId: "a",
                playerName: "Alice",
                data: { choice: "rock" },
            }),
        );

        engine.processMessage(
            JSON.stringify({
                type: "rps:throw",
                playerId: "b",
                playerName: "Bob",
                data: { choice: "scissors" },
            }),
        );

        const types = getEventTypes(broadcast);

        expect(types).toContain("throw_registered");
        expect(types).toContain("throw_revealed");
        expect(types).toContain("match_completed");
        expect(types).toContain("tournament_over");
    });

    it("processMessage resolves bo3 match correctly", () => {
        const { engine, broadcast } = setup();

        engine.initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            null,
        );

        broadcast.mockClear();

        // Throw 1: Alice wins
        engine.processMessage(JSON.stringify({
            type: "rps:throw", playerId: "a", playerName: "Alice",
            data: { choice: "rock" },
        }));
        engine.processMessage(JSON.stringify({
            type: "rps:throw", playerId: "b", playerName: "Bob",
            data: { choice: "scissors" },
        }));

        // Throw 2: Alice wins again -> match over
        engine.processMessage(JSON.stringify({
            type: "rps:throw", playerId: "a", playerName: "Alice",
            data: { choice: "rock" },
        }));
        engine.processMessage(JSON.stringify({
            type: "rps:throw", playerId: "b", playerName: "Bob",
            data: { choice: "scissors" },
        }));

        const types = getEventTypes(broadcast);
        expect(types).toContain("match_completed");
        expect(types).toContain("tournament_over");
    });

    it("processMessage sends error for invalid throw", () => {
        const { engine, sendTo } = setup();

        engine.initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            null,
        );

        sendTo.mockClear();

        engine.processMessage(
            JSON.stringify({
                type: "rps:throw",
                playerId: "a",
                playerName: "Alice",
                data: { choice: "rock" },
            }),
        );

        engine.processMessage(
            JSON.stringify({
                type: "rps:throw",
                playerId: "a",
                playerName: "Alice",
                data: { choice: "paper" },
            }),
        );

        const errors = findMessages(sendTo.mock.calls.map((c) => c[1]), "rps:error");
        expect(errors).toHaveLength(1);
        expect(errors[0].data.message).toBe("already_thrown");
    });

    it("sync returns snapshot + events + hidden data", () => {
        const { engine } = setup();

        engine.initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            null,
        );

        engine.processMessage(
            JSON.stringify({
                type: "rps:throw",
                playerId: "a",
                playerName: "Alice",
                data: { choice: "rock" },
            }),
        );

        const sync = engine.sync("a", 0, 0);

        expect(sync.snapshot.index).toBe(0);
        expect(sync.events.length).toBeGreaterThanOrEqual(1);
        expect(sync.hidden.length).toBe(1);
        expect(sync.hidden[0].data).toEqual({ type: "throw_choice", choice: "rock" });
    });

    it("sync returns empty for unknown player", () => {
        const { engine } = setup();

        engine.initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            null,
        );

        engine.processMessage(
            JSON.stringify({
                type: "rps:throw",
                playerId: "a",
                playerName: "Alice",
                data: { choice: "rock" },
            }),
        );

        const sync = engine.sync("c", 0, 0);

        expect(sync.hidden).toHaveLength(0);
    });

    it("sync after a completed throw does not include stale hidden data", () => {
        const { engine } = setup();

        engine.initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            null,
        );

        engine.processMessage(JSON.stringify({
            type: "rps:throw",
            playerId: "a",
            playerName: "Alice",
            data: { choice: "rock" },
        }));
        engine.processMessage(JSON.stringify({
            type: "rps:throw",
            playerId: "b",
            playerName: "Bob",
            data: { choice: "scissors" },
        }));

        const sync = engine.sync("a", 0, 0);

        expect(sync.snapshot.index).toBeGreaterThan(0);
        expect(sync.events).toHaveLength(0);
        expect(sync.hidden).toHaveLength(0);
    });
});
