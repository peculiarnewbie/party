import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { endGameByHost, initGame, processAction } from "./engine";
import { funFactsTableViewSchema, getFunFactsTableView } from "./table-view";

const players = [
    { id: "host", name: "Host" },
    { id: "a", name: "Alice" },
    { id: "b", name: "Bob" },
];

function answeredGame() {
    const state = initGame(players, "host", { totalRounds: 2 });
    processAction(state, {
        type: "next_question",
        hostId: "host",
        customQuestion: "How many?",
    });
    for (const [index, player] of players.entries())
        processAction(state, {
            type: "submit_answer",
            playerId: player.id,
            answer: 12340 + index,
        });
    return state;
}

describe("Fun Facts Party snapshots", () => {
    it("hides every number until the reveal, shows the ordering and team score, then clears the board", () => {
        const state = answeredGame();
        const answering = getFunFactsTableView(state);
        expect(answering.players.every((player) => player.hasAnswered)).toBe(
            true,
        );
        expect(answering.answeredCount).toBe(3);
        expect(
            JSON.stringify(
                Schema.encodeSync(funFactsTableViewSchema)(answering),
            ),
        ).not.toContain("1234");
        expect(answering).not.toHaveProperty("myAnswer");
        expect(answering).not.toHaveProperty("shuffledQuestions");
        processAction(state, { type: "close_answers", hostId: "host" });
        const placing = getFunFactsTableView(state);
        expect(placing.placedArrows).toHaveLength(1);
        expect(placing.placedArrows[0].answer).toBeNull();
        expect(placing.currentPlacerId).toBe(state.placingOrder[1]);
        expect(JSON.stringify(placing)).not.toContain("1234");
        while (state.phase === "placing") {
            const playerId = state.placingOrder[state.currentPlacerIndex];
            const position = state.placedArrows.filter(
                (id) => state.answers[id] <= state.answers[playerId],
            ).length;
            processAction(state, { type: "place_arrow", playerId, position });
        }
        const revealed = getFunFactsTableView(state);
        expect(revealed.placedArrows.map((arrow) => arrow.answer)).toEqual([
            12340, 12341, 12342,
        ]);
        expect(revealed.roundResult).toMatchObject({
            pointsEarned: 3,
            removedArrows: [],
        });
        expect(revealed.teamScore).toBe(3);
        processAction(state, { type: "next_round", hostId: "host" });
        expect(getFunFactsTableView(state)).toMatchObject({
            currentQuestion: null,
            placedArrows: [],
            placingOrder: [],
            roundResult: null,
        });
    });

    it.each(["answering", "placing"])(
        "keeps numbers private when ended during %s",
        (phase) => {
            const state = answeredGame();
            if (phase === "placing")
                processAction(state, { type: "close_answers", hostId: "host" });
            endGameByHost(state);
            const view = getFunFactsTableView(state);
            expect(view.roundResult).toBeNull();
            expect(JSON.stringify(view)).not.toContain("1234");
        },
    );
});
