import { expect, it } from "vitest";
import { Schema } from "effect";
import { initGame, processAction, finishReveal } from "./engine";
import { getPerudoTableView, perudoTableViewSchema } from "./table-view";

it("hides every player's dice, reveals challenges, then hides the next round", () => {
    const state = initGame(
        [
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ],
        () => 3,
    );
    const hidden = getPerudoTableView(state);
    expect(hidden.players.map((player) => player.dice)).toEqual([null, null]);
    expect(hidden.players.map((player) => player.diceCount)).toEqual([5, 5]);
    expect(hidden).not.toHaveProperty("myId");
    expect(hidden).not.toHaveProperty("nextHigherBid");
    expect(Schema.is(perudoTableViewSchema)(hidden)).toBe(true);
    processAction(state, {
        type: "bid",
        playerId: "a",
        quantity: 2,
        faceValue: 3,
    });
    processAction(state, { type: "challenge", playerId: "b" });
    const revealed = getPerudoTableView(state);
    expect(revealed.phase).toBe("revealing");
    expect(revealed.players.every((player) => player.dice !== null)).toBe(true);
    expect(revealed.lastChallengeResult?.actualCount).toBe(10);
    finishReveal(state, () => 5);
    expect(
        getPerudoTableView(state).players.map((player) => player.dice),
    ).toEqual([null, null]);
});
