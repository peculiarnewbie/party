import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { calculateScoring, initGame, processAction } from "./engine";
import { herdStateSchema } from "./schemas";
import { getPlayerView } from "./views";

function reveal(answers: string[], winScore = 8) {
    const state = initGame(
        answers.map((_, index) => ({
            id: `p${index}`,
            name: `Player ${index}`,
        })),
        "host",
        { winScore },
    );
    processAction(state, {
        type: "next_question",
        hostId: "host",
        customQuestion: "Name an undercover dog",
    });
    answers.forEach((answer, index) =>
        processAction(state, {
            type: "submit_answer",
            playerId: `p${index}`,
            answer,
        }),
    );
    processAction(state, { type: "close_answers", hostId: "host" });
    return state;
}

describe("Herd discussion", () => {
    it("preserves 39 answers through combining, separation, persistence, and exactly-once scoring on the next round", () => {
        let state = reveal(
            Array.from({ length: 39 }, (_, index) =>
                index < 15
                    ? "secret dog"
                    : index < 29
                      ? "dog spy"
                      : "cat detective",
            ),
        );
        const answers = { ...state.answers };
        const [dog, spy] = state.answerGroups;
        processAction(state, {
            type: "merge_groups",
            hostId: "host",
            groupId1: dog.id,
            groupId2: spy.id,
        });
        const view = getPlayerView(state, "host");
        expect(view.answerGroups[0].answers).toEqual([
            { answer: "secret dog", count: 15 },
            { answer: "dog spy", count: 14 },
        ]);
        expect(view.previewRoundResult?.scoringPlayerIds).toHaveLength(29);
        expect(state.players.every((player) => player.score === 0)).toBe(true);
        expect(state.lastRoundResult).toBeNull();
        state = Schema.decodeUnknownSync(herdStateSchema)(
            structuredClone(state),
        );
        expect(
            processAction(state, {
                type: "separate_answer",
                hostId: "host",
                groupId: dog.id,
                answer: "dog spy",
            }).type,
        ).toBe("answer_separated");
        expect(
            state.answerGroups.map((group) => group.playerIds.length),
        ).toEqual([15, 14, 10]);
        expect(state.answers).toEqual(answers);
        expect(calculateScoring(state).scoringPlayerIds).toHaveLength(15);
        const restoredSpy = state.answerGroups.find(
            (group) => group.canonicalAnswer === "dog spy",
        )!;
        processAction(state, {
            type: "merge_groups",
            hostId: "host",
            groupId1: dog.id,
            groupId2: restoredSpy.id,
        });
        expect(
            processAction(state, { type: "confirm_scoring", hostId: "host" })
                .type,
        ).toBe("error");
        expect(state.players.every((player) => player.score === 0)).toBe(true);
        expect(
            processAction(state, { type: "next_round", hostId: "host" }).type,
        ).toBe("round_advanced");
        expect(
            state.players.filter((player) => player.score === 1),
        ).toHaveLength(29);
        expect(state.phase).toBe("waiting");
        expect(state.lastRoundResult?.groups[0].originalAnswers).toEqual(
            Object.fromEntries(Object.entries(answers).slice(0, 29)),
        );
        expect(
            processAction(state, { type: "next_round", hostId: "host" }).type,
        ).toBe("error");
        expect(
            state.players.filter((player) => player.score === 1),
        ).toHaveLength(29);
    });

    it("separates one original answer from a larger combination without losing or duplicating players", () => {
        const state = reveal([
            "secret dog",
            "Secret Dog",
            "dog spy",
            "undercover pup",
        ]);
        const [dog, spy, pup] = state.answerGroups;
        processAction(state, {
            type: "merge_groups",
            hostId: "host",
            groupId1: dog.id,
            groupId2: spy.id,
        });
        processAction(state, {
            type: "merge_groups",
            hostId: "host",
            groupId1: dog.id,
            groupId2: pup.id,
        });
        processAction(state, {
            type: "separate_answer",
            hostId: "host",
            groupId: dog.id,
            answer: "secret dog",
        });
        expect(
            state.answerGroups.flatMap((group) => group.playerIds).sort(),
        ).toEqual(["p0", "p1", "p2", "p3"]);
        expect(
            getPlayerView(state, "host").answerGroups.map(
                (group) => group.answers,
            ),
        ).toContainEqual([
            { answer: "dog spy", count: 1 },
            { answer: "undercover pup", count: 1 },
        ]);
        expect(state.answers).toEqual({
            p0: "secret dog",
            p1: "Secret Dog",
            p2: "dog spy",
            p3: "undercover pup",
        });
        expect(state.phase).toBe("reveal");
    });

    it("keeps winners and cow changes provisional until the discussion ends", () => {
        const state = reveal(["dog", "dog", "cat"], 1);
        state.pinkCowEnabled = true;
        expect(
            getPlayerView(state, "host").previewRoundResult?.pinkCowPlayerId,
        ).toBe("p2");
        expect(state.pinkCowHolder).toBeNull();
        expect(state.winnerId).toBeNull();
        expect(state.phase).toBe("reveal");
        expect(
            processAction(state, { type: "next_round", hostId: "host" }).type,
        ).toBe("game_over");
        expect(state.pinkCowHolder).toBe("p2");
        expect(state.winnerId).toBe("p0");
        expect(state.players[0].score).toBe(1);
    });

    it("rejects unauthorized, missing, and unsplittable answers without mutations", () => {
        const state = reveal(["dog", "dog", "cat"]);
        const before = structuredClone(state);
        for (const action of [
            {
                type: "separate_answer",
                hostId: "p0",
                groupId: "g0",
                answer: "dog",
            },
            {
                type: "separate_answer",
                hostId: "host",
                groupId: "missing",
                answer: "dog",
            },
            {
                type: "separate_answer",
                hostId: "host",
                groupId: "g0",
                answer: "dog",
            },
            {
                type: "separate_answer",
                hostId: "host",
                groupId: "g0",
                answer: "absent",
            },
        ] as const)
            expect(processAction(state, action).type).toBe("error");
        expect(state).toEqual(before);
        processAction(state, { type: "next_round", hostId: "host" });
        expect(
            processAction(state, {
                type: "separate_answer",
                hostId: "host",
                groupId: "g0",
                answer: "dog",
            }).type,
        ).toBe("error");
    });
});
