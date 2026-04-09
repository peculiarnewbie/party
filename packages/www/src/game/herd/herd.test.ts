import { describe, it, expect } from "bun:test";
import {
    initGame,
    processAction,
    removePlayer,
    endGameByHost,
    normalizeAnswer,
    buildAnswerGroups,
} from "./engine";
import type { HerdState } from "./types";

function makePlayers(count: number) {
    return Array.from({ length: count }, (_, i) => ({
        id: `p${i + 1}`,
        name: `Player ${i + 1}`,
    }));
}

function startRound(state: HerdState, customQuestion?: string) {
    return processAction(state, {
        type: "next_question",
        hostId: state.hostId,
        customQuestion,
    });
}

function submitAnswer(state: HerdState, playerId: string, answer: string) {
    return processAction(state, {
        type: "submit_answer",
        playerId,
        answer,
    });
}

function closeAnswers(state: HerdState) {
    return processAction(state, {
        type: "close_answers",
        hostId: state.hostId,
    });
}

function mergeGroups(state: HerdState, groupId1: string, groupId2: string) {
    return processAction(state, {
        type: "merge_groups",
        hostId: state.hostId,
        groupId1,
        groupId2,
    });
}

function confirmScoring(state: HerdState) {
    return processAction(state, {
        type: "confirm_scoring",
        hostId: state.hostId,
    });
}

function nextRound(state: HerdState) {
    return processAction(state, {
        type: "next_round",
        hostId: state.hostId,
    });
}

describe("normalizeAnswer", () => {
    it("trims and lowercases", () => {
        expect(normalizeAnswer("  Dog  ")).toBe("dog");
        expect(normalizeAnswer("CAT")).toBe("cat");
        expect(normalizeAnswer("hello world")).toBe("hello world");
    });
});

describe("buildAnswerGroups", () => {
    it("groups case-insensitively", () => {
        const answers = { p1: "Dog", p2: "dog", p3: "Cat" };
        const { groups } = buildAnswerGroups(answers, 0);
        expect(groups).toHaveLength(2);

        const dogGroup = groups.find((g) =>
            g.canonicalAnswer.toLowerCase() === "dog",
        );
        expect(dogGroup).toBeDefined();
        expect(dogGroup!.playerIds).toHaveLength(2);
        expect(dogGroup!.playerIds).toContain("p1");
        expect(dogGroup!.playerIds).toContain("p2");
    });

    it("sorts by count descending", () => {
        const answers = { p1: "a", p2: "a", p3: "a", p4: "b", p5: "c" };
        const { groups } = buildAnswerGroups(answers, 0);
        expect(groups[0].playerIds).toHaveLength(3);
        expect(groups[0].canonicalAnswer).toBe("a");
    });

    it("preserves original answers", () => {
        const answers = { p1: "Dog", p2: "DOG" };
        const { groups } = buildAnswerGroups(answers, 0);
        expect(groups[0].originalAnswers.p1).toBe("Dog");
        expect(groups[0].originalAnswers.p2).toBe("DOG");
    });
});

describe("initGame", () => {
    it("creates initial state with correct defaults", () => {
        const players = makePlayers(4);
        const state = initGame(players, "host1");

        expect(state.players).toHaveLength(4);
        expect(state.hostId).toBe("host1");
        expect(state.phase).toBe("waiting");
        expect(state.roundNumber).toBe(0);
        expect(state.pinkCowEnabled).toBe(false);
        expect(state.pinkCowHolder).toBeNull();
        expect(state.winnerId).toBeNull();
        expect(state.winScore).toBe(8);
        expect(state.shuffledQuestions.length).toBeGreaterThan(0);
    });

    it("filters host out of players if included", () => {
        const players = [
            { id: "host1", name: "Host" },
            { id: "p1", name: "Player 1" },
            { id: "p2", name: "Player 2" },
        ];
        const state = initGame(players, "host1");
        expect(state.players).toHaveLength(2);
        expect(state.players.find((p) => p.id === "host1")).toBeUndefined();
    });

    it("respects custom options", () => {
        const state = initGame(makePlayers(3), "host1", {
            winScore: 5,
            pinkCowEnabled: true,
        });
        expect(state.winScore).toBe(5);
        expect(state.pinkCowEnabled).toBe(true);
    });
});

describe("toggle pink cow", () => {
    it("toggles pink cow on", () => {
        const state = initGame(makePlayers(3), "host1");
        const result = processAction(state, {
            type: "toggle_pink_cow",
            hostId: "host1",
            enabled: true,
        });
        expect(result.type).toBe("pink_cow_toggled");
        expect(state.pinkCowEnabled).toBe(true);
    });

    it("disabling clears existing cow", () => {
        const state = initGame(makePlayers(3), "host1", {
            pinkCowEnabled: true,
        });
        state.pinkCowHolder = "p1";
        state.players[0].hasPinkCow = true;

        processAction(state, {
            type: "toggle_pink_cow",
            hostId: "host1",
            enabled: false,
        });

        expect(state.pinkCowEnabled).toBe(false);
        expect(state.pinkCowHolder).toBeNull();
        expect(state.players[0].hasPinkCow).toBe(false);
    });

    it("fails if not in waiting phase", () => {
        const state = initGame(makePlayers(3), "host1");
        startRound(state);
        const result = processAction(state, {
            type: "toggle_pink_cow",
            hostId: "host1",
            enabled: true,
        });
        expect(result.type).toBe("error");
    });
});

describe("game flow", () => {
    it("advances through full round", () => {
        const state = initGame(makePlayers(4), "host1");

        const q = startRound(state, "Name a color");
        expect(q.type).toBe("question_started");
        expect(state.phase).toBe("answering");
        expect(state.currentQuestion).toBe("Name a color");

        const a1 = submitAnswer(state, "p1", "Blue");
        expect(a1.type).toBe("answer_submitted");
        if (a1.type === "answer_submitted") {
            expect(a1.answeredCount).toBe(1);
        }

        submitAnswer(state, "p2", "blue");
        submitAnswer(state, "p3", "Red");
        submitAnswer(state, "p4", "blue");

        const closed = closeAnswers(state);
        expect(closed.type).toBe("answers_closed");
        expect(state.phase).toBe("reveal");
        expect(state.answerGroups).toHaveLength(2);

        const confirmed = confirmScoring(state);
        expect(confirmed.type).toBe("scoring_confirmed");
        expect(state.phase).toBe("scored");

        const blueGroup = state.answerGroups.find(
            (g) => g.canonicalAnswer.toLowerCase() === "blue",
        );
        expect(blueGroup!.playerIds).toHaveLength(3);

        expect(state.players.find((p) => p.id === "p1")!.score).toBe(1);
        expect(state.players.find((p) => p.id === "p2")!.score).toBe(1);
        expect(state.players.find((p) => p.id === "p4")!.score).toBe(1);
        expect(state.players.find((p) => p.id === "p3")!.score).toBe(0);

        const nr = nextRound(state);
        expect(nr.type).toBe("round_advanced");
        expect(state.phase).toBe("waiting");
    });

    it("allows overwriting answers before close", () => {
        const state = initGame(makePlayers(3), "host1");
        startRound(state, "Name a fruit");

        submitAnswer(state, "p1", "Apple");
        submitAnswer(state, "p1", "Banana");

        expect(state.answers.p1).toBe("Banana");
    });

    it("uses custom question", () => {
        const state = initGame(makePlayers(3), "host1");
        startRound(state, "What is the best pizza?");
        expect(state.currentQuestion).toBe("What is the best pizza?");
    });

    it("uses question bank when no custom question", () => {
        const state = initGame(makePlayers(3), "host1");
        startRound(state);
        expect(state.currentQuestion).toBeTruthy();
        expect(state.currentQuestion!.length).toBeGreaterThan(0);
    });
});

describe("merge groups", () => {
    it("merges two groups", () => {
        const state = initGame(makePlayers(4), "host1");
        startRound(state, "Name a pet");
        submitAnswer(state, "p1", "Dog");
        submitAnswer(state, "p2", "Dogs");
        submitAnswer(state, "p3", "Cat");
        submitAnswer(state, "p4", "dog");
        closeAnswers(state);

        expect(state.answerGroups).toHaveLength(3);

        const dogGroup = state.answerGroups.find(
            (g) => g.canonicalAnswer.toLowerCase() === "dog",
        );
        const dogsGroup = state.answerGroups.find(
            (g) => g.canonicalAnswer.toLowerCase() === "dogs",
        );
        expect(dogGroup).toBeDefined();
        expect(dogsGroup).toBeDefined();
        expect(dogGroup!.playerIds).toHaveLength(2);
        expect(dogsGroup!.playerIds).toHaveLength(1);

        const result = mergeGroups(state, dogGroup!.id, dogsGroup!.id);
        expect(result.type).toBe("groups_merged");
        expect(state.answerGroups).toHaveLength(2);

        const merged = state.answerGroups.find(
            (g) => g.id === dogGroup!.id,
        );
        expect(merged!.playerIds).toHaveLength(3);
        expect(merged!.playerIds).toContain("p1");
        expect(merged!.playerIds).toContain("p2");
        expect(merged!.playerIds).toContain("p4");
    });

    it("fails to merge non-existent groups", () => {
        const state = initGame(makePlayers(3), "host1");
        startRound(state, "Test");
        submitAnswer(state, "p1", "A");
        closeAnswers(state);

        const result = mergeGroups(state, "g999", "g998");
        expect(result.type).toBe("error");
    });

    it("fails to merge group with itself", () => {
        const state = initGame(makePlayers(3), "host1");
        startRound(state, "Test");
        submitAnswer(state, "p1", "A");
        submitAnswer(state, "p2", "B");
        closeAnswers(state);

        const gId = state.answerGroups[0].id;
        const result = mergeGroups(state, gId, gId);
        expect(result.type).toBe("error");
    });
});

describe("scoring", () => {
    it("nobody scores on tied majority", () => {
        const state = initGame(makePlayers(4), "host1");
        startRound(state, "Test");
        submitAnswer(state, "p1", "A");
        submitAnswer(state, "p2", "A");
        submitAnswer(state, "p3", "B");
        submitAnswer(state, "p4", "B");
        closeAnswers(state);
        confirmScoring(state);

        expect(state.lastRoundResult!.majorityGroupId).toBeNull();
        expect(state.lastRoundResult!.scoringPlayerIds).toHaveLength(0);
        for (const p of state.players) {
            expect(p.score).toBe(0);
        }
    });

    it("everyone scores when all give same answer", () => {
        const state = initGame(makePlayers(3), "host1");
        startRound(state, "Test");
        submitAnswer(state, "p1", "Same");
        submitAnswer(state, "p2", "same");
        submitAnswer(state, "p3", "SAME");
        closeAnswers(state);
        confirmScoring(state);

        expect(state.lastRoundResult!.majorityGroupId).toBeTruthy();
        expect(state.lastRoundResult!.scoringPlayerIds).toHaveLength(3);
        for (const p of state.players) {
            expect(p.score).toBe(1);
        }
    });

    it("players who did not answer do not score", () => {
        const state = initGame(makePlayers(4), "host1");
        startRound(state, "Test");
        submitAnswer(state, "p1", "X");
        submitAnswer(state, "p2", "X");
        submitAnswer(state, "p3", "X");
        closeAnswers(state);
        confirmScoring(state);

        expect(state.players.find((p) => p.id === "p4")!.score).toBe(0);
        expect(state.lastRoundResult!.scoringPlayerIds).not.toContain("p4");
    });
});

describe("pink cow", () => {
    it("assigns cow to sole outlier when enabled", () => {
        const state = initGame(makePlayers(4), "host1", {
            pinkCowEnabled: true,
        });
        startRound(state, "Test");
        submitAnswer(state, "p1", "A");
        submitAnswer(state, "p2", "A");
        submitAnswer(state, "p3", "A");
        submitAnswer(state, "p4", "B");
        closeAnswers(state);
        confirmScoring(state);

        expect(state.pinkCowHolder).toBe("p4");
        expect(state.players.find((p) => p.id === "p4")!.hasPinkCow).toBe(
            true,
        );
    });

    it("does not assign cow when multiple outliers", () => {
        const state = initGame(makePlayers(5), "host1", {
            pinkCowEnabled: true,
        });
        startRound(state, "Test");
        submitAnswer(state, "p1", "A");
        submitAnswer(state, "p2", "A");
        submitAnswer(state, "p3", "A");
        submitAnswer(state, "p4", "B");
        submitAnswer(state, "p5", "C");
        closeAnswers(state);
        confirmScoring(state);

        expect(state.lastRoundResult!.pinkCowPlayerId).toBeNull();
    });

    it("transfers cow to new sole outlier", () => {
        const state = initGame(makePlayers(4), "host1", {
            pinkCowEnabled: true,
        });

        startRound(state, "Round 1");
        submitAnswer(state, "p1", "A");
        submitAnswer(state, "p2", "A");
        submitAnswer(state, "p3", "A");
        submitAnswer(state, "p4", "B");
        closeAnswers(state);
        confirmScoring(state);
        expect(state.pinkCowHolder).toBe("p4");

        nextRound(state);
        startRound(state, "Round 2");
        submitAnswer(state, "p1", "X");
        submitAnswer(state, "p2", "Y");
        submitAnswer(state, "p3", "Y");
        submitAnswer(state, "p4", "Y");
        closeAnswers(state);
        confirmScoring(state);

        expect(state.pinkCowHolder).toBe("p1");
        expect(state.players.find((p) => p.id === "p1")!.hasPinkCow).toBe(
            true,
        );
        expect(state.players.find((p) => p.id === "p4")!.hasPinkCow).toBe(
            false,
        );
    });

    it("cow blocks winning", () => {
        const state = initGame(makePlayers(3), "host1", {
            pinkCowEnabled: true,
            winScore: 2,
        });

        startRound(state, "R1");
        submitAnswer(state, "p1", "A");
        submitAnswer(state, "p2", "A");
        submitAnswer(state, "p3", "B");
        closeAnswers(state);
        confirmScoring(state);
        expect(state.pinkCowHolder).toBe("p3");

        nextRound(state);
        startRound(state, "R2");
        submitAnswer(state, "p1", "A");
        submitAnswer(state, "p2", "A");
        submitAnswer(state, "p3", "B");
        closeAnswers(state);
        const result = confirmScoring(state);

        expect(state.players.find((p) => p.id === "p1")!.score).toBe(2);
        expect(state.players.find((p) => p.id === "p2")!.score).toBe(2);
        expect(result.type).toBe("game_over");
        if (result.type === "game_over") {
            expect(result.winnerId).not.toBe("p3");
        }
    });

    it("does not assign cow when disabled", () => {
        const state = initGame(makePlayers(4), "host1", {
            pinkCowEnabled: false,
        });
        startRound(state, "Test");
        submitAnswer(state, "p1", "A");
        submitAnswer(state, "p2", "A");
        submitAnswer(state, "p3", "A");
        submitAnswer(state, "p4", "B");
        closeAnswers(state);
        confirmScoring(state);

        expect(state.pinkCowHolder).toBeNull();
        expect(state.players.find((p) => p.id === "p4")!.hasPinkCow).toBe(
            false,
        );
    });
});

describe("win condition", () => {
    it("first to win score wins", () => {
        const state = initGame(makePlayers(3), "host1", { winScore: 1 });

        startRound(state, "Test");
        submitAnswer(state, "p1", "A");
        submitAnswer(state, "p2", "A");
        submitAnswer(state, "p3", "B");
        closeAnswers(state);

        const result = confirmScoring(state);
        expect(result.type).toBe("game_over");
        expect(state.phase).toBe("game_over");
        expect(state.winnerId).toBeTruthy();
    });
});

describe("removePlayer", () => {
    it("removes player and cleans up", () => {
        const state = initGame(makePlayers(4), "host1");
        startRound(state, "Test");
        submitAnswer(state, "p1", "A");

        removePlayer(state, "p1");

        expect(state.players).toHaveLength(3);
        expect(state.answers.p1).toBeUndefined();
    });

    it("ends game if too few players remain", () => {
        const state = initGame(makePlayers(2), "host1");
        const result = removePlayer(state, "p1");

        expect(result).not.toBeNull();
        expect(result!.type).toBe("game_over");
        expect(state.phase).toBe("game_over");
    });

    it("clears cow when cow holder is removed", () => {
        const state = initGame(makePlayers(4), "host1", {
            pinkCowEnabled: true,
        });
        state.pinkCowHolder = "p1";
        state.players[0].hasPinkCow = true;

        removePlayer(state, "p1");
        expect(state.pinkCowHolder).toBeNull();
    });

    it("removes player from answer groups during reveal", () => {
        const state = initGame(makePlayers(4), "host1");
        startRound(state, "Test");
        submitAnswer(state, "p1", "A");
        submitAnswer(state, "p2", "A");
        submitAnswer(state, "p3", "B");
        submitAnswer(state, "p4", "B");
        closeAnswers(state);

        removePlayer(state, "p1");

        const groupWithP1 = state.answerGroups.find((g) =>
            g.playerIds.includes("p1"),
        );
        expect(groupWithP1).toBeUndefined();
    });
});

describe("endGameByHost", () => {
    it("ends game with highest scorer", () => {
        const state = initGame(makePlayers(3), "host1");
        state.players[0].score = 5;
        state.players[1].score = 3;
        state.players[2].score = 1;

        const result = endGameByHost(state);
        expect(result.type).toBe("game_over");
        expect(state.winnerId).toBe("p1");
    });

    it("prefers non-cow holder when pink cow enabled", () => {
        const state = initGame(makePlayers(3), "host1", {
            pinkCowEnabled: true,
        });
        state.players[0].score = 5;
        state.players[0].hasPinkCow = true;
        state.players[1].score = 3;
        state.players[2].score = 1;

        const result = endGameByHost(state);
        expect(result.type).toBe("game_over");
        expect(state.winnerId).toBe("p2");
    });
});

describe("error handling", () => {
    it("rejects non-host actions", () => {
        const state = initGame(makePlayers(3), "host1");
        const result = processAction(state, {
            type: "next_question",
            hostId: "p1",
        });
        expect(result.type).toBe("error");
    });

    it("rejects actions in wrong phase", () => {
        const state = initGame(makePlayers(3), "host1");
        const result = processAction(state, {
            type: "close_answers",
            hostId: "host1",
        });
        expect(result.type).toBe("error");
    });

    it("rejects empty answers", () => {
        const state = initGame(makePlayers(3), "host1");
        startRound(state, "Test");
        const result = submitAnswer(state, "p1", "   ");
        expect(result.type).toBe("error");
    });

    it("rejects answers from non-players", () => {
        const state = initGame(makePlayers(3), "host1");
        startRound(state, "Test");
        const result = submitAnswer(state, "unknown", "A");
        expect(result.type).toBe("error");
    });
});
