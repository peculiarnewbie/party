import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { OpponentZone } from "./opponent-zone";

describe("OpponentZone", () => {
    it("renders name, card count, and books", () => {
        const { getByText } = render(() => (
            <OpponentZone
                id="p2"
                name="Bob"
                cardCount={4}
                books={[7, 13]}
                isCurrentTurn={false}
                selectable={false}
                selected={false}
                onSelect={() => {}}
            />
        ));
        expect(getByText("Bob")).toBeInTheDocument();
        expect(getByText("4")).toBeInTheDocument();
        expect(getByText(/BOOKS: 7, K/)).toBeInTheDocument();
    });

    it("shows NO CARDS when card count is zero", () => {
        const { getByText } = render(() => (
            <OpponentZone
                id="p2"
                name="Bob"
                cardCount={0}
                books={[]}
                isCurrentTurn={false}
                selectable={false}
                selected={false}
                onSelect={() => {}}
            />
        ));
        expect(getByText("NO CARDS")).toBeInTheDocument();
    });

    it("calls onSelect with its id when selectable and clicked", () => {
        const onSelect = vi.fn();
        const { getByRole } = render(() => (
            <OpponentZone
                id="p2"
                name="Bob"
                cardCount={2}
                books={[]}
                isCurrentTurn={false}
                selectable={true}
                selected={false}
                onSelect={onSelect}
            />
        ));
        fireEvent.click(getByRole("button"));
        expect(onSelect).toHaveBeenCalledWith("p2");
    });

    it("is disabled and does not fire onSelect when not selectable", () => {
        const onSelect = vi.fn();
        const { getByRole } = render(() => (
            <OpponentZone
                id="p2"
                name="Bob"
                cardCount={2}
                books={[]}
                isCurrentTurn={false}
                selectable={false}
                selected={false}
                onSelect={onSelect}
            />
        ));
        const button = getByRole("button");
        expect(button).toBeDisabled();
        fireEvent.click(button);
        expect(onSelect).not.toHaveBeenCalled();
    });
});
