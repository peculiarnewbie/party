import { describe, it, expect, vi } from "vitest";
import { fireEvent } from "@solidjs/testing-library";
import { CheeseThiefRoom } from "./cheese-thief-room";
import { renderWithWs } from "~/test/render-with-ws";
import {
    makePlayerInfo,
    makeView,
    makeVoteResult,
} from "~/game/cheese-thief/test-helpers";
import type { CheeseThiefPlayerView } from "~/game/cheese-thief/views";

type CheeseEnvelope =
    | { type: "cheese_thief:state"; data: CheeseThiefPlayerView }
    | { type: "cheese_thief:action"; data: Record<string, unknown> };

function renderRoom(
    options: {
        view?: CheeseThiefPlayerView;
        playerId?: string | null;
        isHost?: boolean;
    } = {},
) {
    const {
        view = makeView(),
        playerId = "p1",
        isHost = false,
    } = options;

    const onEndGame = vi.fn();
    const onReturnToLobby = vi.fn();
    const initialMessages: CheeseEnvelope[] = [
        { type: "cheese_thief:state", data: view },
    ];

    const { socket, ...rest } = renderWithWs<CheeseEnvelope>(
        (ws) => (
            <CheeseThiefRoom
                roomId="room1"
                playerId={playerId}
                isHost={isHost}
                ws={ws}
                onEndGame={onEndGame}
                onReturnToLobby={onReturnToLobby}
            />
        ),
        { initialMessages },
    );

    return { ...rest, socket, onEndGame, onReturnToLobby };
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
        const { getByRole, socket } = renderRoom({ view, isHost: true });

        fireEvent.click(getByRole("button", { name: /begin discussion/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "cheese_thief:start_day",
                playerId: "p1",
                playerName: "",
                data: {},
            },
        ]);
    });

    it("sends cheese_thief:start_voting when host clicks START VOTING", () => {
        const view = makeView({ phase: "day", isHost: true });
        const { getByRole, socket } = renderRoom({ view, isHost: true });

        fireEvent.click(getByRole("button", { name: /start voting/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "cheese_thief:start_voting",
                playerId: "p1",
                playerName: "",
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
        const { getByRole, socket } = renderRoom({ view, isHost: false });

        fireEvent.click(getByRole("button", { name: /^bob$/i }));
        fireEvent.click(getByRole("button", { name: /^cast vote$/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "cheese_thief:cast_vote",
                playerId: "p1",
                playerName: "",
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
        const { getByRole, socket } = renderRoom({ view, isHost: true });

        fireEvent.click(getByRole("button", { name: /reveal votes/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "cheese_thief:reveal_votes",
                playerId: "p1",
                playerName: "",
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
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it("updates UI on a new cheese_thief:state message", () => {
        const { getAllByText, socket } = renderRoom({
            view: makeView({ phase: "night", round: 1 }),
        });
        expect(getAllByText(/ROUND 1/i).length).toBeGreaterThan(0);

        socket.emit({
            type: "cheese_thief:state",
            data: makeView({ phase: "night", round: 7 }),
        });
        expect(getAllByText(/ROUND 7/i).length).toBeGreaterThan(0);
    });
});
