import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { PlayerHand } from "./player-hand";
import type { Card } from "~/assets/card-deck/types";

const sampleHand: Card[] = [
    { rank: 7, suit: "heart" },
    { rank: 7, suit: "spade" },
    { rank: 10, suit: "diamond" },
];

describe("PlayerHand", () => {
    it("renders hand count and each rank group", () => {
        const { getByText } = render(() => (
            <PlayerHand
                cards={sampleHand}
                selectedRank={null}
                onSelectRank={() => {}}
                disabled={false}
            />
        ));
        expect(getByText(/YOUR HAND \(3\)/)).toBeInTheDocument();
        expect(getByText("x2")).toBeInTheDocument();
    });

    it("fires onSelectRank with the rank number when a group is clicked", () => {
        const onSelectRank = vi.fn();
        const { getAllByRole } = render(() => (
            <PlayerHand
                cards={sampleHand}
                selectedRank={null}
                onSelectRank={onSelectRank}
                disabled={false}
            />
        ));
        const buttons = getAllByRole("button");
        fireEvent.click(buttons[0]!);
        expect(onSelectRank).toHaveBeenCalledTimes(1);
        expect(onSelectRank).toHaveBeenCalledWith(7);
    });

    it("does not fire onSelectRank when disabled", () => {
        const onSelectRank = vi.fn();
        const { getAllByRole } = render(() => (
            <PlayerHand
                cards={sampleHand}
                selectedRank={null}
                onSelectRank={onSelectRank}
                disabled={true}
            />
        ));
        const buttons = getAllByRole("button");
        fireEvent.click(buttons[0]!);
        expect(onSelectRank).not.toHaveBeenCalled();
        expect(buttons[0]).toBeDisabled();
    });
});
