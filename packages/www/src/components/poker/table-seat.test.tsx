import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { TableSeat } from "./table-seat";
import type { PokerPlayerPublicView } from "~/game/poker";

function makeSeat(
    overrides: Partial<PokerPlayerPublicView> = {},
): PokerPlayerPublicView {
    return {
        id: "p1",
        name: "Alice",
        stack: 1000,
        status: "active",
        connected: true,
        committedThisStreet: 0,
        committedThisHand: 0,
        holeCardCount: 2,
        visibleHoleCards: [],
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        isActing: false,
        ...overrides,
    };
}

describe("TableSeat", () => {
    it("renders name, stack, street commitment, and IN status for an active player", () => {
        const { getByText } = render(() => (
            <TableSeat player={makeSeat({ committedThisStreet: 40 })} isMe={false} />
        ));
        expect(getByText("Alice")).toBeInTheDocument();
        expect(getByText("IN")).toBeInTheDocument();
        expect(getByText("1000")).toBeInTheDocument();
        expect(getByText("40")).toBeInTheDocument();
    });

    it("shows FOLDED and ALL-IN status labels based on player state", () => {
        const folded = render(() => (
            <TableSeat
                player={makeSeat({ id: "p1", status: "folded" })}
                isMe={false}
            />
        ));
        expect(folded.getByText("FOLDED")).toBeInTheDocument();

        const allIn = render(() => (
            <TableSeat
                player={makeSeat({ id: "p2", status: "all_in" })}
                isMe={false}
            />
        ));
        expect(allIn.getByText("ALL-IN")).toBeInTheDocument();
    });

    it("shows DISCONNECTED when connected is false for non-all-in players", () => {
        const { getByText } = render(() => (
            <TableSeat
                player={makeSeat({ connected: false, status: "active" })}
                isMe={false}
            />
        ));
        expect(getByText("DISCONNECTED")).toBeInTheDocument();
    });

    it("renders dealer, small blind, and big blind badges", () => {
        const { getByText } = render(() => (
            <TableSeat
                player={makeSeat({
                    isDealer: true,
                    isSmallBlind: true,
                    isBigBlind: true,
                })}
                isMe={false}
            />
        ));
        expect(getByText("D")).toBeInTheDocument();
        expect(getByText("SB")).toBeInTheDocument();
        expect(getByText("BB")).toBeInTheDocument();
    });
});
