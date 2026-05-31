import { describe, it, expect } from "vitest";
import { fold, createInitialFoldState, getPlayerChoice, hasPlayerThrown } from "./fold";
import type { RpsEvent, RpsHiddenData } from "./events";
import type { RpsState } from "./types";

function makeTwoPlayerState(): RpsState {
    return {
        players: [
            { id: "alice", name: "Alice", eliminated: false },
            { id: "bob", name: "Bob", eliminated: false },
        ],
        bestOf: 1,
        rounds: [
            {
                roundNumber: 1,
                matches: [
                    {
                        player1Id: "alice",
                        player2Id: "bob",
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

describe("fold", () => {
    it("applies best_of_changed event", () => {
        const state = makeTwoPlayerState();
        const fs = createInitialFoldState(state);

        const result = fold(fs, { type: "best_of_changed", bestOf: 5 });
        expect(result.publicState.bestOf).toBe(5);
    });

    it("throw_registered with hidden data tracks the choice", () => {
        const state = makeTwoPlayerState();
        const fs = createInitialFoldState(state);

        const event: RpsEvent = {
            type: "throw_registered",
            playerId: "alice",
            matchIndex: 0,
        };
        const hidden: RpsHiddenData = { type: "throw_choice", choice: "rock" };

        const result = fold(fs, event, hidden);

        expect(result.publicState).toBe(fs.publicState);
        expect(getPlayerChoice(result, 0, "alice")).toBe("rock");
        expect(hasPlayerThrown(result, 0, "alice")).toBe(true);
        expect(hasPlayerThrown(result, 0, "bob")).toBe(false);
    });

    it("throw_registered without hidden data does not track choice", () => {
        const state = makeTwoPlayerState();
        const fs = createInitialFoldState(state);

        const event: RpsEvent = {
            type: "throw_registered",
            playerId: "alice",
            matchIndex: 0,
        };

        const result = fold(fs, event);

        expect(getPlayerChoice(result, 0, "alice")).toBeNull();
        expect(hasPlayerThrown(result, 0, "alice")).toBe(false);
    });

    it("throw_revealed clears tracked choices and updates state", () => {
        const state = makeTwoPlayerState();
        let fs = createInitialFoldState(state);

        fs = fold(fs, {
            type: "throw_registered",
            playerId: "alice",
            matchIndex: 0,
        }, { type: "throw_choice", choice: "rock" });

        fs = fold(fs, {
            type: "throw_registered",
            playerId: "bob",
            matchIndex: 0,
        }, { type: "throw_choice", choice: "scissors" });

        fs = fold(fs, {
            type: "throw_revealed",
            matchIndex: 0,
            player1Choice: "rock",
            player2Choice: "scissors",
            winnerId: "alice",
        });

        expect(getPlayerChoice(fs, 0, "alice")).toBeNull();
        expect(hasPlayerThrown(fs, 0, "alice")).toBe(false);
        expect(fs.publicState.rounds[0].matches[0].throws).toHaveLength(1);
        expect(fs.publicState.rounds[0].matches[0].player1Wins).toBe(1);
    });

    it("tournament_over sets phase and winnerId", () => {
        const state = makeTwoPlayerState();
        const fs = createInitialFoldState(state);

        const result = fold(fs, {
            type: "tournament_over",
            winnerId: "alice",
        });

        expect(result.publicState.phase).toBe("tournament_over");
        expect(result.publicState.winnerId).toBe("alice");
    });

    it("multiple players can throw in different matches", () => {
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

        let fs = createInitialFoldState(state);

        fs = fold(fs, {
            type: "throw_registered",
            playerId: "a",
            matchIndex: 0,
        }, { type: "throw_choice", choice: "rock" });

        fs = fold(fs, {
            type: "throw_registered",
            playerId: "c",
            matchIndex: 1,
        }, { type: "throw_choice", choice: "paper" });

        expect(getPlayerChoice(fs, 0, "a")).toBe("rock");
        expect(getPlayerChoice(fs, 1, "c")).toBe("paper");
        expect(hasPlayerThrown(fs, 0, "a")).toBe(true);
        expect(hasPlayerThrown(fs, 1, "c")).toBe(true);
    });
});
