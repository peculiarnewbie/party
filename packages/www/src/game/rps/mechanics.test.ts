import { describe, it, expect } from "vitest";
import {
    resolveThrow,
    winsNeeded,
    initGame,
    getCurrentRound,
    checkRoundComplete,
    collectRoundWinners,
    findActiveMatch,
    getPlayerMatchPosition,
    validateThrow,
    validateNextRound,
} from "./mechanics";
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
        const state = initGame([
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ]);
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
        const state = initGame([
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
            { id: "c", name: "Carol" },
        ]);
        expect(state.rounds[0].matches).toHaveLength(1);
        expect(state.rounds[0].byePlayerId).not.toBeNull();
        expect(state.totalRounds).toBe(2);
    });

    it("creates 2 matches for 4 players", () => {
        const state = initGame([
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
            { id: "c", name: "Carol" },
            { id: "d", name: "Dave" },
        ]);
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

describe("getCurrentRound", () => {
    it("returns the current round", () => {
        const state = initGame([
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ]);
        const round = getCurrentRound(state);
        expect(round).not.toBeNull();
        expect(round!.roundNumber).toBe(1);
    });
});

describe("findActiveMatch", () => {
    it("finds match containing the player", () => {
        const state = initGame([
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ]);
        const round = getCurrentRound(state)!;
        const matchA = findActiveMatch(round, "a");
        const matchB = findActiveMatch(round, "b");
        expect(matchA).not.toBeNull();
        expect(matchB).not.toBeNull();
        expect(matchA).toBe(matchB);
    });

    it("returns null for player not in round", () => {
        const state = initGame([
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ]);
        const round = getCurrentRound(state)!;
        const match = findActiveMatch(round, "c");
        expect(match).toBeNull();
    });
});

describe("getPlayerMatchPosition", () => {
    it("returns correct position for each player", () => {
        const state = initGame([
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ]);
        const round = getCurrentRound(state)!;
        const match = round.matches[0];
        const posA = getPlayerMatchPosition(match, "a");
        const posB = getPlayerMatchPosition(match, "b");
        expect(posA).not.toBeNull();
        expect(posB).not.toBeNull();
        expect(posA).not.toBe(posB);
        expect(getPlayerMatchPosition(match, "c")).toBeNull();
    });
});

describe("validateThrow", () => {
    function makeState(): RpsState {
        return initGame([
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ]);
    }

    it("accepts valid throw", () => {
        const state = makeState();
        const result = validateThrow(state, "a");
        expect(result.ok).toBe(true);
    });

    it("rejects throw when not in throwing phase", () => {
        const state = makeState();
        state.phase = "round_results";
        const result = validateThrow(state, "a");
        expect(result.ok).toBe(false);
    });

    it("rejects throw for player without active match", () => {
        const state = makeState();
        const result = validateThrow(state, "c");
        expect(result.ok).toBe(false);
    });
});

describe("validateNextRound", () => {
    it("rejects when not in round_results phase", () => {
        const state = initGame([
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ]);
        const result = validateNextRound(state);
        expect(result.ok).toBe(false);
    });
});
