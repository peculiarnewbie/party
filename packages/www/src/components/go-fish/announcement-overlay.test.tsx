import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { AnnouncementOverlay } from "./announcement-overlay";

describe("AnnouncementOverlay", () => {
    it("renders nothing when text is null", () => {
        const { container } = render(() => <AnnouncementOverlay text={null} />);
        expect(container.textContent).toBe("");
    });

    it("shows the announcement text when provided", () => {
        const { getByText } = render(() => (
            <AnnouncementOverlay text="GO FISH!" variant="go_fish" />
        ));
        expect(getByText("GO FISH!")).toBeInTheDocument();
    });

    it("becomes visible reactively when text transitions from null to a value", () => {
        const [text, setText] = createSignal<string | null>(null);
        const { container, getByText } = render(() => (
            <AnnouncementOverlay text={text()} />
        ));
        expect(container.textContent).toBe("");

        setText("Nice catch!");
        expect(getByText("Nice catch!")).toBeInTheDocument();
    });
});
