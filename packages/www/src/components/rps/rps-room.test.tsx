import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { RpsRoom } from "./rps-room";
import { createFakeGameConnection } from "~/test/fake-game-connection";
import type {
    RpsClientOutgoing,
    RpsSideEvent,
} from "~/game/rps/connection";
import {
    makeMatch,
    makePlayerInfo,
    makeRound,
    makeView,
} from "~/game/rps/test-helpers";
import type { RpsPlayerView } from "~/game/rps";

function renderRoom(
    options: {
        view?: RpsPlayerView;
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

    const connection = createFakeGameConnection<
        RpsPlayerView,
        RpsClientOutgoing,
        RpsSideEvent
    >({ initialView: view });

    const result = render(() => (
        <RpsRoom
            roomId="room1"
            playerId={playerId}
            isHost={isHost}
            connection={connection}
            onEndGame={onEndGame}
            onReturnToLobby={onReturnToLobby}
        />
    ));

    return { ...result, connection, onEndGame, onReturnToLobby };
}

describe("RpsRoom", () => {
    it("renders the RPS TOURNAMENT header and round label", () => {
        const view = makeView({
            currentRound: 1,
            totalRounds: 1,
        });
        const { getByText, getAllByText } = renderRoom({ view });

        expect(getByText("RPS TOURNAMENT")).toBeInTheDocument();
        expect(getAllByText("FINAL").length).toBeGreaterThan(0);
    });

    it("shows ROCK/PAPER/SCISSORS buttons when I need to throw", () => {
        const view = makeView({
            phase: "throwing",
            needsToThrow: true,
            myMatch: makeMatch({ myChoice: null, status: "active" }),
        });
        const { getByRole } = renderRoom({ view });

        expect(getByRole("button", { name: /^rock$/i })).toBeInTheDocument();
        expect(getByRole("button", { name: /^paper$/i })).toBeInTheDocument();
        expect(
            getByRole("button", { name: /^scissors$/i }),
        ).toBeInTheDocument();
    });

    it("sends rps:throw with the chosen choice when a button is clicked", () => {
        const view = makeView({
            phase: "throwing",
            needsToThrow: true,
            myMatch: makeMatch({ myChoice: null, status: "active" }),
        });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /^rock$/i }));

        expect(connection.sentMessages).toEqual([
            {
                type: "rps:throw",
                data: { choice: "rock" },
            },
        ]);
    });

    it("sends rps:next_round when host clicks NEXT ROUND on round_results", () => {
        const view = makeView({
            phase: "round_results",
            rounds: [
                makeRound({
                    roundNumber: 1,
                    label: "FINAL",
                    matches: [
                        makeMatch({
                            status: "complete",
                            winnerId: "p1",
                            player1Wins: 2,
                            player2Wins: 1,
                        }),
                    ],
                }),
            ],
            myMatch: makeMatch({
                status: "complete",
                winnerId: "p1",
                player1Wins: 2,
                player2Wins: 1,
            }),
        });
        const { getByRole, connection } = renderRoom({ view, isHost: true });

        fireEvent.click(getByRole("button", { name: /next round/i }));
        expect(connection.sentMessages).toEqual([
            {
                type: "rps:next_round",
                data: {},
            },
        ]);
    });

    it("shows END button only for host", () => {
        const guest = renderRoom({ isHost: false });
        expect(guest.queryByRole("button", { name: /^end$/i })).toBeNull();

        const host = renderRoom({ isHost: true });
        fireEvent.click(host.getByRole("button", { name: /^end$/i }));
        expect(host.onEndGame).toHaveBeenCalledTimes(1);
    });

    it("renders TOURNAMENT CHAMPION and RETURN TO LOBBY on tournament_over for host", () => {
        const view = makeView({
            phase: "tournament_over",
            winnerId: "p2",
            players: [
                makePlayerInfo({ id: "p1", name: "Alice", eliminated: true }),
                makePlayerInfo({ id: "p2", name: "Bob", eliminated: false }),
            ],
        });
        const { getByText, getByRole, onReturnToLobby } = renderRoom({
            view,
            isHost: true,
        });

        expect(getByText("TOURNAMENT CHAMPION")).toBeInTheDocument();
        expect(getByText("BOB")).toBeInTheDocument();
        fireEvent.click(getByRole("button", { name: /return to lobby/i }));
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it("updates the UI when a new rps:state message arrives", () => {
        const { getAllByText, connection } = renderRoom({
            view: makeView({
                currentRound: 1,
                totalRounds: 1,
                rounds: [makeRound({ label: "FINAL" })],
            }),
        });
        expect(getAllByText("FINAL").length).toBeGreaterThan(0);

        connection.setView(
            makeView({
                currentRound: 1,
                totalRounds: 2,
                rounds: [makeRound({ label: "SEMIFINAL" })],
            }),
        );
        expect(getAllByText("SEMIFINAL").length).toBeGreaterThan(0);
    });

    it("renders BYE screen when the player has a bye this round", () => {
        const view = makeView({
            phase: "throwing",
            myMatch: null,
            needsToThrow: false,
            rounds: [
                makeRound({
                    byePlayer: makePlayerInfo({ id: "p1", name: "Alice" }),
                    matches: [],
                }),
            ],
        });
        const { getAllByText } = renderRoom({ view });
        expect(getAllByText("BYE").length).toBeGreaterThan(0);
    });

    it("renders ELIMINATED screen when the player has been eliminated", () => {
        const view = makeView({
            phase: "throwing",
            myMatch: null,
            needsToThrow: false,
            players: [
                makePlayerInfo({ id: "p1", name: "Alice", eliminated: true }),
                makePlayerInfo({ id: "p2", name: "Bob" }),
            ],
            rounds: [makeRound({ matches: [] })],
        });
        const { getByText } = renderRoom({ view });
        expect(getByText("ELIMINATED")).toBeInTheDocument();
    });
});
