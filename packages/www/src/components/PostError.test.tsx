import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { PostErrorComponent } from "./PostError";

describe("PostErrorComponent", () => {
    it("renders the provided error's message", () => {
        const error = new Error("Post not found");
        const { getByText } = render(() => (
            <PostErrorComponent error={error} reset={() => {}} info={{ componentStack: "" }} />
        ));
        expect(getByText("Post not found")).toBeInTheDocument();
    });

    it("renders plain string errors without crashing", () => {
        const { container } = render(() => (
            <PostErrorComponent
                error={new Error("Unable to load post")}
                reset={() => {}}
                info={{ componentStack: "" }}
            />
        ));
        expect(container.textContent).toBeTruthy();
    });
});
