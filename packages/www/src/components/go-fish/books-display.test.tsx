import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { BooksDisplay } from "./books-display";

describe("BooksDisplay", () => {
    it("renders nothing when books is empty", () => {
        const { container } = render(() => <BooksDisplay books={[]} />);
        expect(container.textContent).toBe("");
    });

    it("renders default label with count", () => {
        const { getByText } = render(() => <BooksDisplay books={[7, 13]} />);
        expect(getByText(/YOUR BOOKS \(2\)/)).toBeInTheDocument();
        expect(getByText("7s")).toBeInTheDocument();
        expect(getByText("Ks")).toBeInTheDocument();
    });

    it("renders a custom label when provided", () => {
        const { getByText } = render(() => (
            <BooksDisplay books={[1]} label="BOB'S BOOKS" />
        ));
        expect(getByText(/BOB'S BOOKS \(1\)/)).toBeInTheDocument();
        expect(getByText("As")).toBeInTheDocument();
    });
});
