import { flush } from "solid-js";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { PokerRoom } from "./poker-room";
import { createFakeGameConnection } from "~/test/fake-game-connection";
import type {
    PokerClientOutgoing,
    PokerSideEvent,
} from "~/game/poker/connection";
import {
    makeEvent,
    makePot,
    makeSeat,
    makeView,
    SAMPLE_BOARD,
    SAMPLE_CARDS,
} from "~/game/poker/test-helpers";
import type { PokerPlayerView } from "~/game/poker";
import { getPokerFixture } from "~/game/poker/fixtures";
import type { PokerVisibilityMode } from "~/game/poker/views";

function renderRoom(
    options: {
        view?: PokerPlayerView;
        isHost?: boolean;
        playerId?: string | null;
        title?: string;
        initialLayout?: "table" | "controller";
        visibilityMode?: PokerVisibilityMode;
    } = {},
) {
    const {
        view = makeView(),
        isHost = false,
        playerId = "p1",
        title = "Texas Hold'em",
    } = options;

    const onEndGame = vi.fn();
    const onReturnToLobby = vi.fn();

    const connection = createFakeGameConnection<
        PokerPlayerView,
        PokerClientOutgoing,
        PokerSideEvent
    >({ initialView: view });

    const result = render(() => (
        <PokerRoom
            roomId="room1"
            playerId={playerId}
            isHost={isHost}
            connection={connection}
            title={title}
            initialLayout={options.initialLayout}
            visibilityMode={options.visibilityMode}
            onEndGame={onEndGame}
            onReturnToLobby={onReturnToLobby}
        />
    ));

    return { ...result, connection, onEndGame, onReturnToLobby };
}

describe("PokerRoom", () => {
    it("shows opponents' hands in backwards phone mode and preserves the split when toggling layouts", () => {
        const view = getPokerFixture("backwards-visible-opponents").view;
        const { getByTestId, queryByTestId } = renderRoom({
            view,
            visibilityMode: "backwards",
            initialLayout: "controller",
        });
        expect(queryByTestId("poker-hero-hand")).toBeNull();
        expect(queryByTestId("poker-opponent-hand-p1")).toBeNull();
        for (const player of view.players.filter(
            (player) => player.id !== "p1",
        )) {
            expect(
                getByTestId(`poker-opponent-hand-${player.id}`),
            ).toHaveAttribute("data-visible-card-count", "2");
        }
        expect(getByTestId("poker-action-controls")).toBeInTheDocument();
        fireEvent.click(getByTestId("poker-layout-toggle"));
        flush();
        expect(queryByTestId("poker-opponent-hands")).toBeNull();
        expect(getByTestId("poker-seat-p2")).toHaveAttribute(
            "data-visible-card-count",
            "2",
        );
        fireEvent.click(getByTestId("poker-layout-toggle"));
        flush();
        expect(getByTestId("poker-opponent-hands")).toHaveTextContent(
            "Your cards are hidden",
        );
    });

    it("keeps backwards spectators in a public view without the opponents' hand grid", () => {
        const { getByTestId, queryByTestId } = renderRoom({
            view: makeView({ isSpectator: true, myStatus: "spectator" }),
            visibilityMode: "backwards",
            initialLayout: "controller",
        });
        expect(queryByTestId("poker-opponent-hands")).toBeNull();
        expect(getByTestId("poker-hero-hand")).toHaveTextContent("Spectating");
        expect(queryByTestId("poker-fold-button")).toBeNull();
    });

    it("keeps cards and actions in phone mode and can show the full table", () => {
        const { getByTestId, queryByTestId, connection } = renderRoom({
            initialLayout: "controller",
            view: makeView({
                players: [
                    makeSeat({ id: "p1" }),
                    makeSeat({ id: "p2", name: "Bob" }),
                ],
                myHoleCards: SAMPLE_CARDS,
                myHoleCardCount: 2,
                actingPlayerId: "p1",
                legalActions: ["fold", "call"],
                callAmount: 20,
            }),
        });
        expect(getByTestId("poker-room")).toHaveAttribute(
            "data-layout",
            "controller",
        );
        expect(getByTestId("poker-hero-hand")).toBeInTheDocument();
        expect(getByTestId("poker-controller-context")).toHaveTextContent(
            "To call 20",
        );
        expect(queryByTestId("poker-seat-p2")).toBeNull();
        fireEvent.click(getByTestId("poker-check-call-button"));
        flush();
        expect(connection.sentMessages).toContainEqual({
            type: "poker:act",
            data: { type: "call" },
        });
        fireEvent.click(getByTestId("poker-layout-toggle"));
        flush();
        expect(getByTestId("poker-seat-p2")).toBeInTheDocument();
        expect(queryByTestId("poker-controller-context")).toBeNull();
    });

    it("renders the initial poker state from the connection view", () => {
        const view = makeView({
            handNumber: 3,
            street: "flop",
            board: SAMPLE_BOARD,
            players: [
                makeSeat({ id: "p1", name: "Alice", isActing: true }),
                makeSeat({ id: "p2", name: "Bob" }),
            ],
            actingPlayerId: "p1",
            myHoleCards: SAMPLE_CARDS,
            myHoleCardCount: 2,
            myStack: 980,
            pots: [makePot({ amount: 40, eligiblePlayerIds: ["p1", "p2"] })],
        });
        const { getByText, getByTestId } = renderRoom({ view });

        expect(getByText("HAND 3")).toBeInTheDocument();
        expect(getByTestId("poker-street").textContent).toBe("FLOP");
        expect(getByText("YOUR TURN")).toBeInTheDocument();
        expect(getByTestId("poker-pot-total")).toHaveTextContent("Pot 40");
    });

    it("shows opponent's turn when it is not your turn", () => {
        const view = makeView({
            players: [
                makeSeat({ id: "p1", name: "Alice" }),
                makeSeat({ id: "p2", name: "Bob", isActing: true }),
            ],
            actingPlayerId: "p2",
        });
        const { getByText, queryByText } = renderRoom({
            view,
            playerId: "p1",
        });

        expect(getByText(/BOB'S TURN/i)).toBeInTheDocument();
        expect(queryByText("YOUR TURN")).toBeNull();
    });

    it("sends a poker:act fold message when the seated player clicks Fold on their turn", () => {
        const view = makeView({
            players: [
                makeSeat({ id: "p1", name: "Alice", isActing: true }),
                makeSeat({ id: "p2", name: "Bob" }),
            ],
            actingPlayerId: "p1",
            legalActions: ["fold", "call"],
            callAmount: 20,
        });
        const { getByRole, connection } = renderRoom({ view, playerId: "p1" });

        fireEvent.click(getByRole("button", { name: /fold/i }));
        flush();

        expect(connection.sentMessages).toEqual([
            {
                type: "poker:act",
                data: { type: "fold" },
            },
        ]);
    });

    it("renders updated state when the connection view changes", () => {
        const initialView = makeView({
            handNumber: 1,
            street: "preflop",
        });
        const { getByText, getByTestId, connection } = renderRoom({
            view: initialView,
        });
        expect(getByText("HAND 1")).toBeInTheDocument();

        connection.setView(makeView({ handNumber: 2, street: "turn" }));
        flush();

        expect(getByText("HAND 2")).toBeInTheDocument();
        expect(getByTestId("poker-street").textContent).toBe("TURN");
    });

    it("displays an action error when a poker:action_result side event has an error", () => {
        const view = makeView({
            players: [makeSeat({ id: "p1", isActing: true })],
            actingPlayerId: "p1",
            legalActions: ["check"],
        });
        const { getByText, connection } = renderRoom({ view, playerId: "p1" });

        connection.emit({
            type: "poker:action_result",
            data: { error: "Invalid action: you must call first" },
        });
        flush();

        expect(
            getByText(/Invalid action: you must call first/i),
        ).toBeInTheDocument();
    });

    it("shows END GAME button for host only, and fires onEndGame when clicked", () => {
        const guest = renderRoom({ isHost: false });
        expect(guest.queryByRole("button", { name: /end game/i })).toBeNull();

        const host = renderRoom({ isHost: true });
        fireEvent.click(host.getByRole("button", { name: /end game/i }));
        flush();
        expect(host.onEndGame).toHaveBeenCalledTimes(1);
    });

    it("shows the ResultsOverlay and Return To Lobby for host when tournament is over", () => {
        const view = makeView({
            street: "tournament_over",
            winnerIds: ["p1"],
            players: [
                makeSeat({ id: "p1", name: "Alice", stack: 3000 }),
                makeSeat({ id: "p2", name: "Bob", status: "busted", stack: 0 }),
            ],
        });
        const { getByText, getByRole, onReturnToLobby } = renderRoom({
            view,
            isHost: true,
        });

        expect(getByText(/TOURNAMENT COMPLETE/i)).toBeInTheDocument();
        expect(getByText("ALICE LEADS")).toBeInTheDocument();

        fireEvent.click(getByRole("button", { name: /return to lobby/i }));
        flush();
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it("does NOT show Return To Lobby button for non-host at game end", () => {
        const view = makeView({
            street: "tournament_over",
            winnerIds: ["p1"],
            players: [makeSeat({ id: "p1", name: "Alice", stack: 3000 })],
            endedByHost: true,
        });
        const { queryByRole } = renderRoom({ view, isHost: false });
        expect(queryByRole("button", { name: /return to lobby/i })).toBeNull();
    });

    it("renders the event log with messages from game state", () => {
        const view = makeView({
            eventLog: [
                makeEvent({
                    id: 1,
                    type: "hand_started",
                    message: "Hand 1 started",
                }),
                makeEvent({
                    id: 2,
                    type: "blinds_posted",
                    message: "Alice posts SB (5)",
                }),
            ],
        });
        const { getByText } = renderRoom({ view });
        expect(getByText("Hand 1 started")).toBeInTheDocument();
        expect(getByText("Alice posts SB (5)")).toBeInTheDocument();
    });
});
