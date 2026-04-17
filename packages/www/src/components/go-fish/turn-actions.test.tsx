import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { TurnActions } from "./turn-actions";

describe("TurnActions", () => {
    it("shows waiting message when it is not the player's turn", () => {
        const { getByText } = render(() => (
            <TurnActions
                isMyTurn={false}
                turnPhase="awaiting_ask"
                selectedOpponent={null}
                selectedOpponentName={null}
                selectedRank={null}
                onCancel={() => {}}
                currentPlayerName="Bob"
            />
        ));
        expect(getByText(/WAITING FOR BOB/)).toBeInTheDocument();
    });

    it("prompts to select player and rank when nothing is selected", () => {
        const { getByText } = render(() => (
            <TurnActions
                isMyTurn={true}
                turnPhase="awaiting_ask"
                selectedOpponent={null}
                selectedOpponentName={null}
                selectedRank={null}
                onCancel={() => {}}
                currentPlayerName="Alice"
            />
        ));
        expect(getByText("SELECT A PLAYER AND A RANK")).toBeInTheDocument();
    });

    it("fires onCancel when Clear is clicked after partial selection", () => {
        const onCancel = vi.fn();
        const { getByRole } = render(() => (
            <TurnActions
                isMyTurn={true}
                turnPhase="awaiting_ask"
                selectedOpponent="p2"
                selectedOpponentName="Bob"
                selectedRank={null}
                onCancel={onCancel}
                currentPlayerName="Alice"
            />
        ));
        fireEvent.click(getByRole("button", { name: /clear/i }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("shows GO FISH message when phase is go_fish", () => {
        const { getByText } = render(() => (
            <TurnActions
                isMyTurn={true}
                turnPhase="go_fish"
                selectedOpponent={null}
                selectedOpponentName={null}
                selectedRank={null}
                onCancel={() => {}}
                currentPlayerName="Alice"
            />
        ));
        expect(getByText(/GO FISH! DRAW A CARD/)).toBeInTheDocument();
    });
});
