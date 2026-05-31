import { describe, it, expect, vi } from "vitest";
import { Effect } from "effect";
import { createDispatcher } from "./dispatcher";

function runSync<A>(effect: Effect.Effect<A, unknown>): A {
    return Effect.runSync(effect as Effect.Effect<A, never>);
}

describe("createDispatcher", () => {
    function setup() {
        const broadcast = vi.fn();
        const sendTo = vi.fn();
        const dispatcher = createDispatcher({
            eventType: "rps:event",
            hiddenType: "rps:hidden",
            snapshotType: "rps:snapshot",
            broadcast,
            sendTo,
        });
        return { dispatcher, broadcast, sendTo };
    }

    it("broadcastEvent sends JSON with type, index, data", () => {
        const { dispatcher, broadcast } = setup();

        runSync(
            dispatcher.broadcastEvent({
                index: 5,
                data: { type: "throw_registered", playerId: "alice" },
            }),
        );

        expect(broadcast).toHaveBeenCalledTimes(1);
        const msg = JSON.parse(broadcast.mock.calls[0][0]);
        expect(msg).toEqual({
            type: "rps:event",
            index: 5,
            data: { type: "throw_registered", playerId: "alice" },
        });
    });

    it("sendHidden sends JSON to specific player", () => {
        const { dispatcher, sendTo } = setup();

        runSync(
            dispatcher.sendHidden({
                playerId: "alice",
                index: 5,
                data: { choice: "rock" },
            }),
        );

        expect(sendTo).toHaveBeenCalledTimes(1);
        expect(sendTo.mock.calls[0][0]).toBe("alice");
        const msg = JSON.parse(sendTo.mock.calls[0][1]);
        expect(msg).toEqual({
            type: "rps:hidden",
            index: 5,
            data: { choice: "rock" },
        });
    });

    it("broadcastSnapshot sends JSON with snapshot type", () => {
        const { dispatcher, broadcast } = setup();

        runSync(
            dispatcher.broadcastSnapshot({
                index: 10,
                data: { players: [], phase: "throwing" },
            }),
        );

        expect(broadcast).toHaveBeenCalledTimes(1);
        const msg = JSON.parse(broadcast.mock.calls[0][0]);
        expect(msg).toEqual({
            type: "rps:snapshot",
            index: 10,
            data: { players: [], phase: "throwing" },
        });
    });

    it("broadcastRaw sends raw message as JSON", () => {
        const { dispatcher, broadcast } = setup();

        dispatcher.broadcastRaw({
            type: "rps:game_over",
            data: { winnerId: "alice" },
        });

        expect(broadcast).toHaveBeenCalledTimes(1);
        const msg = JSON.parse(broadcast.mock.calls[0][0]);
        expect(msg).toEqual({
            type: "rps:game_over",
            data: { winnerId: "alice" },
        });
    });

    it("sendRaw sends raw message to specific player", () => {
        const { dispatcher, sendTo } = setup();

        dispatcher.sendRaw({
            playerId: "bob",
            message: { type: "rps:error", data: { message: "Invalid" } },
        });

        expect(sendTo).toHaveBeenCalledTimes(1);
        expect(sendTo.mock.calls[0][0]).toBe("bob");
        const msg = JSON.parse(sendTo.mock.calls[0][1]);
        expect(msg).toEqual({
            type: "rps:error",
            data: { message: "Invalid" },
        });
    });
});
