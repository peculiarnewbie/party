import { createSignal, flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { CheeseThiefTableDisplay } from "./cheese-thief-table-display";
import { getCheeseThiefTableView } from "~/game/cheese-thief/table-view";
import { initGame, processAction } from "~/game/cheese-thief/engine";

describe("Cheese Thief shared display", () => {
    it("only reveals roles and choices at the end and clears them on the next round", () => {
        const state = initGame(
            Array.from({ length: 8 }, (_, index) => ({
                id: `p${index}`,
                name: `Player ${index}`,
            })),
            "p0",
        );
        const [view, setView] = createSignal(getCheeseThiefTableView(state));
        const {
            getByText,
            queryByText,
            getAllByTestId,
            queryByTestId,
            queryByRole,
        } = render(() => <CheeseThiefTableDisplay view={view()} />);
        expect(getByText("Check your secret role")).toBeInTheDocument();
        expect(queryByText("Thief", { exact: true })).toBeNull();
        expect(queryByTestId("cheese-thief-result-player")).toBeNull();
        processAction(state, { type: "start_day", hostId: "p0" });
        processAction(state, { type: "start_voting", hostId: "p0" });
        const innocent = state.players.find(
            (player) => player.id !== state.thiefId,
        )!;
        const voter = state.players.find(
            (player) => player.id !== innocent.id,
        )!;
        processAction(state, {
            type: "cast_vote",
            playerId: voter.id,
            targetId: innocent.id,
        });
        setView(getCheeseThiefTableView(state));
        flush();
        expect(getByText("1 / 8 voted")).toBeInTheDocument();
        expect(queryByText("Thief", { exact: true })).toBeNull();
        processAction(state, { type: "reveal_votes", hostId: "p0" });
        setView(getCheeseThiefTableView(state));
        flush();
        expect(getByText("The thief escapes")).toBeInTheDocument();
        expect(getAllByTestId("cheese-thief-result-player")).toHaveLength(8);
        expect(getByText("Thief", { exact: true })).toBeInTheDocument();
        expect(queryByRole("button")).toBeNull();
        expect(queryByRole("textbox")).toBeNull();
        processAction(state, { type: "next_round", hostId: "p0" });
        setView(getCheeseThiefTableView(state));
        flush();
        expect(queryByText("Thief", { exact: true })).toBeNull();
        expect(queryByTestId("cheese-thief-result-player")).toBeNull();
    });
});
