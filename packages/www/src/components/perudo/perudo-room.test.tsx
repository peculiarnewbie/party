import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { PerudoRoom } from "./perudo-room";
import { createFakeGameConnection } from "~/test/fake-game-connection";
import type {
    PerudoClientOutgoing,
    PerudoSideEvent,
} from "~/game/perudo/connection";
import {
    makeBid,
    makeChallengeResult,
    makePlayerInfo,
    makeView,
} from "~/game/perudo/test-helpers";
import type { PerudoPlayerView } from "~/game/perudo";

function renderRoom(
    options: {
        view?: PerudoPlayerView;
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
        PerudoPlayerView,
        PerudoClientOutgoing,
        PerudoSideEvent
    >({ initialView: view });

    const result = render(() => (
        <PerudoRoom
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

describe("PerudoRoom", () => {
    it("renders round number and dice in play", () => {
        const view = makeView({ roundNumber: 3, totalDiceInPlay: 12 });
        const { getByText } = renderRoom({ view });

        expect(getByText(/ROUND 3/i)).toBeInTheDocument();
        expect(getByText(/12 DICE IN PLAY/i)).toBeInTheDocument();
    });

    it("shows PLACE YOUR BID controls when I can challenge in bidding phase", () => {
        const view = makeView({
            phase: "bidding",
            isMyTurn: false,
            canChallenge: true,
            currentBid: makeBid({ playerId: "p2", quantity: 2, faceValue: 3 }),
        });
        const { getByRole } = renderRoom({ view });

        expect(getByRole("button", { name: /^bid$/i })).toBeInTheDocument();
        expect(
            getByRole("button", { name: /^challenge$/i }),
        ).toBeInTheDocument();
    });

    it("sends perudo:bid with the selected quantity/face on BID click", () => {
        const view = makeView({
            phase: "bidding",
            isMyTurn: false,
            canChallenge: true,
            currentBid: makeBid({ playerId: "p2", quantity: 2, faceValue: 3 }),
            nextHigherBid: { quantity: 3, faceValue: 3 },
        });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /^bid$/i }));

        expect(connection.sentMessages).toEqual([
            {
                type: "perudo:bid",
                data: { quantity: 3, faceValue: 3 },
            },
        ]);
    });

    it("sends perudo:challenge when CHALLENGE is clicked", () => {
        const view = makeView({
            phase: "bidding",
            isMyTurn: false,
            canChallenge: true,
            currentBid: makeBid({ playerId: "p2", quantity: 2, faceValue: 3 }),
        });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /^challenge$/i }));
        expect(connection.sentMessages).toEqual([
            {
                type: "perudo:challenge",
                data: {},
            },
        ]);
    });

    it("sends perudo:start_round when OPEN BIDDING is clicked on round_start", () => {
        const view = makeView({
            phase: "round_start",
            isMyTurn: true,
            currentBid: null,
        });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /open bidding/i }));
        expect(connection.sentMessages).toEqual([
            {
                type: "perudo:start_round",
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

    it("renders the game over screen with winner name, RETURN TO LOBBY for host", () => {
        const view = makeView({
            phase: "game_over",
            winners: ["p2"],
            players: [
                makePlayerInfo({ id: "p1", name: "Alice", diceCount: 0, eliminated: true }),
                makePlayerInfo({ id: "p2", name: "Bob", diceCount: 3 }),
            ],
        });
        const { getByText, getByRole, onReturnToLobby } = renderRoom({
            view,
            isHost: true,
        });

        expect(getByText("GAME OVER")).toBeInTheDocument();
        expect(getByText("WINNER")).toBeInTheDocument();
        fireEvent.click(getByRole("button", { name: /return to lobby/i }));
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it("updates UI when the connection view changes", () => {
        const { getByText, connection } = renderRoom({
            view: makeView({ roundNumber: 1 }),
        });
        expect(getByText(/ROUND 1/i)).toBeInTheDocument();

        connection.setView(makeView({ roundNumber: 5 }));
        expect(getByText(/ROUND 5/i)).toBeInTheDocument();
    });

    it("shows challenge result when a challenge has been made", () => {
        const view = makeView({
            phase: "revealing",
            lastChallengeResult: makeChallengeResult({
                wasCorrect: true,
                actualCount: 4,
                bid: makeBid({ quantity: 5, faceValue: 4 }),
            }),
        });
        const { getByText } = renderRoom({ view });
        expect(getByText(/CHALLENGE RESULT/i)).toBeInTheDocument();
        expect(getByText(/4 4s FOUND/i)).toBeInTheDocument();
    });
});
