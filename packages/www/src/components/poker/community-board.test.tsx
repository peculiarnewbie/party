import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { CommunityBoard } from "./community-board";
import type { Card } from "~/assets/card-deck/types";

describe("CommunityBoard", () => {
    it("renders 5 empty slots when board is empty", () => {
        const { getAllByText } = render(() => <CommunityBoard board={[]} />);
        expect(getAllByText("WAIT")).toHaveLength(5);
    });

    it("renders a mix of cards and empty slots mid-hand", () => {
        const flop: Card[] = [
            { rank: 1, suit: "spade" },
            { rank: 13, suit: "heart" },
            { rank: 7, suit: "club" },
        ];
        const { getAllByText } = render(() => <CommunityBoard board={flop} />);
        expect(getAllByText("WAIT")).toHaveLength(2);
    });

    it("renders no WAIT placeholders after the river", () => {
        const river: Card[] = [
            { rank: 1, suit: "spade" },
            { rank: 13, suit: "heart" },
            { rank: 7, suit: "club" },
            { rank: 2, suit: "diamond" },
            { rank: 9, suit: "spade" },
        ];
        const { queryAllByText } = render(() => (
            <CommunityBoard board={river} />
        ));
        expect(queryAllByText("WAIT")).toHaveLength(0);
    });
});
