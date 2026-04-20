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

function renderRoom(
    options: {
        view?: PokerPlayerView;
        isHost?: boolean;
        playerId?: string | null;
        title?: string;
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
            onEndGame={onEndGame}
            onReturnToLobby={onReturnToLobby}
        />
    ));

    return { ...result, connection, onEndGame, onReturnToLobby };
}

describe("PokerRoom", () => {
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
        const { getByText } = renderRoom({ view });

        expect(getByText("HAND 3")).toBeInTheDocument();
        expect(getByText("FLOP")).toBeInTheDocument();
        expect(getByText("YOUR TURN")).toBeInTheDocument();
        expect(getByText("MAIN POT")).toBeInTheDocument();
        expect(getByText("40")).toBeInTheDocument();
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
        const { getByText, connection } = renderRoom({ view: initialView });
        expect(getByText("HAND 1")).toBeInTheDocument();

        connection.setView(makeView({ handNumber: 2, street: "turn" }));

        expect(getByText("HAND 2")).toBeInTheDocument();
        expect(getByText("TURN")).toBeInTheDocument();
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

        expect(
            getByText(/Invalid action: you must call first/i),
        ).toBeInTheDocument();
    });

    it("shows END GAME button for host only, and fires onEndGame when clicked", () => {
        const guest = renderRoom({ isHost: false });
        expect(
            guest.queryByRole("button", { name: /end game/i }),
        ).toBeNull();

        const host = renderRoom({ isHost: true });
        fireEvent.click(host.getByRole("button", { name: /end game/i }));
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
                makeEvent({ id: 1, type: "hand_started", message: "Hand 1 started" }),
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
