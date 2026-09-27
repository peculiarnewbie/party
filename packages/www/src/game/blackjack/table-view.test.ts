import { expect, it } from "vitest";
import { Schema } from "effect";
import { initGame, processAction } from "./engine";
import { getBlackjackTableView, blackjackTableViewSchema } from "./table-view";

it("keeps the dealer hole card and shoe private until the dealer reveals", () => {
    const state = initGame([{ id: "a", name: "Alice" }]);
    state.shoe = [
        { suit: "heart", rank: 10 },
        { suit: "club", rank: 7 },
        { suit: "diamond", rank: 8 },
        { suit: "spade", rank: 9 },
    ];
    processAction(state, { type: "place_bet", playerId: "a", amount: 50 });
    const hidden = getBlackjackTableView(state);
    expect(hidden.dealer.cards).toHaveLength(2);
    expect(hidden.dealer.cards[1]).toBe("hidden");
    expect(hidden.dealer.value).toBeNull();
    expect(hidden).not.toHaveProperty("shoe");
    expect(hidden).not.toHaveProperty("myId");
    expect(hidden).not.toHaveProperty("canHit");
    expect(Schema.is(blackjackTableViewSchema)(hidden)).toBe(true);
    processAction(state, { type: "stand", playerId: "a" });
    const revealed = getBlackjackTableView(state);
    expect(revealed.dealer.cards).toEqual(state.dealerHand);
    expect(revealed.dealer.value).not.toBeNull();
});
