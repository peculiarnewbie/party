import { flush } from "solid-js";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { CheeseThiefRoom } from "./cheese-thief-room";
import { createFakeGameConnection } from "~/test/fake-game-connection";
import type {
    CheeseThiefClientOutgoing,
    CheeseThiefSideEvent,
} from "~/game/cheese-thief/connection";
import {
    makePlayerInfo,
    makeView,
    makeVoteResult,
} from "~/game/cheese-thief/test-helpers";
import type { CheeseThiefPlayerView } from "~/game/cheese-thief/views";
import type { PartyLayout } from "~/components/party-layout-controls";

function renderRoom(
    options: {
        view?: CheeseThiefPlayerView;
        playerId?: string | null;
        isHost?: boolean;
        initialLayout?: PartyLayout;
    } = {},
) {
    const { view = makeView(), playerId = "p1", isHost = false } = options;

    const onEndGame = vi.fn();
    const onReturnToLobby = vi.fn();

    const connection = createFakeGameConnection<
        CheeseThiefPlayerView,
        CheeseThiefClientOutgoing,
        CheeseThiefSideEvent
    >({ initialView: view });

    const result = render(() => (
        <CheeseThiefRoom
            roomId="room1"
            playerId={playerId}
            isHost={isHost}
            connection={connection}
            initialLayout={options.initialLayout}
            onEndGame={onEndGame}
            onReturnToLobby={onReturnToLobby}
        />
    ));

    return { ...result, connection, onEndGame, onReturnToLobby };
}

describe("CheeseThiefRoom", () => {
    it("renders CHEESE THIEF header and round number", () => {
        const view = makeView({ round: 4 });
        const { getAllByText } = renderRoom({ view });

        expect(getAllByText(/CHEESE THIEF/i).length).toBeGreaterThan(0);
        expect(getAllByText(/ROUND 4/i).length).toBeGreaterThan(0);
    });

    it("shows WAITING FOR HOST message in night phase for non-host", () => {
        const view = makeView({ phase: "night", isHost: false });
        const { getByText } = renderRoom({ view, isHost: false });

        expect(getByText(/WAITING FOR HOST/i)).toBeInTheDocument();
    });

    it("sends cheese_thief:start_day when host clicks BEGIN DISCUSSION", () => {
        const view = makeView({ phase: "night", isHost: true });
        const { getByRole, connection } = renderRoom({ view, isHost: true });

        fireEvent.click(getByRole("button", { name: /begin discussion/i }));
        flush();

        expect(connection.sentMessages).toEqual([
            {
                type: "cheese_thief:start_day",
                data: {},
            },
        ]);
    });

    it("sends cheese_thief:start_voting when host clicks START VOTING", () => {
        const view = makeView({ phase: "day", isHost: true });
        const { getByRole, connection } = renderRoom({ view, isHost: true });

        fireEvent.click(getByRole("button", { name: /start voting/i }));
        flush();

        expect(connection.sentMessages).toEqual([
            {
                type: "cheese_thief:start_voting",
                data: {},
            },
        ]);
    });

    it("sends cheese_thief:cast_vote with selected target id", () => {
        const view = makeView({
            phase: "voting",
            isHost: false,
            hasVoted: false,
        });
        const { getByRole, connection } = renderRoom({ view, isHost: false });

        fireEvent.click(getByRole("button", { name: /^bob$/i }));
        flush();
        fireEvent.click(getByRole("button", { name: /^cast vote$/i }));
        flush();

        expect(connection.sentMessages).toEqual([
            {
                type: "cheese_thief:cast_vote",
                data: { targetId: "p2" },
            },
        ]);
    });

    it("sends cheese_thief:reveal_votes when host clicks REVEAL VOTES", () => {
        const view = makeView({
            phase: "voting",
            isHost: true,
            votedCount: 3,
            totalVoters: 3,
        });
        const { getByRole, connection } = renderRoom({ view, isHost: true });

        fireEvent.click(getByRole("button", { name: /reveal votes/i }));
        flush();

        expect(connection.sentMessages).toEqual([
            {
                type: "cheese_thief:reveal_votes",
                data: {},
            },
        ]);
    });

    it("shows END button only for host", () => {
        const guest = renderRoom({ isHost: false });
        expect(guest.queryByRole("button", { name: /^end$/i })).toBeNull();

        const host = renderRoom({
            view: makeView({ isHost: true }),
            isHost: true,
        });
        fireEvent.click(host.getByRole("button", { name: /^end$/i }));
        flush();
        expect(host.onEndGame).toHaveBeenCalledTimes(1);
    });

    it("shows LOBBY button for host in reveal phase and calls onReturnToLobby", () => {
        const view = makeView({
            phase: "reveal",
            isHost: true,
            voteResult: makeVoteResult(),
            thiefName: "Bob",
            followerNames: [],
            players: [
                makePlayerInfo({ id: "p1", name: "Alice", score: 1 }),
                makePlayerInfo({ id: "p2", name: "Bob", score: 0 }),
                makePlayerInfo({ id: "p3", name: "Carol", score: 1 }),
            ],
        });
        const { getByRole, onReturnToLobby } = renderRoom({
            view,
            isHost: true,
        });

        fireEvent.click(getByRole("button", { name: /^lobby$/i }));
        flush();
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it("updates UI when the connection view changes", () => {
        const { getAllByText, connection } = renderRoom({
            view: makeView({ phase: "night", round: 1 }),
        });
        expect(getAllByText(/ROUND 1/i).length).toBeGreaterThan(0);

        connection.setView(makeView({ phase: "night", round: 7 }));
        flush();
        expect(getAllByText(/ROUND 7/i).length).toBeGreaterThan(0);
    });
});

it("shows private clues only on request and hides them again when the phase or round changes", () => {
    const view = makeView({
        myRole: "thief",
        observedPlayerNames: ["Secret Witness"],
    });
    const { getByRole, getByText, queryByText, connection } = renderRoom({
        view,
    });
    expect(queryByText(/Secret Witness/)).toBeNull();
    fireEvent.click(getByRole("button", { name: /show my role/i }));
    flush();
    expect(getByText(/Secret Witness/)).toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: /hide my role/i }));
    flush();
    expect(queryByText(/Secret Witness/)).toBeNull();
    fireEvent.click(getByRole("button", { name: /show my role/i }));
    flush();
    connection.setView({ ...view, phase: "day" });
    flush();
    expect(queryByText(/Secret Witness/)).toBeNull();
    fireEvent.click(getByRole("button", { name: /show my role/i }));
    flush();
    connection.setView({ ...view, phase: "day", round: 2 });
    flush();
    expect(queryByText(/Secret Witness/)).toBeNull();
});

it("can change a submitted vote without revealing anyone else's choice", () => {
    const { getByRole, connection } = renderRoom({
        view: makeView({
            phase: "voting",
            myVote: "p2",
            hasVoted: true,
            votedCount: 2,
        }),
    });
    expect(getByRole("button", { name: "Bob" })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    expect(getByRole("button", { name: "CHANGE VOTE" })).toBeDisabled();
    fireEvent.click(getByRole("button", { name: "Carol" }));
    flush();
    fireEvent.click(getByRole("button", { name: "CHANGE VOTE" }));
    flush();
    expect(connection.sentMessages).toEqual([
        { type: "cheese_thief:cast_vote", data: { targetId: "p3" } },
    ]);
});

it("shows server errors and prevents revealing before a vote is cast", () => {
    const { getByRole, connection } = renderRoom({
        view: makeView({ phase: "voting", isHost: true }),
    });
    expect(getByRole("button", { name: "REVEAL VOTES" })).toBeDisabled();
    connection.emit({
        type: "cheese_thief:error",
        data: { message: "Voting is not open" },
    });
    flush();
    expect(getByRole("alert")).toHaveTextContent("Voting is not open");
});

it("keeps Party phone results compact and leaves all votes on the shared screen", () => {
    const { getByText, queryByTestId, getByRole } = renderRoom({
        view: makeView({
            phase: "reveal",
            voteResult: makeVoteResult(),
            isHost: true,
        }),
        initialLayout: "controller",
    });
    expect(
        getByText("Votes and roles are on the big screen."),
    ).toBeInTheDocument();
    expect(queryByTestId("cheese-thief-result-player")).toBeNull();
    expect(getByRole("button", { name: "PLAY AGAIN" })).toBeInTheDocument();
});

it("shows revealed roles and votes without sorting the connection's player array in place", () => {
    const players = [
        makePlayerInfo({ id: "p1", name: "Alice" }),
        makePlayerInfo({ id: "p2", name: "Bob" }),
        makePlayerInfo({ id: "p3", name: "Carol" }),
    ];
    const { getAllByTestId } = renderRoom({
        view: makeView({
            phase: "reveal",
            players,
            voteResult: makeVoteResult(),
        }),
    });
    expect(getAllByTestId("cheese-thief-result-player")[0]).toHaveTextContent(
        "Bob",
    );
    expect(players.map((player) => player.id)).toEqual(["p1", "p2", "p3"]);
});
