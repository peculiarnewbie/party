import { describe, it, expect } from "vitest";
import {
    resolveThrow,
    winsNeeded,
    initGame,
    processAction,
    removePlayer,
} from "./engine";
import { getPlayerView } from "./views";
import type { RpsState } from "./types";

describe("resolveThrow", () => {
    it("returns draw for same choices", () => {
        expect(resolveThrow("rock", "rock")).toBe("draw");
        expect(resolveThrow("paper", "paper")).toBe("draw");
        expect(resolveThrow("scissors", "scissors")).toBe("draw");
    });

    it("rock beats scissors", () => {
        expect(resolveThrow("rock", "scissors")).toBe("p1");
        expect(resolveThrow("scissors", "rock")).toBe("p2");
    });

    it("scissors beats paper", () => {
        expect(resolveThrow("scissors", "paper")).toBe("p1");
        expect(resolveThrow("paper", "scissors")).toBe("p2");
    });

    it("paper beats rock", () => {
        expect(resolveThrow("paper", "rock")).toBe("p1");
        expect(resolveThrow("rock", "paper")).toBe("p2");
    });
});

describe("winsNeeded", () => {
    it("returns correct wins needed", () => {
        expect(winsNeeded(1)).toBe(1);
        expect(winsNeeded(3)).toBe(2);
        expect(winsNeeded(5)).toBe(3);
    });
});

describe("initGame", () => {
    it("creates valid state for 2 players", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            3,
        );
        expect(state.players).toHaveLength(2);
        expect(state.bestOf).toBe(3);
        expect(state.phase).toBe("throwing");
        expect(state.currentRound).toBe(1);
        expect(state.totalRounds).toBe(1);
        expect(state.rounds).toHaveLength(1);
        expect(state.rounds[0].matches).toHaveLength(1);
        expect(state.rounds[0].byePlayerId).toBeNull();
    });

    it("creates bye for 3 players", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
                { id: "c", name: "Carol" },
            ],
            1,
        );
        expect(state.rounds[0].matches).toHaveLength(1);
        expect(state.rounds[0].byePlayerId).not.toBeNull();
        expect(state.totalRounds).toBe(2);
    });

    it("creates 2 matches for 4 players", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
                { id: "c", name: "Carol" },
                { id: "d", name: "Dave" },
            ],
            3,
        );
        expect(state.rounds[0].matches).toHaveLength(2);
        expect(state.rounds[0].byePlayerId).toBeNull();
        expect(state.totalRounds).toBe(2);
    });

    it("handles single player", () => {
        const state = initGame([{ id: "a", name: "Alice" }]);
        expect(state.phase).toBe("tournament_over");
        expect(state.winnerId).toBe("a");
    });
});

describe("processAction - throw", () => {
    function makeTwoPlayerState(): RpsState {
        return {
            players: [
                { id: "a", name: "Alice", eliminated: false },
                { id: "b", name: "Bob", eliminated: false },
            ],
            bestOf: 1,
            rounds: [
                {
                    roundNumber: 1,
                    matches: [
                        {
                            player1Id: "a",
                            player2Id: "b",
                            throws: [],
                            player1Wins: 0,
                            player2Wins: 0,
                            player1Choice: null,
                            player2Choice: null,
                            winnerId: null,
                            status: "active",
                        },
                    ],
                    byePlayerId: null,
                },
            ],
            currentRound: 1,
            phase: "throwing",
            winnerId: null,
            totalRounds: 1,
        };
    }

    it("registers a single throw", () => {
        const state = makeTwoPlayerState();
        const result = processAction(state, {
            type: "throw",
            playerId: "a",
            choice: "rock",
        });
        expect(result.type).toBe("throw_registered");
        if (result.type === "throw_registered") {
            expect(result.bothThrown).toBe(false);
            expect(result.matchComplete).toBe(false);
        }
        expect(state.rounds[0].matches[0].player1Choice).toBe("rock");
    });

    it("resolves when both throw in bo1", () => {
        const state = makeTwoPlayerState();
        processAction(state, {
            type: "throw",
            playerId: "a",
            choice: "rock",
        });
        const result = processAction(state, {
            type: "throw",
            playerId: "b",
            choice: "scissors",
        });

        expect(result.type).toBe("tournament_over");
        if (result.type === "tournament_over") {
            expect(result.winnerId).toBe("a");
        }
        expect(state.phase).toBe("tournament_over");
    });

    it("handles draw and lets players throw again", () => {
        const state = makeTwoPlayerState();
        processAction(state, {
            type: "throw",
            playerId: "a",
            choice: "rock",
        });
        processAction(state, {
            type: "throw",
            playerId: "b",
            choice: "rock",
        });

        expect(state.rounds[0].matches[0].throws).toHaveLength(1);
        expect(state.rounds[0].matches[0].throws[0].winnerId).toBeNull();
        expect(state.rounds[0].matches[0].player1Choice).toBeNull();
        expect(state.rounds[0].matches[0].player2Choice).toBeNull();
        expect(state.rounds[0].matches[0].status).toBe("active");
    });

    it("prevents double throw", () => {
        const state = makeTwoPlayerState();
        processAction(state, {
            type: "throw",
            playerId: "a",
            choice: "rock",
        });
        const result = processAction(state, {
            type: "throw",
            playerId: "a",
            choice: "paper",
        });
        expect(result.type).toBe("error");
    });
});

describe("processAction - bo3", () => {
    function makeBo3State(): RpsState {
        return {
            players: [
                { id: "a", name: "Alice", eliminated: false },
                { id: "b", name: "Bob", eliminated: false },
            ],
            bestOf: 3,
            rounds: [
                {
                    roundNumber: 1,
                    matches: [
                        {
                            player1Id: "a",
                            player2Id: "b",
                            throws: [],
                            player1Wins: 0,
                            player2Wins: 0,
                            player1Choice: null,
                            player2Choice: null,
                            winnerId: null,
                            status: "active",
                        },
                    ],
                    byePlayerId: null,
                },
            ],
            currentRound: 1,
            phase: "throwing",
            winnerId: null,
            totalRounds: 1,
        };
    }

    it("requires 2 wins to complete bo3", () => {
        const state = makeBo3State();

        processAction(state, {
            type: "throw",
            playerId: "a",
            choice: "rock",
        });
        processAction(state, {
            type: "throw",
            playerId: "b",
            choice: "scissors",
        });
        expect(state.rounds[0].matches[0].player1Wins).toBe(1);
        expect(state.rounds[0].matches[0].status).toBe("active");

        processAction(state, {
            type: "throw",
            playerId: "a",
            choice: "paper",
        });
        const result = processAction(state, {
            type: "throw",
            playerId: "b",
            choice: "rock",
        });
        expect(result.type).toBe("tournament_over");
        expect(state.rounds[0].matches[0].player1Wins).toBe(2);
        expect(state.rounds[0].matches[0].winnerId).toBe("a");
    });
});

describe("multi-round tournament", () => {
    it("advances through rounds with 4 players", () => {
        const state: RpsState = {
            players: [
                { id: "a", name: "Alice", eliminated: false },
                { id: "b", name: "Bob", eliminated: false },
                { id: "c", name: "Carol", eliminated: false },
                { id: "d", name: "Dave", eliminated: false },
            ],
            bestOf: 1,
            rounds: [
                {
                    roundNumber: 1,
                    matches: [
                        {
                            player1Id: "a",
                            player2Id: "b",
                            throws: [],
                            player1Wins: 0,
                            player2Wins: 0,
                            player1Choice: null,
                            player2Choice: null,
                            winnerId: null,
                            status: "active",
                        },
                        {
                            player1Id: "c",
                            player2Id: "d",
                            throws: [],
                            player1Wins: 0,
                            player2Wins: 0,
                            player1Choice: null,
                            player2Choice: null,
                            winnerId: null,
                            status: "active",
                        },
                    ],
                    byePlayerId: null,
                },
            ],
            currentRound: 1,
            phase: "throwing",
            winnerId: null,
            totalRounds: 2,
        };

        processAction(state, {
            type: "throw",
            playerId: "a",
            choice: "rock",
        });
        processAction(state, {
            type: "throw",
            playerId: "b",
            choice: "scissors",
        });

        expect(state.rounds[0].matches[0].winnerId).toBe("a");

        processAction(state, {
            type: "throw",
            playerId: "c",
            choice: "paper",
        });
        processAction(state, {
            type: "throw",
            playerId: "d",
            choice: "rock",
        });

        expect(state.phase).toBe("round_results");

        const result = processAction(state, {
            type: "next_round",
            playerId: "a",
        });

        expect(
            result.type === "round_advanced" ||
                result.type === "tournament_over",
        ).toBe(true);
        expect(state.currentRound).toBe(2);
        expect(state.rounds).toHaveLength(2);
        expect(state.rounds[1].matches).toHaveLength(1);
    });
});

describe("removePlayer", () => {
    it("forfeits match and may end tournament", () => {
        const state: RpsState = {
            players: [
                { id: "a", name: "Alice", eliminated: false },
                { id: "b", name: "Bob", eliminated: false },
            ],
            bestOf: 3,
            rounds: [
                {
                    roundNumber: 1,
                    matches: [
                        {
                            player1Id: "a",
                            player2Id: "b",
                            throws: [],
                            player1Wins: 0,
                            player2Wins: 0,
                            player1Choice: null,
                            player2Choice: null,
                            winnerId: null,
                            status: "active",
                        },
                    ],
                    byePlayerId: null,
                },
            ],
            currentRound: 1,
            phase: "throwing",
            winnerId: null,
            totalRounds: 1,
        };

        const result = removePlayer(state, "a");
        expect(result?.type).toBe("tournament_over");
        if (result?.type === "tournament_over") {
            expect(result.winnerId).toBe("b");
        }
    });
});

describe("getPlayerView", () => {
    it("hides opponent choice in active match", () => {
        const state: RpsState = {
            players: [
                { id: "a", name: "Alice", eliminated: false },
                { id: "b", name: "Bob", eliminated: false },
            ],
            bestOf: 3,
            rounds: [
                {
                    roundNumber: 1,
                    matches: [
                        {
                            player1Id: "a",
                            player2Id: "b",
                            throws: [],
                            player1Wins: 0,
                            player2Wins: 0,
                            player1Choice: "rock",
                            player2Choice: null,
                            winnerId: null,
                            status: "active",
                        },
                    ],
                    byePlayerId: null,
                },
            ],
            currentRound: 1,
            phase: "throwing",
            winnerId: null,
            totalRounds: 1,
        };

        const viewA = getPlayerView(state, "a");
        expect(viewA.myMatch?.myChoice).toBe("rock");
        expect(viewA.myMatch?.opponentHasThrown).toBe(false);
        expect(viewA.needsToThrow).toBe(false);

        const viewB = getPlayerView(state, "b");
        expect(viewB.myMatch?.myChoice).toBeNull();
        expect(viewB.myMatch?.opponentHasThrown).toBe(true);
        expect(viewB.needsToThrow).toBe(true);
    });
});
