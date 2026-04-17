import { describe, it, expect, vi } from "vitest";
import { fireEvent } from "@solidjs/testing-library";
import { Flip7Room } from "./flip-7-room";
import { renderWithWs } from "~/test/render-with-ws";
import {
    makePlayerInfo,
    makeView,
    numberCard,
} from "~/game/flip-7/test-helpers";
import type { Flip7PlayerView } from "~/game/flip-7/views";

type Flip7Envelope =
    | { type: "flip_7:state"; data: Flip7PlayerView }
    | { type: "flip_7:error"; data: { message: string } };

function renderRoom(
    options: {
        view?: Flip7PlayerView;
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
    const initialMessages: Flip7Envelope[] = [
        { type: "flip_7:state", data: view },
    ];

    const { socket, ...rest } = renderWithWs<Flip7Envelope>(
        (ws) => (
            <Flip7Room
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

describe("Flip7Room", () => {
    it("renders initial state with round number, deck count, and phase", () => {
        const view = makeView({
            roundNumber: 2,
            deckCount: 45,
            discardCount: 8,
            targetScore: 200,
            phase: "turn",
        });
        const { getByText } = renderRoom({ view });

        expect(getByText(/ROUND 2/i)).toBeInTheDocument();
        expect(getByText(/TARGET 200/i)).toBeInTheDocument();
        expect(getByText("45")).toBeInTheDocument();
        expect(getByText("8")).toBeInTheDocument();
        expect(getByText("TURN")).toBeInTheDocument();
    });

    it("shows HIT/STAY buttons when it is my turn and I can hit", () => {
        const view = makeView({
            phase: "turn",
            currentPlayerId: "p1",
            canHit: true,
            canStay: true,
        });
        const { getByRole } = renderRoom({ view });

        expect(getByRole("button", { name: /^hit$/i })).not.toBeDisabled();
        expect(getByRole("button", { name: /^stay$/i })).not.toBeDisabled();
    });

    it("sends flip_7:hit when HIT is clicked", () => {
        const view = makeView({
            phase: "turn",
            currentPlayerId: "p1",
            canHit: true,
        });
        const { getByRole, socket } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /^hit$/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "flip_7:hit",
                playerId: "p1",
                playerName: "",
                data: {},
            },
        ]);
    });

    it("sends flip_7:stay when STAY is clicked", () => {
        const view = makeView({
            phase: "turn",
            currentPlayerId: "p1",
            canHit: false,
            canStay: true,
        });
        const { getByRole, socket } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /^stay$/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "flip_7:stay",
                playerId: "p1",
                playerName: "",
                data: {},
            },
        ]);
    });

    it("shows END GAME button only for host (not during game_over)", () => {
        const guest = renderRoom({ isHost: false });
        expect(
            guest.queryByRole("button", { name: /end game/i }),
        ).toBeNull();

        const host = renderRoom({ isHost: true });
        fireEvent.click(host.getByRole("button", { name: /end game/i }));
        expect(host.onEndGame).toHaveBeenCalledTimes(1);
    });

    it("shows game over panel with winner name and Return To Lobby for host", () => {
        const view = makeView({
            phase: "game_over",
            hostId: "p1",
            winners: ["p2"],
            players: [
                makePlayerInfo({ id: "p1", name: "Alice", totalScore: 150 }),
                makePlayerInfo({ id: "p2", name: "Bob", totalScore: 205 }),
            ],
        });
        const { getAllByText, getByRole, onReturnToLobby } = renderRoom({
            view,
            isHost: true,
        });

        expect(getAllByText(/GAME OVER/i).length).toBeGreaterThan(0);
        fireEvent.click(getByRole("button", { name: /return to lobby/i }));
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it("renders flip_7:error message when received", () => {
        const { getByText, socket } = renderRoom();
        socket.emit({
            type: "flip_7:error",
            data: { message: "You can't hit right now" },
        });
        expect(getByText(/can't hit right now/i)).toBeInTheDocument();
    });

    it("updates the UI reactively on a new flip_7:state message", () => {
        const { getByText, socket } = renderRoom({
            view: makeView({ roundNumber: 1 }),
        });
        expect(getByText(/ROUND 1/i)).toBeInTheDocument();

        socket.emit({
            type: "flip_7:state",
            data: makeView({ roundNumber: 2 }),
        });
        expect(getByText(/ROUND 2/i)).toBeInTheDocument();
    });

    it("renders player boards with cards, names, and totals", () => {
        const view = makeView({
            players: [
                makePlayerInfo({
                    id: "p1",
                    name: "Alice",
                    totalScore: 42,
                    cards: [numberCard(5), numberCard(7)],
                }),
            ],
        });
        const { getAllByText } = renderRoom({ view });
        expect(getAllByText("Alice").length).toBeGreaterThan(0);
        expect(getAllByText("42").length).toBeGreaterThan(0);
        expect(getAllByText("5").length).toBeGreaterThan(0);
        expect(getAllByText("7").length).toBeGreaterThan(0);
    });
});
