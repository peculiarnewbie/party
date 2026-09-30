import { createSignal, flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { expect, it } from "vitest";
import { SixNimmtBoard } from "./six-nimmt-board";
import { advance, initGame, lockCard } from "~/game/six-nimmt/engine";
import { getTableView } from "~/game/six-nimmt/views";

it("reveals cards within the existing player list and clears them for the next turn", () => {
    let state = initGame(
        [
            { id: "a", name: "Alice" },
            { id: "b", name: "Bob" },
        ],
        Array.from({ length: 104 }, (_, i) => i + 1),
    );
    const [view, setView] = createSignal(getTableView(state));
    const screen = render(() => <SixNimmtBoard view={view()} />);
    const alice = screen.getByTestId("six-nimmt-player-a");
    const bob = screen.getByTestId("six-nimmt-player-b");
    const sync = () => {
        setView(getTableView(state));
        flush();
    };
    expect(screen.queryAllByTestId("six-nimmt-revealed-card")).toHaveLength(0);
    state = lockCard(state, "a", 5).state!;
    sync();
    expect(alice).toHaveAttribute("data-state", "ready");
    expect(screen.queryAllByTestId("six-nimmt-revealed-card")).toHaveLength(0);
    state = lockCard(state, "b", 15).state!;
    sync();
    expect(screen.getByTestId("six-nimmt-player-a")).toBe(alice);
    expect(
        alice.querySelector('[data-testid="six-nimmt-revealed-card"]'),
    ).toHaveTextContent("5");
    expect(
        bob.querySelector('[data-testid="six-nimmt-revealed-card"]'),
    ).toHaveTextContent("15");
    expect(screen.getAllByText("Alice")).toHaveLength(1);
    expect(screen.getAllByText("Bob")).toHaveLength(1);
    expect(screen.queryByTestId("six-nimmt-revealed")).toBeNull();
    state = advance(state);
    sync();
    expect(alice).toHaveAttribute("data-state", "placed");
    expect(alice).toHaveAttribute(
        "aria-label",
        "Alice, 0 points, card 5 played in row 4",
    );
    expect(bob).toHaveAttribute("data-state", "revealed");
    state = advance(advance(state));
    sync();
    expect(screen.queryAllByTestId("six-nimmt-revealed-card")).toHaveLength(0);
    expect(alice).toHaveAttribute("data-state", "waiting");
});
