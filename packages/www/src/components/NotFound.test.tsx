import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { NotFound } from "./NotFound";

vi.mock("@tanstack/solid-router", () => ({
    Link: (props: any) => (
        <a href={props.to} class={props.class}>
            {props.children}
        </a>
    ),
}));

describe("NotFound", () => {
    let backSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    });

    afterEach(() => {
        backSpy.mockRestore();
    });

    it("renders default not-found message and navigation buttons", () => {
        const { getByText, getByRole } = render(() => <NotFound />);
        expect(
            getByText(/The page you are looking for does not exist/i),
        ).toBeInTheDocument();
        expect(getByRole("button", { name: /go back/i })).toBeInTheDocument();
    });

    it("renders custom children when provided", () => {
        const { getByText } = render(() => (
            <NotFound>
                <p>Custom not-found message</p>
            </NotFound>
        ));
        expect(getByText("Custom not-found message")).toBeInTheDocument();
    });

    it("invokes window.history.back when Go Back is clicked", () => {
        const { getByRole } = render(() => <NotFound />);
        fireEvent.click(getByRole("button", { name: /go back/i }));
        expect(backSpy).toHaveBeenCalledTimes(1);
    });
});
