import { flush } from "solid-js";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { SkullRoom } from "./skull-room";
import { createFakeGameConnection } from "~/test/fake-game-connection";
import type {
    SkullClientOutgoing,
    SkullSideEvent,
} from "~/game/skull/connection";
import {
    makeAttempt,
    makePlayerInfo,
    makeView,
} from "~/game/skull/test-helpers";
import type { SkullPlayerView } from "~/game/skull/views";

function renderRoom(
    options: {
        view?: SkullPlayerView;
        playerId?: string | null;
        isHost?: boolean;
        initialLayout?: "controller" | "table";
    } = {},
) {
    const { view = makeView(), playerId = "p1", isHost = false } = options;

    const onEndGame = vi.fn();
    const onReturnToLobby = vi.fn();

    const connection = createFakeGameConnection<
        SkullPlayerView,
        SkullClientOutgoing,
        SkullSideEvent
    >({ initialView: view });

    const result = render(() => (
        <SkullRoom
            roomId="room1"
            initialLayout={options.initialLayout}
            playerId={playerId}
            isHost={isHost}
            connection={connection}
            onEndGame={onEndGame}
            onReturnToLobby={onReturnToLobby}
        />
    ));

    return { ...result, connection, onEndGame, onReturnToLobby };
}

describe("SkullRoom", () => {
    it("renders SKULL header, room id, and round number", () => {
        const view = makeView({ roundNumber: 3 });
        const { getByText } = renderRoom({ view });

        expect(getByText("SKULL")).toBeInTheDocument();
        expect(getByText(/ROOM ROOM1/)).toBeInTheDocument();
        expect(getByText(/ROUND 3/)).toBeInTheDocument();
    });

    it("shows PLACE A DISC phase label for non-host in turn_prep phase", () => {
        const view = makeView({ phase: "turn_prep" });
        const { getAllByText } = renderRoom({ view, isHost: false });

        expect(getAllByText("PLACE A DISC").length).toBeGreaterThan(0);
    });

    it("sends skull:play_disc when player clicks a disc in hand", () => {
        const view = makeView({
            phase: "turn_prep",
            isMyTurn: true,
            canPlayDisc: true,
            myHand: ["flower", "skull"],
        });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: "Play flower" }));
        flush();

        expect(connection.sentMessages).toEqual([
            {
                type: "skull:play_disc",
                data: { disc: "flower" },
            },
        ]);
    });

    it("sends skull:start_challenge with bid value on START CHALLENGE", () => {
        const view = makeView({
            phase: "building",
            isMyTurn: true,
            canPlayDisc: true,
            canStartChallenge: true,
            minBid: 1,
            maxBid: 5,
            myHand: ["flower"],
        });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /start challenge/i }));
        flush();

        expect(connection.sentMessages).toEqual([
            {
                type: "skull:start_challenge",
                data: { bid: 1 },
            },
        ]);
    });

    it("sends skull:pass_bid when player clicks PASS during auction", () => {
        const view = makeView({
            phase: "auction",
            isMyTurn: true,
            canPlayDisc: false,
            canRaiseBid: true,
            canPassBid: true,
            highestBid: 2,
            highestBidderId: "p2",
            minBid: 3,
            maxBid: 6,
            myHand: [],
        });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /^pass$/i }));
        flush();

        expect(connection.sentMessages).toEqual([
            {
                type: "skull:pass_bid",
                data: {},
            },
        ]);
    });

    it("sends skull:flip_disc when challenger clicks FLIP TOP DISC on an opponent", () => {
        const view = makeView({
            phase: "attempt",
            isMyTurn: false,
            canPlayDisc: false,
            attempt: makeAttempt({ challengerId: "p1", target: 2 }),
            selectableFlipOwnerIds: ["p2"],
            players: [
                makePlayerInfo({
                    id: "p1",
                    name: "Alice",
                    matCount: 1,
                    faceDownCount: 1,
                }),
                makePlayerInfo({
                    id: "p2",
                    name: "Bob",
                    matCount: 1,
                    faceDownCount: 1,
                }),
            ],
            myHand: [],
        });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /flip top disc/i }));
        flush();

        expect(connection.sentMessages).toEqual([
            {
                type: "skull:flip_disc",
                data: { ownerId: "p2" },
            },
        ]);
    });

    it("shows END button only for host", () => {
        const guest = renderRoom({ isHost: false });
        expect(guest.queryByRole("button", { name: /^end$/i })).toBeNull();

        const host = renderRoom({ isHost: true });
        fireEvent.click(host.getByRole("button", { name: /^end$/i }));
        flush();
        expect(host.onEndGame).toHaveBeenCalledTimes(1);
    });

    it("renders GAME OVER panel with RETURN TO LOBBY button", () => {
        const view = makeView({
            phase: "game_over",
            winnerId: "p2",
            players: [
                makePlayerInfo({ id: "p1", name: "Alice" }),
                makePlayerInfo({
                    id: "p2",
                    name: "Bob",
                    successfulChallenges: 2,
                }),
            ],
        });
        const { getAllByText, getByRole, onReturnToLobby } = renderRoom({
            view,
            isHost: true,
        });

        expect(getAllByText("GAME OVER").length).toBeGreaterThan(0);
        fireEvent.click(getByRole("button", { name: /return to lobby/i }));
        flush();
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it("reactively updates phase label on connection view change", () => {
        const { getByText, getAllByText, connection } = renderRoom({
            view: makeView({ phase: "turn_prep" }),
        });
        expect(getAllByText("PLACE A DISC").length).toBeGreaterThan(0);

        connection.setView(makeView({ phase: "auction", highestBid: 2 }));
        flush();

        expect(getAllByText("BIDDING").length).toBeGreaterThan(0);
    });
    it("keeps private discs available while waiting without enabling a play", () => {
        const { getByRole, getAllByRole } = renderRoom({
            initialLayout: "controller",
            view: makeView({
                currentPlayerId: "p2",
                isMyTurn: false,
                canPlayDisc: false,
            }),
        });
        expect(getByRole("button", { name: "Play skull" })).toBeDisabled();
        for (const button of getAllByRole("button", { name: "Play flower" }))
            expect(button).toBeDisabled();
    });

    it("lets the penalty chooser lose a disc without exposing an opponent's disc type", () => {
        const { getByRole, connection } = renderRoom({
            initialLayout: "controller",
            view: makeView({
                phase: "penalty",
                canPlayDisc: false,
                penaltyPlayerId: "p2",
                penaltyChooserId: "p1",
                needsDiscardChoice: true,
                discardableDiscIndices: [0, 1],
            }),
        });
        fireEvent.click(getByRole("button", { name: "Lose disc 2" }));
        flush();
        expect(connection.sentMessages).toEqual([
            { type: "skull:discard_lost_disc", data: { discIndex: 1 } },
        ]);
    });

    it("allows an eliminated chooser to select the next starter", () => {
        const { getByRole, connection } = renderRoom({
            view: makeView({
                phase: "next_starter",
                canPlayDisc: false,
                canChooseNextStarter: true,
                pendingNextStarterChooserId: "p1",
                nextStarterOptions: ["p2"],
                players: [
                    makePlayerInfo({
                        id: "p1",
                        name: "Alice",
                        eliminated: true,
                    }),
                    makePlayerInfo({ id: "p2", name: "Bob" }),
                ],
            }),
        });
        fireEvent.click(getByRole("button", { name: "Bob" }));
        flush();
        expect(connection.sentMessages).toEqual([
            { type: "skull:choose_next_starter", data: { playerId: "p2" } },
        ]);
    });
    it("shows the actual hand and played discs together during a challenge without a disclosure", () => {
        const { getByRole, getByLabelText, connection } = renderRoom({
            initialLayout: "controller",
            view: makeView({
                phase: "building",
                myHand: ["flower", "skull"],
                myMat: ["flower", "flower"],
            }),
        });
        expect(
            getByRole("group", { name: "Your hand" }).querySelectorAll("svg"),
        ).toHaveLength(2);
        expect(
            getByRole("group", { name: "Your played discs" }).querySelectorAll(
                "svg",
            ),
        ).toHaveLength(2);
        expect(getByRole("button", { name: "Play skull" })).toBeVisible();
        expect(
            getByLabelText("Your played discs").closest("details"),
        ).toBeNull();
        connection.setView(
            makeView({
                phase: "attempt",
                canPlayDisc: false,
                myHand: ["flower", "skull"],
                myMat: ["flower", "flower"],
                attempt: makeAttempt(),
            }),
        );
        flush();
        expect(
            getByRole("group", { name: "Your hand" }).querySelectorAll("svg"),
        ).toHaveLength(2);
        expect(
            getByRole("group", { name: "Your played discs" }).querySelectorAll(
                "svg",
            ),
        ).toHaveLength(2);
        expect(getByRole("button", { name: "Play skull" })).toBeDisabled();
    });
});
