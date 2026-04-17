import { describe, it, expect, vi } from "vitest";
import { fireEvent } from "@solidjs/testing-library";
import { FunFactsRoom } from "./fun-facts-room";
import { renderWithWs } from "~/test/render-with-ws";
import {
    makePlacedArrow,
    makePlayerInfo,
    makeView,
} from "~/game/fun-facts/test-helpers";
import type { FunFactsPlayerView } from "~/game/fun-facts/views";

type FunFactsEnvelope =
    | { type: "fun_facts:state"; data: FunFactsPlayerView }
    | { type: "fun_facts:action"; data: Record<string, unknown> };

function renderRoom(
    options: {
        view?: FunFactsPlayerView;
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
    const initialMessages: FunFactsEnvelope[] = [
        { type: "fun_facts:state", data: view },
    ];

    const { socket, ...rest } = renderWithWs<FunFactsEnvelope>(
        (ws) => (
            <FunFactsRoom
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

describe("FunFactsRoom", () => {
    it("renders header, room code, and team score", () => {
        const view = makeView({ teamScore: 7, roundNumber: 2 });
        const { getByText, getAllByText } = renderRoom({ view });

        expect(getByText("FUN FACTS")).toBeInTheDocument();
        expect(getByText(/ROOM ROOM1/)).toBeInTheDocument();
        expect(getByText(/ROUND 2/)).toBeInTheDocument();
        expect(getAllByText("7").length).toBeGreaterThan(0);
    });

    it("shows WAITING FOR HOST in waiting phase for guests", () => {
        const view = makeView({ phase: "waiting", isHost: false });
        const { getByText } = renderRoom({ view, isHost: false });
        expect(getByText("WAITING FOR HOST")).toBeInTheDocument();
    });

    it("sends fun_facts:next_question when host clicks START FIRST QUESTION", () => {
        const view = makeView({
            phase: "waiting",
            isHost: true,
            roundNumber: 0,
        });
        const { getByRole, socket } = renderRoom({ view, isHost: true });

        fireEvent.click(
            getByRole("button", { name: /start first question/i }),
        );

        expect(socket.sentMessages).toEqual([
            {
                type: "fun_facts:next_question",
                playerId: "p1",
                playerName: "",
                data: {},
            },
        ]);
    });

    it("sends fun_facts:submit_answer with parsed number on SUBMIT", () => {
        const view = makeView({
            phase: "answering",
            isHost: false,
            currentQuestion: "How tall is Mt. Everest in meters?",
        });
        const { getByRole, socket, container } = renderRoom({ view });

        const input = container.querySelector(
            "input[type='number']",
        ) as HTMLInputElement;
        fireEvent.input(input, { target: { value: "8848" } });
        fireEvent.click(getByRole("button", { name: /^submit$/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "fun_facts:submit_answer",
                playerId: "p1",
                playerName: "",
                data: { answer: 8848 },
            },
        ]);
    });

    it("sends fun_facts:close_answers for host when >= 2 have answered", () => {
        const view = makeView({
            phase: "answering",
            isHost: true,
            answeredCount: 2,
            totalPlayers: 3,
            currentQuestion: "Q",
        });
        const { getByRole, socket } = renderRoom({ view, isHost: true });

        fireEvent.click(
            getByRole("button", { name: /close answers/i }),
        );

        expect(socket.sentMessages).toEqual([
            {
                type: "fun_facts:close_answers",
                playerId: "p1",
                playerName: "",
                data: {},
            },
        ]);
    });

    it("sends fun_facts:place_arrow when insertion slot is clicked on my turn", () => {
        const view = makeView({
            phase: "placing",
            isMyTurn: true,
            currentPlacerId: "p1",
            myAnswer: 100,
            currentQuestion: "Q",
            placingOrder: [
                makePlayerInfo({ id: "p1", name: "Alice" }),
                makePlayerInfo({ id: "p2", name: "Bob" }),
            ],
            placedArrows: [
                makePlacedArrow({ playerId: "p2", playerName: "Bob" }),
            ],
        });
        const { getAllByRole, socket } = renderRoom({ view });

        const slots = getAllByRole("button", { name: /place here/i });
        fireEvent.click(slots[1]!);

        expect(socket.sentMessages).toEqual([
            {
                type: "fun_facts:place_arrow",
                playerId: "p1",
                playerName: "",
                data: { position: 1 },
            },
        ]);
    });

    it("shows END GAME button only for host", () => {
        const guest = renderRoom({ isHost: false });
        expect(
            guest.queryByRole("button", { name: /end game/i }),
        ).toBeNull();

        const host = renderRoom({
            view: makeView({ isHost: true }),
            isHost: true,
        });
        fireEvent.click(host.getByRole("button", { name: /end game/i }));
        expect(host.onEndGame).toHaveBeenCalledTimes(1);
    });

    it("renders game over panel with RETURN TO LOBBY for host", () => {
        const view = makeView({
            phase: "game_over",
            isHost: true,
            teamScore: 4,
            roundScores: [1, 2, 1],
            maxScore: 6,
            totalRounds: 3,
        });
        const { getByText, getByRole, onReturnToLobby } = renderRoom({
            view,
            isHost: true,
        });

        expect(getByText("GAME OVER")).toBeInTheDocument();
        fireEvent.click(
            getByRole("button", { name: /return to lobby/i }),
        );
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it("reactively updates UI when a new fun_facts:state arrives", () => {
        const { getAllByText, socket } = renderRoom({
            view: makeView({ teamScore: 0 }),
        });
        expect(getAllByText("0").length).toBeGreaterThan(0);

        socket.emit({
            type: "fun_facts:state",
            data: makeView({ teamScore: 9 }),
        });
        expect(getAllByText("9").length).toBeGreaterThan(0);
    });
});
