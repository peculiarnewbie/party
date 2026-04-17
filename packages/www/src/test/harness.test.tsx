import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal, Show } from "solid-js";

describe("component test harness", () => {
    it("renders solid components into happy-dom", () => {
        const { getByText } = render(() => <div>hello world</div>);
        expect(getByText("hello world")).toBeInTheDocument();
    });

    it("reacts to signal updates after user events", async () => {
        function Counter() {
            const [count, setCount] = createSignal(0);
            return (
                <button type="button" onClick={() => setCount((c) => c + 1)}>
                    clicks: {count()}
                </button>
            );
        }

        const { getByRole } = render(() => <Counter />);
        const button = getByRole("button");

        expect(button).toHaveTextContent("clicks: 0");

        fireEvent.click(button);
        fireEvent.click(button);

        expect(button).toHaveTextContent("clicks: 2");
    });

    it("renders conditionally with <Show> and reacts to prop changes", () => {
        function Greeting(props: { name: string | null }) {
            return (
                <Show when={props.name} fallback={<p>anonymous</p>}>
                    {(name) => <p>hi {name()}</p>}
                </Show>
            );
        }

        const [name, setName] = createSignal<string | null>(null);
        const { getByText } = render(() => <Greeting name={name()} />);
        expect(getByText("anonymous")).toBeInTheDocument();

        setName("arif");
        expect(getByText("hi arif")).toBeInTheDocument();
    });
});
