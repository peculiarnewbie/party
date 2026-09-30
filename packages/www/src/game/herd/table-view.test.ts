import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { endGameByHost, initGame, processAction } from "./engine";
import { getHerdTableView, herdTableViewSchema } from "./table-view";

const players = [
    { id: "host", name: "Host" },
    { id: "a", name: "Alice" },
    { id: "b", name: "Bob" },
    { id: "c", name: "Charlie" },
];

describe("Herd Party snapshots", () => {
    it("keeps answers and future questions private, reveals merged groups and scoring, then clears the board", () => {
        const state = initGame(players, "host", { pinkCowEnabled: true });
        processAction(state, {
            type: "next_question",
            hostId: "host",
            customQuestion: "Favorite animal?",
        });
        for (const [playerId, answer] of [
            ["a", "Dog"],
            ["b", "Dogs"],
            ["c", "Cat"],
        ]) {
            processAction(state, { type: "submit_answer", playerId, answer });
        }
        const privateView = getHerdTableView(state);
        expect(privateView.players).toHaveLength(3);
        expect(privateView.players.every((player) => player.hasAnswered)).toBe(
            true,
        );
        expect(privateView.answeredCount).toBe(3);
        expect(privateView.answerGroups).toEqual([]);
        const serialized = JSON.stringify(
            Schema.encodeSync(herdTableViewSchema)(privateView),
        );
        expect(serialized).not.toContain("Dog");
        expect(serialized).not.toContain("shuffledQuestions");
        expect(privateView).not.toHaveProperty("myAnswer");
        processAction(state, { type: "close_answers", hostId: "host" });
        const [first, second] = state.answerGroups;
        processAction(state, {
            type: "merge_groups",
            hostId: "host",
            groupId1: first.id,
            groupId2: second.id,
        });
        expect(
            getHerdTableView(state).answerGroups.map((group) => group.count),
        ).toEqual([2, 1]);
        expect(JSON.stringify(getHerdTableView(state))).not.toContain(
            "originalAnswers",
        );
        processAction(state, { type: "confirm_scoring", hostId: "host" });
        const scored = getHerdTableView(state);
        expect(scored.roundResult?.scoringPlayerIds).toEqual(["a", "b"]);
        expect(scored.pinkCowHolderId).toBe("c");
        processAction(state, { type: "next_round", hostId: "host" });
        expect(getHerdTableView(state)).toMatchObject({
            currentQuestion: null,
            answerGroups: [],
            roundResult: null,
            answeredCount: 0,
        });
    });

    it("keeps unclosed answers private when the host ends the game", () => {
        const state = initGame(players, "host");
        processAction(state, {
            type: "next_question",
            hostId: "host",
            customQuestion: "A question",
        });
        processAction(state, {
            type: "submit_answer",
            playerId: "a",
            answer: "SECRET",
        });
        endGameByHost(state);
        expect(JSON.stringify(getHerdTableView(state))).not.toContain("SECRET");
        expect(getHerdTableView(state).answerGroups).toEqual([]);
    });
});
