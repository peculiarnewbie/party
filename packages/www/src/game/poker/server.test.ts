import { afterEach, describe, expect, it, vi } from "vitest";
import { Effect, Schema } from "effect";

import {
    decodePokerClientMessage,
    decodePokerServerMessage,
    encodePokerServerMessage,
} from "./messages";
import type { PokerClientMessage } from "./messages";
import { pokerEventSchema } from "./schemas";
import { pokerServer } from "./server";
import type { PokerState } from "./types";
import { makeView } from "./test-helpers";

const PLAYERS = [
    { id: "p1", name: "Alice" },
    { id: "p2", name: "Bob" },
];

function createHarness(visibilityMode: "standard" | "backwards" = "standard") {
    const stateRef = { current: null as PokerState | null };
    const broadcastLog: unknown[] = [];
    const sendLogByPlayer: Record<string, unknown[]> = {
        p1: [],
        p2: [],
    };

    const instance = pokerServer(stateRef, { visibilityMode });

    return {
        stateRef,
        broadcastLog,
        sendLogByPlayer,
        instance,
        broadcast: (message: string) => {
            broadcastLog.push(JSON.parse(message));
        },
        sendTo: (playerId: string, message: string) => {
            sendLogByPlayer[playerId] ??= [];
            sendLogByPlayer[playerId].push(JSON.parse(message));
        },
    };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("pokerServer", () => {
    it("decodes valid client messages for each discriminant", async () => {
        const messages: PokerClientMessage[] = [
            {
                type: "poker:act",
                playerId: "p1",
                playerName: "Alice",
                data: { type: "fold" },
            },
            {
                type: "poker:act",
                playerId: "p1",
                playerName: "Alice",
                data: { type: "check" },
            },
            {
                type: "poker:act",
                playerId: "p1",
                playerName: "Alice",
                data: { type: "call" },
            },
            {
                type: "poker:act",
                playerId: "p1",
                playerName: "Alice",
                data: { type: "bet", amount: 40 },
            },
            {
                type: "poker:act",
                playerId: "p1",
                playerName: "Alice",
                data: { type: "raise", amount: 80 },
            },
            {
                type: "poker:act",
                playerId: "p1",
                playerName: "Alice",
                data: { type: "all_in" },
            },
        ];

        for (const message of messages) {
            const decoded = await Effect.runPromise(
                decodePokerClientMessage(message),
            );
            expect(decoded).toEqual(message);
        }
    });

    it("returns a typed decode error for invalid poker messages", async () => {
        await expect(
            Effect.runPromise(
                decodePokerClientMessage({
                    type: "poker:act",
                    playerId: "p1",
                    playerName: "Alice",
                    data: { type: "bet", amount: 0 },
                }),
            ),
        ).rejects.toMatchObject({
            _tag: "PokerMessageDecodeError",
        });
    });

    it("round-trips typed poker server messages", async () => {
        const message = {
            type: "poker:action_result" as const,
            data: { error: "Not your turn" },
        };

        const encoded = encodePokerServerMessage(message);
        const decoded = await Effect.runPromise(
            decodePokerServerMessage(JSON.parse(encoded)),
        );

        expect(decoded).toEqual(message);
    });

    it("round-trips poker state views on the wire", async () => {
        const view = makeView({
            legalActions: ["fold", "call", "raise"],
        });
        const message = {
            type: "poker:state" as const,
            data: view,
        };

        const encoded = encodePokerServerMessage(message);
        const decoded = await Effect.runPromise(
            decodePokerServerMessage(JSON.parse(encoded)),
        );

        expect(decoded).toEqual(message);
    });

    it("rejects blinds_posted events missing playerId", () => {
        expect(() =>
            Schema.decodeUnknownSync(pokerEventSchema)({
                id: 1,
                type: "blinds_posted",
                message: "Blinds posted",
                amount: 10,
                street: "preflop",
            }),
        ).toThrow();
    });

    it("sends personalized initial state to every player", () => {
        const harness = createHarness();

        harness.instance.initGame(PLAYERS, harness.broadcast, harness.sendTo);

        expect(harness.broadcastLog).toHaveLength(1);
        expect(harness.broadcastLog[0]).toMatchObject({
            type: "poker:event",
        });
        expect(harness.sendLogByPlayer.p1[0]).toMatchObject({
            type: "poker:state",
            data: { myStatus: "active", isSpectator: false },
        });
        expect(harness.sendLogByPlayer.p1[0]).toMatchObject({
            data: { myHoleCards: expect.any(Array) },
        });
        expect(harness.sendLogByPlayer.p2[0]).toMatchObject({
            type: "poker:state",
            data: { myStatus: "active", isSpectator: false },
        });
    });

    it("returns action errors only to the acting player", () => {
        const harness = createHarness();

        harness.instance.initGame(PLAYERS, harness.broadcast, harness.sendTo);
        harness.broadcastLog.length = 0;
        harness.sendLogByPlayer.p1.length = 0;
        harness.sendLogByPlayer.p2.length = 0;

        harness.instance.processMessage(
            {
                type: "poker:act",
                playerId: "p2",
                playerName: "Bob",
                data: { type: "check" },
            },
            harness.broadcast,
            harness.sendTo,
        );

        expect(harness.broadcastLog).toEqual([]);
        expect(harness.sendLogByPlayer.p1).toEqual([]);
        expect(harness.sendLogByPlayer.p2).toEqual([
            {
                type: "poker:action_result",
                data: { error: "It is not your turn" },
            },
        ]);
    });
});
