import { describe, it, expect } from "vitest";
import { initGame, processAction, removePlayer } from "./engine";
import type { FunFactsState } from "./types";

const PLAYERS = [
    { id: "p1", name: "Alice" },
    { id: "p2", name: "Bob" },
    { id: "p3", name: "Charlie" },
];

function makeGame(opts?: { totalRounds?: number }): FunFactsState {
    return initGame(PLAYERS, "p1", opts);
}

describe("initGame", () => {
    it("creates a game with all players", () => {
        const state = makeGame();
        expect(state.players).toHaveLength(3);
        expect(state.hostId).toBe("p1");
        expect(state.phase).toBe("waiting");
        expect(state.roundNumber).toBe(0);
        expect(state.totalRounds).toBe(8);
        expect(state.teamScore).toBe(0);
    });

    it("respects custom total rounds", () => {
        const state = makeGame({ totalRounds: 4 });
        expect(state.totalRounds).toBe(4);
    });
});

describe("next_question", () => {
    it("starts a question from the bank", () => {
        const state = makeGame();
        const result = processAction(state, {
            type: "next_question",
            hostId: "p1",
        });
        expect(result.type).toBe("question_started");
        expect(state.phase).toBe("answering");
        expect(state.roundNumber).toBe(1);
        expect(state.currentQuestion).toBeTruthy();
    });

    it("uses a custom question", () => {
        const state = makeGame();
        const result = processAction(state, {
            type: "next_question",
            hostId: "p1",
            customQuestion: "How old are you?",
        });
        expect(result.type).toBe("question_started");
        if (result.type === "question_started") {
            expect(result.question).toBe("How old are you?");
        }
        expect(state.currentQuestion).toBe("How old are you?");
    });

    it("rejects non-host", () => {
        const state = makeGame();
        const result = processAction(state, {
            type: "next_question",
            hostId: "p2",
        });
        expect(result.type).toBe("error");
    });

    it("rejects when not in waiting phase", () => {
        const state = makeGame();
        state.phase = "answering";
        const result = processAction(state, {
            type: "next_question",
            hostId: "p1",
        });
        expect(result.type).toBe("error");
    });
});

describe("submit_answer", () => {
    it("records a player's answer", () => {
        const state = makeGame();
        processAction(state, { type: "next_question", hostId: "p1" });

        const result = processAction(state, {
            type: "submit_answer",
            playerId: "p1",
            answer: 42,
        });
        expect(result.type).toBe("answer_submitted");
        if (result.type === "answer_submitted") {
            expect(result.answeredCount).toBe(1);
            expect(result.totalPlayers).toBe(3);
        }
        expect(state.answers["p1"]).toBe(42);
    });

    it("overwrites previous answer", () => {
        const state = makeGame();
        processAction(state, { type: "next_question", hostId: "p1" });
        processAction(state, {
            type: "submit_answer",
            playerId: "p1",
            answer: 42,
        });
        processAction(state, {
            type: "submit_answer",
            playerId: "p1",
            answer: 99,
        });
        expect(state.answers["p1"]).toBe(99);
    });

    it("rejects when not in answering phase", () => {
        const state = makeGame();
        const result = processAction(state, {
            type: "submit_answer",
            playerId: "p1",
            answer: 42,
        });
        expect(result.type).toBe("error");
    });
});

describe("close_answers", () => {
    it("transitions to placing phase", () => {
        const state = makeGame();
        processAction(state, { type: "next_question", hostId: "p1" });
        processAction(state, {
            type: "submit_answer",
            playerId: "p1",
            answer: 5,
        });
        processAction(state, {
            type: "submit_answer",
            playerId: "p2",
            answer: 10,
        });
        processAction(state, {
            type: "submit_answer",
            playerId: "p3",
            answer: 3,
        });

        const result = processAction(state, {
            type: "close_answers",
            hostId: "p1",
        });
        expect(result.type).toBe("answers_closed");
        expect(state.phase).toBe("placing");
        expect(state.placingOrder).toHaveLength(3);
        expect(state.placedArrows).toHaveLength(1);
        expect(state.currentPlacerIndex).toBe(1);
    });

    it("requires at least 2 answers", () => {
        const state = makeGame();
        processAction(state, { type: "next_question", hostId: "p1" });
        processAction(state, {
            type: "submit_answer",
            playerId: "p1",
            answer: 5,
        });

        const result = processAction(state, {
            type: "close_answers",
            hostId: "p1",
        });
        expect(result.type).toBe("error");
    });
});

describe("place_arrow", () => {
    function setupPlacing(): FunFactsState {
        const state = makeGame();
        processAction(state, { type: "next_question", hostId: "p1" });
        processAction(state, {
            type: "submit_answer",
            playerId: "p1",
            answer: 5,
        });
        processAction(state, {
            type: "submit_answer",
            playerId: "p2",
            answer: 10,
        });
        processAction(state, {
            type: "submit_answer",
            playerId: "p3",
            answer: 3,
        });
        processAction(state, { type: "close_answers", hostId: "p1" });
        return state;
    }

    it("allows current placer to place their arrow", () => {
        const state = setupPlacing();
        const currentPlacer = state.placingOrder[state.currentPlacerIndex];
        const result = processAction(state, {
            type: "place_arrow",
            playerId: currentPlacer,
            position: 0,
        });
        expect(
            result.type === "arrow_placed" || result.type === "round_revealed",
        ).toBe(true);
        expect(state.placedArrows).toHaveLength(2);
    });

    it("rejects wrong player", () => {
        const state = setupPlacing();
        const wrongPlayer = state.placingOrder.find(
            (id, i) => i !== state.currentPlacerIndex,
        );
        const result = processAction(state, {
            type: "place_arrow",
            playerId: wrongPlayer!,
            position: 0,
        });
        expect(result.type).toBe("error");
    });

    it("transitions to reveal after last placement", () => {
        const state = setupPlacing();

        const secondPlacer = state.placingOrder[1];
        processAction(state, {
            type: "place_arrow",
            playerId: secondPlacer,
            position: 1,
        });

        const thirdPlacer = state.placingOrder[2];
        const result = processAction(state, {
            type: "place_arrow",
            playerId: thirdPlacer,
            position: 1,
        });

        expect(result.type).toBe("round_revealed");
        expect(state.phase).toBe("reveal");
        expect(state.lastRoundResult).not.toBeNull();
    });
});

describe("scoring", () => {
    it("scores correctly when order matches", () => {
        const state = makeGame({ totalRounds: 1 });
        processAction(state, { type: "next_question", hostId: "p1" });
        processAction(state, {
            type: "submit_answer",
            playerId: "p1",
            answer: 1,
        });
        processAction(state, {
            type: "submit_answer",
            playerId: "p2",
            answer: 5,
        });
        processAction(state, {
            type: "submit_answer",
            playerId: "p3",
            answer: 10,
        });
        processAction(state, { type: "close_answers", hostId: "p1" });

        state.placingOrder = ["p1", "p2", "p3"];
        state.placedArrows = ["p1"];
        state.currentPlacerIndex = 1;

        processAction(state, {
            type: "place_arrow",
            playerId: "p2",
            position: 1,
        });
        const result = processAction(state, {
            type: "place_arrow",
            playerId: "p3",
            position: 2,
        });

        expect(result.type).toBe("round_revealed");
        if (result.type === "round_revealed") {
            expect(result.result.correctArrows).toEqual(["p1", "p2", "p3"]);
            expect(result.result.removedArrows).toEqual([]);
            expect(result.result.pointsEarned).toBe(3);
        }
    });

    it("removes out of order arrows", () => {
        const state = makeGame({ totalRounds: 1 });
        processAction(state, { type: "next_question", hostId: "p1" });
        processAction(state, {
            type: "submit_answer",
            playerId: "p1",
            answer: 10,
        });
        processAction(state, {
            type: "submit_answer",
            playerId: "p2",
            answer: 5,
        });
        processAction(state, {
            type: "submit_answer",
            playerId: "p3",
            answer: 20,
        });
        processAction(state, { type: "close_answers", hostId: "p1" });

        state.placingOrder = ["p1", "p2", "p3"];
        state.placedArrows = ["p1"];
        state.currentPlacerIndex = 1;

        processAction(state, {
            type: "place_arrow",
            playerId: "p2",
            position: 1,
        });
        const result = processAction(state, {
            type: "place_arrow",
            playerId: "p3",
            position: 2,
        });

        expect(result.type).toBe("round_revealed");
        if (result.type === "round_revealed") {
            expect(result.result.correctArrows).toEqual(["p1", "p3"]);
            expect(result.result.removedArrows).toEqual(["p2"]);
            expect(result.result.pointsEarned).toBe(2);
        }
    });

    it("handles equal values as correct", () => {
        const state = makeGame({ totalRounds: 1 });
        processAction(state, { type: "next_question", hostId: "p1" });
        processAction(state, {
            type: "submit_answer",
            playerId: "p1",
            answer: 5,
        });
        processAction(state, {
            type: "submit_answer",
            playerId: "p2",
            answer: 5,
        });
        processAction(state, { type: "close_answers", hostId: "p1" });

        state.placingOrder = ["p1", "p2"];
        state.placedArrows = ["p1"];
        state.currentPlacerIndex = 1;

        const result = processAction(state, {
            type: "place_arrow",
            playerId: "p2",
            position: 1,
        });

        expect(result.type).toBe("round_revealed");
        if (result.type === "round_revealed") {
            expect(result.result.correctArrows).toEqual(["p1", "p2"]);
            expect(result.result.pointsEarned).toBe(2);
        }
    });
});

describe("next_round and game_over", () => {
    it("advances to next round", () => {
        const state = makeGame({ totalRounds: 3 });
        processAction(state, { type: "next_question", hostId: "p1" });
        processAction(state, {
            type: "submit_answer",
            playerId: "p1",
            answer: 1,
        });
        processAction(state, {
            type: "submit_answer",
            playerId: "p2",
            answer: 2,
        });
        processAction(state, { type: "close_answers", hostId: "p1" });

        state.placingOrder = ["p1", "p2"];
        state.placedArrows = ["p1"];
        state.currentPlacerIndex = 1;
        processAction(state, {
            type: "place_arrow",
            playerId: "p2",
            position: 1,
        });

        expect(state.phase).toBe("reveal");
        const result = processAction(state, {
            type: "next_round",
            hostId: "p1",
        });
        expect(result.type).toBe("round_advanced");
        expect(state.phase).toBe("waiting");
    });

    it("ends game after final round", () => {
        const state = makeGame({ totalRounds: 1 });
        processAction(state, { type: "next_question", hostId: "p1" });
        processAction(state, {
            type: "submit_answer",
            playerId: "p1",
            answer: 1,
        });
        processAction(state, {
            type: "submit_answer",
            playerId: "p2",
            answer: 2,
        });
        processAction(state, { type: "close_answers", hostId: "p1" });

        state.placingOrder = ["p1", "p2"];
        state.placedArrows = ["p1"];
        state.currentPlacerIndex = 1;
        processAction(state, {
            type: "place_arrow",
            playerId: "p2",
            position: 1,
        });

        expect(state.phase).toBe("reveal");
        const result = processAction(state, {
            type: "next_round",
            hostId: "p1",
        });
        expect(result.type).toBe("game_over");
        expect(state.phase).toBe("game_over");
    });
});

describe("removePlayer", () => {
    it("removes a player from the game", () => {
        const state = makeGame();
        removePlayer(state, "p3");
        expect(state.players).toHaveLength(2);
        expect(state.players.find((p) => p.id === "p3")).toBeUndefined();
    });

    it("ends game if fewer than 2 players remain", () => {
        const state = initGame(
            [
                { id: "p1", name: "Alice" },
                { id: "p2", name: "Bob" },
            ],
            "p1",
        );
        const result = removePlayer(state, "p2");
        expect(result?.type).toBe("game_over");
        expect(state.phase).toBe("game_over");
    });

    it("returns null if player not found", () => {
        const state = makeGame();
        const result = removePlayer(state, "nonexistent");
        expect(result).toBeNull();
    });
});
