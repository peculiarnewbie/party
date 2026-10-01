import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { getYahtzeeTableView, yahtzeeTableViewSchema } from "./table-view";
import { makePlayer, makeState } from "./test-helpers";

describe("Yahtzee public table", () => {
    it("shows ten players and public rolls without control flags or private choices", () => {
        const view = getYahtzeeTableView(
            makeState({
                dice: [1, 2, 3, 4, 5],
                held: [true, false, false, false, false],
                phase: "mid_turn",
                players: Array.from({ length: 10 }, (_, index) =>
                    makePlayer({ id: `p${index}`, name: `Player ${index}` }),
                ),
            }),
        );
        expect(Schema.decodeUnknownSync(yahtzeeTableViewSchema)(view)).toEqual(
            view,
        );
        expect(view?.dice).toEqual([1, 2, 3, 4, 5]);
        expect(view?.held[0]).toBe(true);
        expect(view?.players).toHaveLength(10);
        expect(JSON.stringify(view)).not.toMatch(
            /"(?:myId|canRoll|canScore|potentialScores|pendingClaim|lastTurnReveal)"/,
        );
    });
    it("never projects Lying Yahtzee's private rolls", () => {
        expect(
            getYahtzeeTableView(
                makeState({
                    mode: "lying",
                    dice: [6, 6, 6, 6, 6],
                    phase: "mid_turn",
                }),
            ),
        ).toBeNull();
    });
});
