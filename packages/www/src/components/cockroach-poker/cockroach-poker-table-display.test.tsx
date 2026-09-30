import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { initGame, processAction } from "~/game/cockroach-poker/engine";
import { getCockroachPokerTableView } from "~/game/cockroach-poker/table-view";
import { CockroachPokerTableDisplay } from "./cockroach-poker-table-display";

const state = () =>
    initGame(
        ["Alice", "Bob", "Carol"].map((name, index) => ({
            id: `p${index}`,
            name,
        })),
        (cards) => cards,
    );

describe("Cockroach Poker shared display", () => {
    it("shows the claim and pass status without private controls or the peeked creature", () => {
        const game = state();
        processAction(game, {
            type: "offer_card",
            playerId: "p0",
            targetId: "p1",
            cardIndex: 0,
            claim: "fly",
        });
        processAction(game, { type: "peek_card", playerId: "p1" });
        const { getByText, queryByText, queryByRole, container } = render(
            () => (
                <CockroachPokerTableDisplay
                    view={getCockroachPokerTableView(game)}
                />
            ),
        );
        expect(getByText("Fly")).toBeInTheDocument();
        expect(queryByText(/Bob has peeked/)).toBeNull();
        expect(container).not.toHaveTextContent("Bat");
        expect(queryByRole("button")).toBeNull();
    });

    it("shows the reveal and marks collections close to four matching creatures", () => {
        const game = state();
        game.players[0].faceUpCards = ["bat", "bat"];
        processAction(game, {
            type: "offer_card",
            playerId: "p0",
            targetId: "p1",
            cardIndex: 0,
            claim: "bat",
        });
        processAction(game, { type: "call_true", playerId: "p1" });
        const { getByRole, getByLabelText } = render(() => (
            <CockroachPokerTableDisplay
                view={getCockroachPokerTableView(game)}
            />
        ));
        expect(getByRole("status")).toHaveAccessibleName(
            "It was a Bat. Bob called true and was right. Alice takes the card.",
        );
        expect(getByRole("img", { name: "Correct call" })).toBeInTheDocument();
        expect(getByLabelText("Bat 3/4")).toHaveClass("border-tomato");
    });
});
