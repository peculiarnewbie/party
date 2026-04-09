import { afterEach, describe, expect, it, vi } from "bun:test";
import { yahtzeeServer } from "./server";
import { makeState } from "./test-helpers";

const PLAYERS = [
    { id: "p1", name: "Alice" },
    { id: "p2", name: "Bob" },
];

function createHarness(mode: "standard" | "lying" = "standard") {
    const stateRef = { current: null as ReturnType<typeof makeState> | null };
    const broadcastLog: unknown[] = [];
    const sendLogByPlayer: Record<string, unknown[]> = {
        p1: [],
        p2: [],
    };

    const instance = yahtzeeServer(stateRef, { mode });

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

describe("yahtzeeServer", () => {
    it("sends personalized initial state to every player", () => {
        const harness = createHarness();

        harness.instance.initGame(PLAYERS, harness.broadcast, harness.sendTo);

        expect(harness.broadcastLog).toEqual([]);
        expect(harness.sendLogByPlayer.p1).toHaveLength(1);
        expect(harness.sendLogByPlayer.p2).toHaveLength(1);
        expect(harness.sendLogByPlayer.p1[0]).toMatchObject({
            type: "yahtzee:state",
            data: { myId: "p1", isMyTurn: true, canRoll: true },
        });
        expect(harness.sendLogByPlayer.p2[0]).toMatchObject({
            type: "yahtzee:state",
            data: { myId: "p2", isMyTurn: false, canRoll: false },
        });
    });

    it("broadcasts a roll action and refreshes all player views", () => {
        const harness = createHarness();
        vi.spyOn(Math, "random")
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(1 / 6)
            .mockReturnValueOnce(2 / 6)
            .mockReturnValueOnce(3 / 6)
            .mockReturnValueOnce(4 / 6);

        harness.instance.initGame(PLAYERS, harness.broadcast, harness.sendTo);
        harness.broadcastLog.length = 0;
        harness.sendLogByPlayer.p1.length = 0;
        harness.sendLogByPlayer.p2.length = 0;

        harness.instance.processMessage(
            {
                type: "yahtzee:roll",
                playerId: "p1",
                playerName: "Alice",
                data: {},
            },
            harness.broadcast,
            harness.sendTo,
        );

        expect(harness.broadcastLog).toEqual([
            {
                type: "yahtzee:action",
                data: {
                    type: "rolled",
                    playerId: "p1",
                    dice: [1, 2, 3, 4, 5],
                },
            },
        ]);
        expect(harness.sendLogByPlayer.p1[0]).toMatchObject({
            type: "yahtzee:state",
            data: {
                myId: "p1",
                isMyTurn: true,
                canScore: true,
                dice: [1, 2, 3, 4, 5],
            },
        });
        expect(harness.sendLogByPlayer.p2[0]).toMatchObject({
            type: "yahtzee:state",
            data: {
                myId: "p2",
                isMyTurn: false,
                canScore: false,
            },
        });
    });

    it("handles claim submission and challenge resolution in lying mode", () => {
        const harness = createHarness("lying");
        vi.spyOn(Math, "random")
            .mockReturnValueOnce(1 / 6)
            .mockReturnValueOnce(1 / 6)
            .mockReturnValueOnce(1 / 6)
            .mockReturnValueOnce(4 / 6)
            .mockReturnValueOnce(4 / 6);

        harness.instance.initGame(PLAYERS, harness.broadcast, harness.sendTo);
        harness.broadcastLog.length = 0;
        harness.sendLogByPlayer.p1.length = 0;
        harness.sendLogByPlayer.p2.length = 0;

        harness.instance.processMessage(
            {
                type: "yahtzee:roll",
                playerId: "p1",
                playerName: "Alice",
                data: {},
            },
            harness.broadcast,
            harness.sendTo,
        );
        harness.instance.processMessage(
            {
                type: "yahtzee:claim",
                playerId: "p1",
                playerName: "Alice",
                data: {
                    category: "full_house",
                    claimedDice: [2, 2, 5, 5, 5],
                },
            },
            harness.broadcast,
            harness.sendTo,
        );

        expect(harness.broadcastLog[1]).toEqual({
            type: "yahtzee:action",
            data: {
                type: "claim_submitted",
                playerId: "p1",
                category: "full_house",
                claimedDice: [2, 2, 5, 5, 5],
                claimedPoints: 25,
            },
        });
        expect(harness.sendLogByPlayer.p2[1]).toMatchObject({
            type: "yahtzee:state",
            data: {
                myId: "p2",
                canAcceptClaim: true,
                canChallengeClaim: true,
                pendingClaim: {
                    playerId: "p1",
                    category: "full_house",
                    claimedPoints: 25,
                },
            },
        });

        harness.broadcastLog.length = 0;
        harness.sendLogByPlayer.p1.length = 0;
        harness.sendLogByPlayer.p2.length = 0;

        harness.instance.processMessage(
            {
                type: "yahtzee:challenge_claim",
                playerId: "p2",
                playerName: "Bob",
                data: {},
            },
            harness.broadcast,
            harness.sendTo,
        );

        expect(harness.broadcastLog[0]).toMatchObject({
            type: "yahtzee:action",
            data: {
                type: "claim_resolved",
                playerId: "p1",
                category: "full_house",
                points: -25,
                outcome: "caught_lying",
            },
        });
        expect(harness.sendLogByPlayer.p2[0]).toMatchObject({
            type: "yahtzee:state",
            data: {
                myId: "p2",
                canRoll: true,
                lastTurnReveal: {
                    outcome: "caught_lying",
                    penaltyPlayerId: "p1",
                    penaltyPoints: 25,
                },
            },
        });
    });

    it("returns errors only to the acting player for invalid messages", () => {
        const harness = createHarness();

        harness.instance.initGame(PLAYERS, harness.broadcast, harness.sendTo);
        harness.broadcastLog.length = 0;
        harness.sendLogByPlayer.p1.length = 0;
        harness.sendLogByPlayer.p2.length = 0;

        harness.instance.processMessage(
            {
                type: "yahtzee:score",
                playerId: "p1",
                playerName: "Alice",
                data: { category: "chance" },
            },
            harness.broadcast,
            harness.sendTo,
        );

        expect(harness.broadcastLog).toEqual([]);
        expect(harness.sendLogByPlayer.p1).toEqual([
            {
                type: "yahtzee:error",
                data: { message: "Must roll first" },
            },
        ]);
        expect(harness.sendLogByPlayer.p2).toEqual([]);
    });

    it("emits final state and game over when the host ends the game", () => {
        const harness = createHarness();
        harness.instance.initGame(PLAYERS, harness.broadcast, harness.sendTo);
        harness.stateRef.current!.players[0].scorecard.chance = 24;
        harness.stateRef.current!.players[1].scorecard.chance = 10;
        harness.broadcastLog.length = 0;
        harness.sendLogByPlayer.p1.length = 0;
        harness.sendLogByPlayer.p2.length = 0;

        harness.instance.endGame(harness.broadcast, harness.sendTo);

        expect(harness.sendLogByPlayer.p1[0]).toMatchObject({
            type: "yahtzee:state",
            data: { phase: "game_over", winners: ["p1"] },
        });
        expect(harness.sendLogByPlayer.p2[0]).toMatchObject({
            type: "yahtzee:state",
            data: { phase: "game_over", winners: ["p1"] },
        });
        expect(harness.broadcastLog[0]).toEqual({
            type: "yahtzee:game_over",
            data: {
                winners: ["p1"],
                finalScores: [
                    { playerId: "p1", playerName: "Alice", total: 24 },
                    { playerId: "p2", playerName: "Bob", total: 10 },
                ],
            },
        });
    });

    it("emits game over when removing a player leaves a single winner", () => {
        const harness = createHarness();
        harness.instance.initGame(PLAYERS, harness.broadcast, harness.sendTo);
        harness.broadcastLog.length = 0;
        harness.sendLogByPlayer.p1.length = 0;
        harness.sendLogByPlayer.p2.length = 0;

        harness.instance.removePlayer("p2", harness.broadcast, harness.sendTo);

        expect(harness.sendLogByPlayer.p1[0]).toMatchObject({
            type: "yahtzee:state",
            data: { phase: "game_over", winners: ["p1"] },
        });
        expect(harness.broadcastLog[0]).toEqual({
            type: "yahtzee:game_over",
            data: {
                winners: ["p1"],
                finalScores: [{ playerId: "p1", playerName: "Alice", total: 0 }],
            },
        });
    });
});
