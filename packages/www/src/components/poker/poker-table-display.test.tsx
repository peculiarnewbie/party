import { createSignal, flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { expect, it } from "vitest";
import { makeView } from "~/game/poker/test-helpers";
import { PokerTableDisplay } from "./poker-table-display";

it("announces every split and side pot without mistaking tournament leaders for hand winners", () => {
    const [view, setView] = createSignal(
        makeView({
            street: "hand_over",
            winnerIds: null,
            eventLog: [
                {
                    id: 3,
                    type: "pot_awarded",
                    street: "showdown",
                    amount: 100,
                    message: "Bob won 100 chips with Two Pair",
                },
                {
                    id: 2,
                    type: "pot_awarded",
                    street: "showdown",
                    amount: 300,
                    message: "Alice & Cara won 300 chips with Straight",
                },
            ],
        }),
    );
    const { getByTestId, queryByTestId } = render(() => (
        <PokerTableDisplay view={view()} title="Texas Hold’em" />
    ));
    expect(getByTestId("poker-hand-winners")).toHaveTextContent(
        /Alice & Cara (wins|split) 300\s*Straight/,
    );
    expect(getByTestId("poker-hand-winners")).toHaveTextContent(
        /Bob wins 100\s*Two Pair/,
    );
    setView(makeView({ handNumber: 2 }));
    flush();
    expect(queryByTestId("poker-hand-winners")).toBeNull();
});

it("announces an uncontested winner without showing private cards", () => {
    const { getByTestId, container } = render(() => (
        <PokerTableDisplay
            title="Backwards Poker"
            view={makeView({
                street: "hand_over",
                eventLog: [
                    {
                        id: 1,
                        type: "pot_awarded",
                        street: "preflop",
                        amount: 30,
                        message: "Alice won 30 chips uncontested",
                    },
                ],
            })}
        />
    ));
    expect(getByTestId("poker-hand-winners")).toHaveTextContent(
        /Alice wins 30\s*Everyone else folded/,
    );
    expect(
        container.querySelectorAll('[data-visible-card-count="2"]'),
    ).toHaveLength(0);
});
