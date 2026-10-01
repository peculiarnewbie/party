import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { BooksDisplay } from "./books-display";
import { SUITS } from "~/assets/card-deck/types";

describe("BooksDisplay", () => {
    it("renders nothing when books is empty", () => {
        const { container } = render(() => <BooksDisplay books={[]} />);
        expect(container.textContent).toBe("");
    });

    it("renders the default count and all four suits in each illustrated book", () => {
        const { getByText, getByRole } = render(() => (
            <BooksDisplay books={[7, 13]} />
        ));
        expect(getByText(/YOUR BOOKS \(2\)/)).toBeInTheDocument();
        for (const rank of ["7", "K"])
            for (const suit of SUITS)
                expect(
                    getByRole("img", { name: `${rank} of ${suit}s` }),
                ).toBeInTheDocument();
    });

    it("renders a custom label when provided", () => {
        const { getByText, getByRole } = render(() => (
            <BooksDisplay books={[1]} label="BOB'S BOOKS" />
        ));
        expect(getByText(/BOB'S BOOKS \(1\)/)).toBeInTheDocument();
        for (const suit of SUITS)
            expect(
                getByRole("img", { name: `A of ${suit}s` }),
            ).toBeInTheDocument();
    });
});
