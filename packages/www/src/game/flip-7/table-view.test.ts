import { expect, it } from "vitest";
import { Schema } from "effect";
import { initGame } from "./engine";
import { getFlip7TableView, flip7TableViewSchema } from "./table-view";

it("shows face-up cards and scores without sending the deck or player controls", () => {
    const state = initGame(
        [
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ],
        "a",
        {
            deck: [
                { type: "number", value: 12 },
                { type: "number", value: 7 },
                { type: "number", value: 3 },
            ],
            shuffleMode: "none",
        },
    );
    const view = getFlip7TableView(state);
    expect(view.players.every((player) => player.cards.length === 1)).toBe(
        true,
    );
    expect(view.deckCount).toBe(1);
    expect(view).not.toHaveProperty("deck");
    expect(view).not.toHaveProperty("myId");
    expect(view).not.toHaveProperty("canHit");
    expect(view).not.toHaveProperty("validTargetIds");
    expect(Schema.is(flip7TableViewSchema)(view)).toBe(true);
});
