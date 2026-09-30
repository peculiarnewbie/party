import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { initGame, processAction } from "./engine";
import {
    cheeseThiefTableViewSchema,
    getCheeseThiefTableView,
} from "./table-view";

function setup() {
    return initGame(
        Array.from({ length: 8 }, (_, index) => ({
            id: `p${index}`,
            name: `Player ${index}`,
        })),
        "p0",
    );
}

describe("Cheese Thief Party snapshots", () => {
    it("keeps all roles, dice, observations and vote choices off the display until the reveal", () => {
        const state = setup();
        const assertPrivate = () => {
            const view = Schema.decodeUnknownSync(cheeseThiefTableViewSchema)(
                getCheeseThiefTableView(state),
            );
            expect(view.result).toBeNull();
            expect(Object.keys(view).sort()).toEqual([
                "phase",
                "players",
                "result",
                "round",
                "totalVoters",
                "votedCount",
            ]);
            for (const player of view.players)
                expect(Object.keys(player).sort()).toEqual([
                    "id",
                    "name",
                    "score",
                ]);
        };
        assertPrivate();
        processAction(state, { type: "start_day", hostId: "p0" });
        assertPrivate();
        processAction(state, { type: "start_voting", hostId: "p0" });
        for (const player of state.players)
            processAction(state, {
                type: "cast_vote",
                playerId: player.id,
                targetId:
                    player.id === state.thiefId
                        ? state.players.find((p) => p.id !== state.thiefId)!.id
                        : state.thiefId,
            });
        assertPrivate();
        expect(getCheeseThiefTableView(state).votedCount).toBe(8);
        processAction(state, { type: "reveal_votes", hostId: "p0" });
        const revealed = getCheeseThiefTableView(state);
        expect(revealed.result).toEqual(state.voteResult);
        expect(revealed.result?.thiefCaught).toBe(true);
        expect(
            revealed.players.find((player) => player.id === state.thiefId)
                ?.score,
        ).toBe(0);
        expect(revealed.result?.voteCounts[state.thiefId]).toBe(7);
        revealed.result!.followerIds.push("extra");
        Object.assign(revealed.result!.votes, { p0: "extra" });
        expect(state.voteResult?.followerIds).not.toContain("extra");
        expect(state.voteResult?.votes.p0).not.toBe("extra");
        processAction(state, { type: "next_round", hostId: "p0" });
        assertPrivate();
        expect(getCheeseThiefTableView(state)).toMatchObject({
            round: 2,
            phase: "night",
            votedCount: 0,
        });
    });

    it("rejects an empty reveal without scoring or exposing anyone's role", () => {
        const state = setup();
        processAction(state, { type: "start_day", hostId: "p0" });
        processAction(state, { type: "start_voting", hostId: "p0" });
        const before = structuredClone(state);
        expect(
            processAction(state, { type: "reveal_votes", hostId: "p0" }).type,
        ).toBe("error");
        expect(state).toEqual(before);
        expect(getCheeseThiefTableView(state).result).toBeNull();
    });
});
