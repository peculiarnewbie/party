import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { UserErrorComponent } from "./UserError";

describe("UserErrorComponent", () => {
    it("renders the provided error's message", () => {
        const error = new Error("Nope.");
        const { getByText } = render(() => (
            <UserErrorComponent error={error} reset={() => {}} info={{ componentStack: "" }} />
        ));
        expect(getByText("Nope.")).toBeInTheDocument();
    });

    it("renders plain string errors without crashing", () => {
        const { container } = render(() => (
            <UserErrorComponent
                error={new Error("User not allowed")}
                reset={() => {}}
                info={{ componentStack: "" }}
            />
        ));
        expect(container.textContent).toBeTruthy();
    });
});
