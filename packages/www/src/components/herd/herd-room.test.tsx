import { describe, it, expect, vi } from "vitest";
import { fireEvent } from "@solidjs/testing-library";
import { HerdRoom } from "./herd-room";
import { renderWithWs } from "~/test/render-with-ws";
import {
    makeAnswerGroup,
    makePlayerInfo,
    makeView,
} from "~/game/herd/test-helpers";
import type { HerdPlayerView } from "~/game/herd/views";

type HerdEnvelope =
    | { type: "herd:state"; data: HerdPlayerView }
    | { type: "herd:action"; data: Record<string, unknown> };

function renderRoom(
    options: {
        view?: HerdPlayerView;
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
    const initialMessages: HerdEnvelope[] = [
        { type: "herd:state", data: view },
    ];

    const { socket, ...rest } = renderWithWs<HerdEnvelope>(
        (ws) => (
            <HerdRoom
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

describe("HerdRoom", () => {
    it("renders HERD MENTALITY header and ROOM label", () => {
        const view = makeView({ roundNumber: 3 });
        const { getByText } = renderRoom({ view });

        expect(getByText("HERD MENTALITY")).toBeInTheDocument();
        expect(getByText(/ROOM ROOM1/)).toBeInTheDocument();
        expect(getByText(/ROUND 3/)).toBeInTheDocument();
    });

    it("shows GET READY / WAITING FOR HOST for non-host in waiting phase", () => {
        const view = makeView({ phase: "waiting", isHost: false });
        const { getByText } = renderRoom({ view, isHost: false });

        expect(getByText("GET READY")).toBeInTheDocument();
        expect(getByText(/WAITING FOR HOST/i)).toBeInTheDocument();
    });

    it("sends herd:next_question when host clicks START FIRST QUESTION", () => {
        const view = makeView({
            phase: "waiting",
            isHost: true,
            roundNumber: 0,
        });
        const { getByRole, socket } = renderRoom({ view, isHost: true });

        fireEvent.click(getByRole("button", { name: /start first question/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "herd:next_question",
                playerId: "p1",
                playerName: "",
                data: {},
            },
        ]);
    });

    it("sends herd:submit_answer on SUBMIT click in answering phase", () => {
        const view = makeView({
            phase: "answering",
            isHost: false,
            hasAnswered: false,
            currentQuestion: "What is your favorite animal?",
        });
        const { getByRole, socket, container } = renderRoom({ view });

        const input = container.querySelector(
            "input[type='text']",
        ) as HTMLInputElement;
        fireEvent.input(input, { target: { value: "dog" } });
        fireEvent.click(getByRole("button", { name: /^submit$/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "herd:submit_answer",
                playerId: "p1",
                playerName: "",
                data: { answer: "dog" },
            },
        ]);
    });

    it("sends herd:close_answers for host in answering phase", () => {
        const view = makeView({
            phase: "answering",
            isHost: true,
            currentQuestion: "Any animal?",
            answeredCount: 2,
            totalPlayers: 3,
        });
        const { getByRole, socket } = renderRoom({ view, isHost: true });

        fireEvent.click(getByRole("button", { name: /close answers/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "herd:close_answers",
                playerId: "p1",
                playerName: "",
                data: {},
            },
        ]);
    });

    it("sends herd:confirm_scoring when host clicks CONFIRM SCORING in reveal", () => {
        const view = makeView({
            phase: "reveal",
            isHost: true,
            currentQuestion: "Favorite sport?",
            answerGroups: [
                makeAnswerGroup({
                    id: "g1",
                    canonicalAnswer: "soccer",
                    count: 2,
                    playerNames: ["Alice", "Bob"],
                    playerIds: ["p1", "p2"],
                }),
            ],
        });
        const { getByRole, socket } = renderRoom({ view, isHost: true });

        fireEvent.click(getByRole("button", { name: /confirm scoring/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "herd:confirm_scoring",
                playerId: "p1",
                playerName: "",
                data: {},
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

    it("renders GAME OVER with winner and RETURN TO LOBBY for host", () => {
        const view = makeView({
            phase: "game_over",
            isHost: true,
            roundNumber: 6,
            winnerId: "p2",
            players: [
                makePlayerInfo({ id: "p1", name: "Alice", score: 3 }),
                makePlayerInfo({ id: "p2", name: "Bob", score: 5 }),
            ],
        });
        const { getByText, getByRole, onReturnToLobby } = renderRoom({
            view,
            isHost: true,
        });

        expect(getByText("GAME OVER")).toBeInTheDocument();
        expect(getByText(/BOB WINS/i)).toBeInTheDocument();
        fireEvent.click(getByRole("button", { name: /return to lobby/i }));
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it("updates the UI when a new herd:state arrives", () => {
        const { getByText, socket, queryByText } = renderRoom({
            view: makeView({ phase: "waiting", roundNumber: 0 }),
        });
        expect(queryByText(/ROUND 0/)).toBeNull();

        socket.emit({
            type: "herd:state",
            data: makeView({ phase: "waiting", roundNumber: 4 }),
        });

        expect(getByText(/ROUND 4/)).toBeInTheDocument();
    });
});
