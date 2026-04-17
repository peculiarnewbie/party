import { describe, it, expect, vi } from "vitest";
import { fireEvent } from "@solidjs/testing-library";
import { PokerRoom } from "./poker-room";
import { renderWithWs } from "~/test/render-with-ws";
import {
    makeEvent,
    makePot,
    makeSeat,
    makeView,
    SAMPLE_BOARD,
    SAMPLE_CARDS,
} from "~/game/poker/test-helpers";
import type { PokerPlayerView } from "~/game/poker";

type PokerEnvelope =
    | { type: "poker:state"; data: PokerPlayerView }
    | { type: "poker:action_result"; data: { error?: string } };

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

    const initialMessages: PokerEnvelope[] = [
        { type: "poker:state", data: view },
    ];

    const { socket, ...rest } = renderWithWs<PokerEnvelope>(
        (ws) => (
            <PokerRoom
                roomId="room1"
                playerId={playerId}
                isHost={isHost}
                ws={ws}
                title={title}
                onEndGame={onEndGame}
                onReturnToLobby={onReturnToLobby}
            />
        ),
        { initialMessages },
    );

    return { ...rest, socket, onEndGame, onReturnToLobby };
}

describe("PokerRoom", () => {
    it("renders the initial poker state from the first WS message", () => {
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
        const { getByRole, socket } = renderRoom({ view, playerId: "p1" });

        fireEvent.click(getByRole("button", { name: /fold/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "poker:act",
                playerId: "p1",
                playerName: "",
                data: { type: "fold" },
            },
        ]);
    });

    it("renders updated state when a new poker:state message arrives", () => {
        const initialView = makeView({
            handNumber: 1,
            street: "preflop",
        });
        const { getByText, socket } = renderRoom({ view: initialView });
        expect(getByText("HAND 1")).toBeInTheDocument();

        socket.emit({
            type: "poker:state",
            data: makeView({ handNumber: 2, street: "turn" }),
        });

        expect(getByText("HAND 2")).toBeInTheDocument();
        expect(getByText("TURN")).toBeInTheDocument();
    });

    it("displays an action error when poker:action_result has an error", () => {
        const view = makeView({
            players: [makeSeat({ id: "p1", isActing: true })],
            actingPlayerId: "p1",
            legalActions: ["check"],
        });
        const { getByText, socket } = renderRoom({ view, playerId: "p1" });

        socket.emit({
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
