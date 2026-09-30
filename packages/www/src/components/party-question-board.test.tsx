import { createSignal, flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { HerdTableDisplay } from "./herd/herd-table-display";
import { FunFactsTableDisplay } from "./fun-facts/fun-facts-table-display";
import {
    initGame as initHerd,
    processAction as herdAction,
} from "~/game/herd/engine";
import { getHerdTableView } from "~/game/herd/table-view";
import {
    initGame as initFunFacts,
    processAction as funFactsAction,
} from "~/game/fun-facts/engine";
import { getFunFactsTableView } from "~/game/fun-facts/table-view";

const players = [
    { id: "host", name: "Host" },
    { id: "alice", name: "Alice" },
    { id: "bob", name: "Bob" },
];

describe("Party question boards", () => {
    it("updates Herd readiness and the public reveal without exposing answers early or adding controls", () => {
        const state = initHerd(players, "host");
        herdAction(state, {
            type: "next_question",
            hostId: "host",
            customQuestion: "Favorite food?",
        });
        const [view, setView] = createSignal(getHerdTableView(state));
        const { getByRole, getByText, queryByText, queryByRole, container } =
            render(() => <HerdTableDisplay view={view()} />);
        expect(getByText("Favorite food?")).toBeInTheDocument();
        const progress = getByRole("progressbar");
        expect(progress).toHaveAttribute("aria-valuenow", "0");
        herdAction(state, {
            type: "submit_answer",
            playerId: "alice",
            answer: "Pizza",
        });
        setView(getHerdTableView(state));
        flush();
        expect(getByRole("progressbar")).toBe(progress);
        expect(progress).toHaveAttribute("aria-valuenow", "1");
        expect(queryByText("Pizza")).toBeNull();
        herdAction(state, { type: "close_answers", hostId: "host" });
        setView(getHerdTableView(state));
        flush();
        expect(getByText("Pizza")).toBeInTheDocument();
        const group = container.querySelector(
            '[data-testid="herd-display-answer-group"]',
        );
        setView(getHerdTableView(state));
        flush();
        expect(
            container.querySelector(
                '[data-testid="herd-display-answer-group"]',
            ),
        ).toBe(group);
        expect(queryByRole("button")).toBeNull();
        expect(queryByRole("textbox")).toBeNull();
    });

    it("shows Fun Facts turns, hidden arrows, and both correct and incorrect reveal results", () => {
        const state = initFunFacts(players, "host");
        funFactsAction(state, {
            type: "next_question",
            hostId: "host",
            customQuestion: "How many?",
        });
        for (const [index, player] of players.entries())
            funFactsAction(state, {
                type: "submit_answer",
                playerId: player.id,
                answer: 9000 + index,
            });
        funFactsAction(state, { type: "close_answers", hostId: "host" });
        const [view, setView] = createSignal(getFunFactsTableView(state));
        const {
            getByLabelText,
            getAllByLabelText,
            getByRole,
            queryByText,
            queryByRole,
            getAllByTestId,
        } = render(() => <FunFactsTableDisplay view={view()} />);
        expect(getByLabelText("Hidden answer")).toHaveTextContent("?");
        expect(getByRole("status")).toHaveTextContent("is placing next");
        expect(queryByText(/900[0-2]/)).toBeNull();
        state.placedArrows = ["host", "bob", "alice"];
        state.currentPlacerIndex = 3;
        state.phase = "reveal";
        state.lastRoundResult = {
            question: "How many?",
            placedOrder: [...state.placedArrows],
            answers: { ...state.answers },
            correctArrows: ["host", "bob"],
            removedArrows: ["alice"],
            pointsEarned: 2,
        };
        state.teamScore = 2;
        state.roundScores = [2];
        setView(getFunFactsTableView(state));
        flush();
        expect(
            getAllByLabelText("Revealed answer").map(
                (node) => node.textContent,
            ),
        ).toEqual(["9000", "9002", "9001"]);
        const arrows = getAllByTestId("fun-facts-display-arrow");
        expect(arrows[0]).toHaveTextContent("In order · +1");
        expect(arrows[2]).toHaveTextContent("Out of order");
        expect(queryByRole("button")).toBeNull();
    });
});
