import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";

const mockInvalidate = vi.fn();
const mockIsRoot = vi.fn(() => false);

vi.mock("@tanstack/solid-router", async () => {
    const actual = await vi.importActual<object>("@tanstack/solid-router");
    return {
        ...actual,
        useRouter: () => ({ invalidate: mockInvalidate }),
        useMatch: () => mockIsRoot,
        rootRouteId: "__root__",
        Link: (props: any) => (
            <a
                href={props.to}
                class={props.class}
                onClick={(e) => {
                    if (props.onClick) props.onClick(e);
                }}
            >
                {props.children}
            </a>
        ),
    };
});

import { DefaultCatchBoundary } from "./DefaultCatchBoundary";

describe("DefaultCatchBoundary", () => {
    let backSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        mockInvalidate.mockClear();
        mockIsRoot.mockReturnValue(false);
        backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
        consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
    });

    afterEach(() => {
        backSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it("renders the error's message and a Try Again button", () => {
        const error = new Error("Boom");
        const { getByText, getByRole } = render(() => (
            <DefaultCatchBoundary error={error} reset={() => {}} info={{ componentStack: "" }} />
        ));
        expect(getByText("Boom")).toBeInTheDocument();
        expect(getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("calls router.invalidate when Try Again is clicked", () => {
        const { getByRole } = render(() => (
            <DefaultCatchBoundary
                error={new Error("x")}
                reset={() => {}}
                info={{ componentStack: "" }}
            />
        ));
        fireEvent.click(getByRole("button", { name: /try again/i }));
        expect(mockInvalidate).toHaveBeenCalledTimes(1);
    });

    it("shows Go Back (not Home) for non-root routes, triggering history.back", () => {
        mockIsRoot.mockReturnValue(false);
        const { getByText, queryByText } = render(() => (
            <DefaultCatchBoundary
                error={new Error("x")}
                reset={() => {}}
                info={{ componentStack: "" }}
            />
        ));
        expect(getByText(/go back/i)).toBeInTheDocument();
        expect(queryByText(/^home$/i)).toBeNull();
        fireEvent.click(getByText(/go back/i));
        expect(backSpy).toHaveBeenCalledTimes(1);
    });

    it("shows Home (not Go Back) at the root route", () => {
        mockIsRoot.mockReturnValue(true);
        const { getByText, queryByText } = render(() => (
            <DefaultCatchBoundary
                error={new Error("x")}
                reset={() => {}}
                info={{ componentStack: "" }}
            />
        ));
        expect(getByText(/^home$/i)).toBeInTheDocument();
        expect(queryByText(/go back/i)).toBeNull();
    });
});
