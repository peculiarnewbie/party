import { afterEach, describe, expect, it, vi } from "bun:test";
import { Effect } from "effect";

import {
    decodePokerClientMessage,
    encodePokerServerMessage,
} from "./messages";
import type { PokerClientMessage } from "./messages";
import { pokerServer } from "./server";
import type { PokerState } from "./types";

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

    it("encodes poker server messages with the current wire shape", () => {
        const encoded = encodePokerServerMessage({
            type: "poker:action_result",
            data: { error: "Not your turn" },
        });

        expect(JSON.parse(encoded)).toEqual({
            type: "poker:action_result",
            data: { error: "Not your turn" },
        });
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
