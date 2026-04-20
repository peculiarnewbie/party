import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { BlackjackRoom } from "./blackjack-room";
import { createFakeGameConnection } from "~/test/fake-game-connection";
import type {
    BlackjackClientOutgoing,
    BlackjackSideEvent,
} from "~/game/blackjack/connection";
import {
    makeCard,
    makeDealer,
    makeHand,
    makePlayerInfo,
    makeView,
} from "~/game/blackjack/test-helpers";
import type { BlackjackPlayerView } from "~/game/blackjack";

function renderRoom(
    options: {
        view?: BlackjackPlayerView;
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
        BlackjackPlayerView,
        BlackjackClientOutgoing,
        BlackjackSideEvent
    >({ initialView: view });

    const result = render(() => (
        <BlackjackRoom
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

describe("BlackjackRoom", () => {
    it("renders round number, chips, and DEALER area", () => {
        const view = makeView({
            roundNumber: 4,
            players: [makePlayerInfo({ id: "p1", name: "Alice", chips: 850 })],
        });
        const { getByText, getAllByText } = renderRoom({ view });

        expect(getByText(/ROUND 4/i)).toBeInTheDocument();
        expect(getAllByText(/\$850/).length).toBeGreaterThan(0);
        expect(getByText("DEALER")).toBeInTheDocument();
    });

    it("shows PLACE YOUR BET controls when I need to bet", () => {
        const view = makeView({ phase: "betting", needsBet: true });
        const { getByText, getByRole } = renderRoom({ view });

        expect(getByText(/PLACE YOUR BET/i)).toBeInTheDocument();
        expect(getByRole("button", { name: /^deal$/i })).toBeInTheDocument();
    });

    it("sends blackjack:bet with the current bet amount on DEAL click", () => {
        const view = makeView({ phase: "betting", needsBet: true });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /^deal$/i }));

        expect(connection.sentMessages).toEqual([
            {
                type: "blackjack:bet",
                data: { amount: 50 },
            },
        ]);
    });

    it("sends blackjack:hit when HIT is clicked on my turn", () => {
        const view = makeView({
            phase: "playing",
            isMyTurn: true,
            canHit: true,
            canStand: true,
            needsBet: false,
            currentPlayerIndex: 0,
            dealer: makeDealer({
                cards: [makeCard(5, "diamond"), "hidden"],
                value: null,
                upCardValue: 5,
            }),
            players: [
                makePlayerInfo({
                    id: "p1",
                    name: "Alice",
                    hands: [makeHand()],
                    bet: 50,
                }),
            ],
        });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /^hit$/i }));

        expect(connection.sentMessages).toEqual([
            {
                type: "blackjack:hit",
                data: {},
            },
        ]);
    });

    it("sends blackjack:stand when STAND is clicked on my turn", () => {
        const view = makeView({
            phase: "playing",
            isMyTurn: true,
            canHit: true,
            canStand: true,
            needsBet: false,
            dealer: makeDealer({ cards: [makeCard(5), "hidden"], upCardValue: 5 }),
            players: [makePlayerInfo({ id: "p1", hands: [makeHand()] })],
        });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /^stand$/i }));

        expect(connection.sentMessages).toEqual([
            {
                type: "blackjack:stand",
                data: {},
            },
        ]);
    });

    it("sends blackjack:insurance YES on insurance prompt", () => {
        const view = makeView({
            phase: "insurance",
            needsInsurance: true,
            needsBet: false,
            dealer: makeDealer({
                cards: [makeCard(1, "spade"), "hidden"],
                upCardValue: 11,
            }),
            players: [makePlayerInfo({ id: "p1", bet: 50 })],
        });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /^yes$/i }));

        expect(connection.sentMessages).toEqual([
            {
                type: "blackjack:insurance",
                data: { accept: true },
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

    it("updates UI reactively on a new blackjack:state view", () => {
        const { getByText, connection } = renderRoom({
            view: makeView({ roundNumber: 1 }),
        });
        expect(getByText(/ROUND 1/i)).toBeInTheDocument();

        connection.setView(makeView({ roundNumber: 7 }));
        expect(getByText(/ROUND 7/i)).toBeInTheDocument();
    });

    it("renders RETURN TO LOBBY button for host on settled phase", () => {
        const view = makeView({
            phase: "settled",
            needsBet: false,
            results: [
                {
                    playerId: "p1",
                    playerName: "Alice",
                    hands: [
                        {
                            handIndex: 0,
                            bet: 50,
                            payout: 100,
                            outcome: "win",
                        },
                    ],
                    insurancePayout: 0,
                    netChips: 50,
                },
            ],
        });
        const { getByRole, onReturnToLobby } = renderRoom({ view, isHost: true });

        fireEvent.click(getByRole("button", { name: /return to lobby/i }));
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });
});
