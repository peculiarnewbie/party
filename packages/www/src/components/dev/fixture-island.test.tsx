import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";

const navigateMock = vi.fn();

vi.mock("@tanstack/solid-router", () => ({
    useNavigate: () => navigateMock,
    Link: (props: { to: string; children: unknown; class?: string }) =>
        // biome-ignore lint/a11y/useValidAnchor: test shim
        <a href={props.to} class={props.class}>{props.children as any}</a>,
}));

import { FixtureIsland } from "./fixture-island";
import type { GameFixtureModule } from "~/game/fixture-module";

function makeModule(): GameFixtureModule<"alpha" | "beta" | "gamma"> {
    return {
        game: "poker",
        title: "Poker",
        fixtures: {
            alpha: {
                id: "alpha",
                description: "Alpha state",
                primaryPlayerId: "p1",
            },
            beta: {
                id: "beta",
                description: "Beta state",
                primaryPlayerId: "p2",
            },
            gamma: {
                id: "gamma",
                description: "Gamma state",
                primaryPlayerId: "p1",
            },
        },
        defaultFixtureId: "alpha",
        playerIds: ["p1", "p2", "p3"],
        Harness: () => null,
    };
}

describe("FixtureIsland", () => {
    beforeEach(() => {
        navigateMock.mockClear();
    });

    it("renders the current fixture and player in collapsed state", () => {
        const { getByText } = render(() => (
            <FixtureIsland
                fixtureModule={makeModule() as unknown as GameFixtureModule}
                fixtureId="alpha"
                playerId="p1"
            />
        ));

        expect(getByText("alpha")).toBeInTheDocument();
        expect(getByText("as p1")).toBeInTheDocument();
    });

    it("expands on hover to show fixture and player chips", () => {
        const { getByTestId, queryByTestId } = render(() => (
            <FixtureIsland
                fixtureModule={makeModule() as unknown as GameFixtureModule}
                fixtureId="alpha"
                playerId="p1"
            />
        ));

        const island = getByTestId("fixture-island");
        expect(queryByTestId("fixture-chip-beta")).toBeNull();

        fireEvent.mouseEnter(island);

        expect(getByTestId("fixture-chip-alpha")).toBeInTheDocument();
        expect(getByTestId("fixture-chip-beta")).toBeInTheDocument();
        expect(getByTestId("player-chip-p1")).toBeInTheDocument();
        expect(getByTestId("player-chip-p3")).toBeInTheDocument();
    });

    it("navigates to the selected fixture with its primary player", () => {
        const { getByTestId } = render(() => (
            <FixtureIsland
                fixtureModule={makeModule() as unknown as GameFixtureModule}
                fixtureId="alpha"
                playerId="p1"
            />
        ));

        fireEvent.mouseEnter(getByTestId("fixture-island"));
        fireEvent.click(getByTestId("fixture-chip-beta"));

        expect(navigateMock).toHaveBeenCalledWith({
            to: "/dev/$game",
            params: { game: "poker" },
            search: { fixture: "beta", playerId: "p2" },
        });
    });

    it("navigates to a different player perspective without changing fixture", () => {
        const { getByTestId } = render(() => (
            <FixtureIsland
                fixtureModule={makeModule() as unknown as GameFixtureModule}
                fixtureId="alpha"
                playerId="p1"
            />
        ));

        fireEvent.mouseEnter(getByTestId("fixture-island"));
        fireEvent.click(getByTestId("player-chip-p3"));

        expect(navigateMock).toHaveBeenCalledWith({
            to: "/dev/$game",
            params: { game: "poker" },
            search: { fixture: "alpha", playerId: "p3" },
        });
    });

    it("cycles fixtures with [ and ] keys", () => {
        const { getByTestId } = render(() => (
            <FixtureIsland
                fixtureModule={makeModule() as unknown as GameFixtureModule}
                fixtureId="alpha"
                playerId="p1"
            />
        ));
        void getByTestId("fixture-island");

        fireEvent.keyDown(window, { key: "]" });
        expect(navigateMock).toHaveBeenLastCalledWith({
            to: "/dev/$game",
            params: { game: "poker" },
            search: { fixture: "beta", playerId: "p2" },
        });

        fireEvent.keyDown(window, { key: "[" });
        expect(navigateMock).toHaveBeenLastCalledWith({
            to: "/dev/$game",
            params: { game: "poker" },
            search: { fixture: "gamma", playerId: "p1" },
        });
    });

    it("cycles players with , and . keys", () => {
        const { getByTestId } = render(() => (
            <FixtureIsland
                fixtureModule={makeModule() as unknown as GameFixtureModule}
                fixtureId="alpha"
                playerId="p1"
            />
        ));
        void getByTestId("fixture-island");

        fireEvent.keyDown(window, { key: "." });
        expect(navigateMock).toHaveBeenLastCalledWith({
            to: "/dev/$game",
            params: { game: "poker" },
            search: { fixture: "alpha", playerId: "p2" },
        });
    });
});
