import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import { createRpsEngine } from "./engine-new";

const rpsChoiceArb = fc.constantFrom<"rock" | "paper" | "scissors">(
    "rock",
    "paper",
    "scissors",
);

function makePlayers(n: number) {
    return Array.from({ length: n }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
    }));
}

function driveGame(
    actions: { playerId: string; choice: "rock" | "paper" | "scissors" }[],
    playerIds: string[],
) {
    const broadcast = vi.fn();
    const sendTo = vi.fn();
    const engine = createRpsEngine({ broadcast, sendTo });
    engine.initGame(makePlayers(playerIds.length), null);

    for (const action of actions) {
        engine.processMessage(
            JSON.stringify({
                type: "rps:throw",
                playerId: action.playerId,
                playerName: action.playerId,
                data: { choice: action.choice },
            }),
        );
    }

    return { engine, broadcast, sendTo };
}

describe("RPS engine error fishing", () => {
    it("no errors with 2 players, random throws", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        playerId: fc.constantFrom("p0", "p1"),
                        choice: rpsChoiceArb,
                    }),
                    { minLength: 1, maxLength: 20 },
                ),
                (actions) => {
                    const { sendTo } = driveGame(actions, ["p0", "p1"]);
                    const errors = sendTo.mock.calls.filter(
                        (call: string[]) => {
                            try {
                                const msg = JSON.parse(call[1]);
                                return msg.type === "rps:error";
                            } catch {
                                return false;
                            }
                        },
                    );
                    for (const call of errors) {
                        const msg = JSON.parse(call[1]);
                        expect(msg.data.message).not.toBe("unknown_error");
                    }
                },
            ),
        );
    });

    it("no errors with 4 players, random throws", () => {
        const playerIds = ["p0", "p1", "p2", "p3"];
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        playerId: fc.constantFrom(...playerIds),
                        choice: rpsChoiceArb,
                    }),
                    { minLength: 1, maxLength: 40 },
                ),
                (actions) => {
                    const { sendTo } = driveGame(actions, playerIds);
                    const errors = sendTo.mock.calls.filter(
                        (call: string[]) => {
                            try {
                                const msg = JSON.parse(call[1]);
                                return msg.type === "rps:error";
                            } catch {
                                return false;
                            }
                        },
                    );
                    for (const call of errors) {
                        const msg = JSON.parse(call[1]);
                        expect(msg.data.message).not.toBe("unknown_error");
                    }
                },
            ),
        );
    });

    it("no errors with 8 players, random throws", () => {
        const playerIds = Array.from({ length: 8 }, (_, i) => `p${i}`);
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        playerId: fc.constantFrom(...playerIds),
                        choice: rpsChoiceArb,
                    }),
                    { minLength: 1, maxLength: 100 },
                ),
                (actions) => {
                    const { sendTo } = driveGame(actions, playerIds);
                    const errors = sendTo.mock.calls.filter(
                        (call: string[]) => {
                            try {
                                const msg = JSON.parse(call[1]);
                                return msg.type === "rps:error";
                            } catch {
                                return false;
                            }
                        },
                    );
                    for (const call of errors) {
                        const msg = JSON.parse(call[1]);
                        expect(msg.data.message).not.toBe("unknown_error");
                    }
                },
            ),
        );
    });

    it("no errors with 8 players, throws + next_round + set_best_of", () => {
        const playerIds = Array.from({ length: 8 }, (_, i) => `p${i}`);
        const actionArb = fc.oneof(
            fc.record({
                type: fc.constant("throw" as const),
                playerId: fc.constantFrom(...playerIds),
                choice: rpsChoiceArb,
            }),
            fc.record({
                type: fc.constant("next_round" as const),
                playerId: fc.constant("p0" as const),
            }),
            fc.record({
                type: fc.constant("set_best_of" as const),
                playerId: fc.constant("p0" as const),
                bestOf: fc.constantFrom<1 | 3 | 5>(1, 3, 5),
            }),
        );

        fc.assert(
            fc.property(
                fc.array(actionArb, { minLength: 1, maxLength: 150 }),
                (actions) => {
                    const broadcast = vi.fn();
                    const sendTo = vi.fn();
                    const engine = createRpsEngine({ broadcast, sendTo });
                    engine.initGame(makePlayers(8), null);

                    for (const action of actions) {
                        if (action.type === "throw") {
                            engine.processMessage(
                                JSON.stringify({
                                    type: "rps:throw",
                                    playerId: action.playerId,
                                    playerName: action.playerId,
                                    data: { choice: action.choice },
                                }),
                            );
                        } else if (action.type === "next_round") {
                            engine.processMessage(
                                JSON.stringify({
                                    type: "rps:next_round",
                                    playerId: action.playerId,
                                    playerName: action.playerId,
                                    data: {},
                                }),
                            );
                        } else if (action.type === "set_best_of") {
                            engine.processMessage(
                                JSON.stringify({
                                    type: "rps:set_best_of",
                                    playerId: action.playerId,
                                    playerName: action.playerId,
                                    data: { bestOf: action.bestOf },
                                }),
                            );
                        }
                    }

                    const errors = sendTo.mock.calls.filter(
                        (call: string[]) => {
                            try {
                                const msg = JSON.parse(call[1]);
                                return msg.type === "rps:error";
                            } catch {
                                return false;
                            }
                        },
                    );
                    for (const call of errors) {
                        const msg = JSON.parse(call[1]);
                        expect(msg.data.message).not.toBe("unknown_error");
                    }
                },
            ),
        );
    });
});
