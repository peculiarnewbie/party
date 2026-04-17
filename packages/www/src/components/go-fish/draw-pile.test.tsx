import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { DrawPile } from "./draw-pile";

describe("DrawPile", () => {
    it("renders the remaining card count", () => {
        const { getByText } = render(() => (
            <DrawPile count={12} showDrawButton={false} onDraw={() => {}} />
        ));
        expect(getByText("12 LEFT")).toBeInTheDocument();
        expect(getByText("DRAW PILE")).toBeInTheDocument();
    });

    it("shows EMPTY state when count is 0", () => {
        const { getByText } = render(() => (
            <DrawPile count={0} showDrawButton={false} onDraw={() => {}} />
        ));
        expect(getByText("EMPTY")).toBeInTheDocument();
        expect(getByText("0 LEFT")).toBeInTheDocument();
    });

    it("fires onDraw when Go Fish! is clicked", () => {
        const onDraw = vi.fn();
        const { getByRole } = render(() => (
            <DrawPile count={5} showDrawButton={true} onDraw={onDraw} />
        ));
        fireEvent.click(getByRole("button", { name: /go fish/i }));
        expect(onDraw).toHaveBeenCalledTimes(1);
    });

    it("hides the draw button when showDrawButton is false", () => {
        const { queryByRole } = render(() => (
            <DrawPile count={5} showDrawButton={false} onDraw={() => {}} />
        ));
        expect(queryByRole("button", { name: /go fish/i })).toBeNull();
    });
});
